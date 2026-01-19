import { WINE_INF_CERT_STR } from "../clients/secret";
import { readAllLines, writeFile } from "@utils";

export async function addCertsToWine(wineBinaryDir: string) {
  const searchLoc = "; URL Associations";
  const wineInfPath = `${wineBinaryDir}/share/wine/wine.inf`;

  let wineInfContents = await readAllLines(wineInfPath);
  let found = -1;
  for (let i = 0; i < wineInfContents.length; i++) {
    if (wineInfContents[i].trim() === searchLoc) {
      found = i;
      break;
    }
  }

  if (found < 0) {
    throw new Error("Could not find URL Associations section in wine.inf");
  }

  let nextBlockLoc = found;
  for (let i = found + 1; i < wineInfContents.length; i++) {
    if (wineInfContents[i].trim().length === 0) {
      nextBlockLoc = i;
      break;
    }
  }

  if (nextBlockLoc === found) {
    throw new Error(
      "Could not find the end of URL Associations section in wine.inf"
    );
  }

  wineInfContents = [
    ...wineInfContents.slice(0, nextBlockLoc),
    "",
    ...WINE_INF_CERT_STR.trim().split("\n"),
    ...wineInfContents.slice(nextBlockLoc),
  ];

  await writeFile(wineInfPath, wineInfContents.join("\n"));
}
