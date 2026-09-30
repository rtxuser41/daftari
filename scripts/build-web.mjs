import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expoCli = resolve(projectRoot, "node_modules/expo/bin/cli");
const hardener = resolve(projectRoot, "scripts/harden-web-export.mjs");
const env = { ...process.env, EXPO_NO_METRO_WORKSPACE_ROOT: "1" };
const missingGeneratedWebCss =
  /Failed to get the SHA-1 for:.*react-native-css-interop[\\/]\.cache[\\/]web\.css/is;

function exportWeb() {
  const result = spawnSync(
    process.execPath,
    [expoCli, "export", "--platform", "web"],
    {
      cwd: projectRoot,
      env,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  return {
    status: result.status ?? 1,
    output: `${stdout}\n${stderr}`,
  };
}

let result = exportWeb();
if (result.status !== 0 && missingGeneratedWebCss.test(result.output)) {
  console.warn(
    "Metro missed NativeWind's first generated web CSS cache file; retrying the static export once.",
  );
  result = exportWeb();
}

if (result.status !== 0) {
  process.exitCode = result.status;
} else {
  const hardened = spawnSync(process.execPath, [hardener], {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });
  if (hardened.error) {
    console.error(hardened.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = hardened.status ?? 1;
  }
}
