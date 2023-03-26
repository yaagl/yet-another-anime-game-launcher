import { gte, coerce } from "semver";
import { rawString } from "./command-builder";
import { exec, log, stats } from "./utils";

export const CROSSOVER_LOADER =
  "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/CrossOver-Hosted Application/wineloader64";

export const CROSSOVER_DATA =
  "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/share/crossover/bottle_data";

export async function checkCrossover() {
  try {
    await stats(CROSSOVER_LOADER);
    const { stdOut } = await exec([
      "cat",
      "/Applications/CrossOver.app/Contents/Info.plist",
      rawString("|"),
      "grep",
      "-A1",
      "CFBundleShortVersionString",
      rawString("|"),
      "grep",
      "string",
      rawString("|"),
      "sed",
      "s/<[^>]*>//g",
    ]);
    return gte(coerce(stdOut.split("\n")[0].trim())!, "22.1.0", { loose: true });
  } catch {
    return false;
  }
}
