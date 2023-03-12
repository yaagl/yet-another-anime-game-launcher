import { stats } from "./utils";

export const CROSSOVER_LOADER = "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/CrossOver-Hosted Application/wineloader64";

export async function checkCrossover() {
    try {
        await stats(CROSSOVER_LOADER);
        return true;
    } catch {
        return false;
    }
}