import { afterEach, expect, it, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import type { Aria2 } from "@aria2";
import { loadD3DMetalLicense } from "./d3dmetal";

let root = "";
vi.mock("@utils", () => ({
  resolve: (path: string) => join(root, path),
  mkdirp: async (path: string) => {
    mkdirSync(path, { recursive: true });
  },
  fileOrDirExists: async (path: string) => existsSync(path),
  removeFile: async (path: string) => {
    unlinkSync(path);
  },
  generateRandomString: () => randomUUID(),
  exec: async (args: string[]) => ({
    stdOut: execFileSync(args[0], args.slice(1), { encoding: "utf8" }),
  }),
}));

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = "";
});

it("refuses to display a corrupt official license and preserves the old cache", async () => {
  root = mkdtempSync(join(tmpdir(), "yaagl-license-rejection-"));
  const cache = join(root, "d3dmetal-license");
  mkdirSync(cache);
  const license = join(cache, "License.rtf");
  writeFileSync(license, "previous corrupted license");
  let requested = false;
  const aria2 = {
    async *doStreamingDownload({
      uri,
      absDst,
    }: {
      uri: string;
      absDst: string;
    }) {
      expect(uri).toBe(
        "https://github.com/dbc-hbin/d3dmetal-redistributable/releases/download/gptk-4.0b2/License.rtf"
      );
      requested = true;
      writeFileSync(absDst, "tampered download");
      yield { completedLength: 17n, totalLength: 17n, downloadSpeed: 0n };
    },
  } as unknown as Aria2;
  await expect(loadD3DMetalLicense(aria2)).rejects.toThrow("SHA-256 mismatch");
  expect(requested).toBe(true);
  expect(readFileSync(license, "utf8")).toBe("previous corrupted license");
});
