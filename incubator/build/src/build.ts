import { TaskReporter } from "@ms-cloudpack/task-reporter";
import ora from "ora";
import { once } from "./async.js";
import { deleteBranch, pushCurrentChanges } from "./git.js";
import type {
  BuildParams,
  DistributionPlugin,
  Remote,
  RepositoryInfo,
} from "./types.js";

function createReporter() {
  return new TaskReporter({
    productName: "@rnx-kit/build",
    description: `Building`,
    showStarted: false,
    showPending: true,
    showCompleted: true,
    showSummary: false,
    showTaskDetails: false,
  });
}

export async function startBuild(
  remote: Remote,
  distribution: DistributionPlugin,
  repoInfo: RepositoryInfo,
  inputs: BuildParams
): Promise<number> {
  const upstream = "origin";
  const reporter = createReporter();

  let buildBranch: string;
  await reporter.runTask("Creating build branch", async () => {
    buildBranch = await pushCurrentChanges(upstream) || "";
    return {
      status: buildBranch ? "complete" : "fail",
      message: buildBranch || "Failed to create build branch",
    };
  });

  // @ts-expect-error asdf
  const context = { ...repoInfo, ref: buildBranch };
  const cleanUp = once(() =>
    reporter.runTask("Cleaning up", async () => {
      await Promise.allSettled([
        remote.cancelBuild(context),
        deleteBranch(buildBranch, upstream),
      ]);
      return {
        status: "complete",
        message: `Deleted ${buildBranch}`,
      };
    })
  );

  const onSignal = () => {
    reporter.complete("Cancelled");
    cleanUp().then(() => process.exit(1));
  };

  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  if (!reporter) {
    const spinner = ora();
    try {
      const artifact = await remote.build(context, inputs, spinner);
      if (!artifact) {
        await cleanUp();
        return 1;
      }

      await distribution.deploy({ ...context, ...inputs }, artifact, spinner);
    } catch (e) {
      spinner.fail();
      await cleanUp();
      throw e;
    }

    await cleanUp();
    return 0;
  }

  return 1;
}
