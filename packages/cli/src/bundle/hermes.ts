import type { HermesOptions } from "@rnx-kit/config";
import { error, info } from "@rnx-kit/console";
import { findPackageDependencyDir } from "@rnx-kit/tools-node/package";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function hermesBinaryInDir(hermesc: string): string | null {
  switch (os.platform()) {
    case "darwin":
      return path.join(hermesc, "osx-bin", "hermesc");
    case "linux":
      return path.join(hermesc, "linux64-bin", "hermesc");
    case "win32":
      return path.join(hermesc, "win64-bin", "hermesc.exe");
    default:
      return null;
  }
}

function updateSourceMappingURL(
  bundle: string,
  oldUrl: string,
  newUrl: string
): void {
  const js = fs.readFileSync(bundle, { encoding: "utf-8" });
  const idx = js.lastIndexOf(oldUrl);
  if (idx > 0) {
    fs.writeFileSync(bundle, js.substring(0, idx) + newUrl + "\n");
  }
}

const findHermesBinary = (() => {
  let bin: string;
  return () => {
    if (!bin) {
      const locations = [
        () => {
          const rnPath = findPackageDependencyDir("react-native");
          if (!rnPath) {
            throw new Error("Cannot find module 'react-native'");
          }
          return path.join(rnPath, "sdks", "hermesc");
        },
        () => findPackageDependencyDir("hermes-engine"),
      ];

      for (const getLocation of locations) {
        const location = getLocation();
        if (location) {
          const hermesc = hermesBinaryInDir(location);
          if (hermesc && fs.existsSync(hermesc)) {
            bin = hermesc;
            break;
          }
        }
      }
    }
    return bin;
  };
})();

export function emitBinary(
  input: string,
  sourcemap: string | undefined,
  options: HermesOptions
): void {
  const cmd = options.command || findHermesBinary();
  if (!cmd) {
    error("No Hermes compiler was found");
    return;
  }

  const jsInput = input + ".js";
  info(`Renaming ${input} -> ${jsInput}`);
  fs.renameSync(input, jsInput);

  if (sourcemap && fs.existsSync(sourcemap)) {
    const jsMapInput = jsInput + ".map";
    info(`Renaming ${sourcemap} -> ${jsMapInput}`);
    fs.renameSync(sourcemap, jsMapInput);

    const outputDir = path.dirname(input);
    updateSourceMappingURL(
      jsInput,
      path.relative(outputDir, sourcemap),
      path.relative(outputDir, jsMapInput)
    );
  }

  info("Emitting bytecode to:", input);
  const args = [
    ...(options.flags ?? ["-O", "-output-source-map", "-w"]),
    "-emit-binary",
    // If Hermes can't detect the width of the terminal, it will set the limit
    // to "unlimited". Since we might be passing a minified bundle to Hermes,
    // limit output width to avoid issues when it outputs diagnostics. See:
    //   - https://github.com/microsoft/rnx-kit/issues/2416
    //   - https://github.com/microsoft/rnx-kit/issues/2419
    //   - https://github.com/microsoft/rnx-kit/issues/2424
    "-max-diagnostic-width=80",
    "-out",
    input,
    jsInput,
  ];
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw result.error;
  }
}
