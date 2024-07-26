import { gte, coerce } from "semver";
import { exec, stats, rawString } from "../utils";

export const CROSSOVER_LOADER =
  "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/CrossOver-Hosted Application/wineloader64";

export const CROSSOVER_LOADER_WINE8 =
  "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/CrossOver-Hosted Application/wineloader";

export const CROSSOVER_DATA =
  "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/share/crossover/bottle_data";

export const getCrossoverBinary = async () => {
  try {
    await stats(CROSSOVER_LOADER);
    return CROSSOVER_LOADER;
  } catch {
    try {
      await stats(CROSSOVER_LOADER_WINE8);
      return CROSSOVER_LOADER_WINE8;
    } catch {
      throw new Error("Can't find crossover");
    }
  }
};

export const CROSSOVER_RESOURCE =
  "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver";

export async function checkCrossover() {
  try {
    try {
      await stats(CROSSOVER_LOADER);
    } catch {
      await stats(CROSSOVER_LOADER_WINE8);
    }
    const { stdOut } = await exec([
      "cat",
      "/Applications/CrossOver.app/Contents/Info.plist",
      rawString("|"),
      "grep",
      "-A1",
      "CFBundleVersion",
      rawString("|"),
      "grep",
      "string",
      rawString("|"),
      "sed",
      "s/<[^>]*>//g",
    ]);
    return gte(coerce(stdOut.split("\n")[0].trim()) ?? "0.0.0", "22.1.0", {
      loose: true,
    });
  } catch {
    return false;
  }
}
