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

export async function startBuild(
  remote: Remote,
  distribution: DistributionPlugin,
  repoInfo: RepositoryInfo,
  inputs: BuildParams
): Promise<number> {
  const reporter = new TaskReporter({
    productName: "@rnx-kit/build",
    description: `Building`,
    showStarted: false,
    showPending: true,
    showCompleted: true,
    showSummary: false,
    showTaskDetails: false,
  });
  const createBuildBranchTask = reporter.addTask(
    "Creating build branch",
    false
  );
  const deleteBuildBranchTask = reporter.addTask("Cleaning up", true);

  const spinner = ora();

  const upstream = "origin";
  const buildBranch = await pushCurrentChanges(upstream);
  if (!buildBranch) {
    createBuildBranchTask.complete({
      status: "fail",
      message: "Failed to create build branch",
    });
    return 1;
  }

  createBuildBranchTask.complete({
    status: "complete",
    message: `Created build branch ${buildBranch}`,
  });

  const context = { ...repoInfo, ref: buildBranch };
  const cleanUp = once(async () => {
    deleteBuildBranchTask.start();
    await Promise.allSettled([
      remote.cancelBuild(context),
      deleteBranch(buildBranch, upstream),
    ]);
    deleteBuildBranchTask.complete({
      status: "complete",
      message: `Deleted ${buildBranch}`,
    });
  });

  const onSignal = () => {
    reporter.complete("Cancelled");
    cleanUp().then(() => process.exit(1));
  };

  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  if (!createBuildBranchTask) {
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
