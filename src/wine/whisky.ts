import { join } from "path-browserify";
import { env, stats } from "../utils";

export const WHISKY_LOADER =
  "/Library/Application Support/com.isaacmarovitz.Whisky/Libraries/Wine/bin/wine64";

export const getWhiskyBinary = async () => {
  try {
    const HOME = await env("HOME");
    await stats(join(HOME, WHISKY_LOADER));
    return join(HOME, WHISKY_LOADER);
  } catch {
    throw new Error("Can't find whisky");
  }
};

export async function checkWhisky() {
  try {
    const HOME = await env("HOME");
    await stats(join(HOME, WHISKY_LOADER));
    return true;
  } catch {
    return false;
  }
}
