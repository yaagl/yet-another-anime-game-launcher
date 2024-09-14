import { describe, expect, it } from "vitest";
import { build, rawString } from "./command-builder";
import { exec as exec_callback } from "child_process";

function exec(cmd: string): Promise<string[]> {
  return new Promise((res, rej) => {
    exec_callback(cmd, (err, stdout, stderr) => {
      if (err) {
        rej(stderr);
      } else {
        res(stdout.split("\n"));
      }
    });
  });
}

function exec_eval(cmd: string): Promise<string[]> {
  return exec(build(["eval", cmd]));
}

function exec_sh(cmd: string): Promise<string[]> {
  return exec(build(["sh", "-c", cmd]));
}

function exec_osa(cmd: string): Promise<string[]> {
  //     const embeded = build(["echo", "Hello ' World"]);
  //     console.log(embeded);
  //     console.log(embeded.replaceAll("\\", "\\\\").replaceAll('"', '\\\\"'));
  return exec(
    build([
      "osascript",
      "-e", //.replace('"','\\"')
      [
        "do",
        "shell",
        "script",
        `"${cmd.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`,
      ].join(" "),
    ]),
  );
}

function buildTest(name: string, exec: (cmd: string) => Promise<string[]>) {
  describe(`command builder, running with ${name}`, () => {
    it("solo command", () => {
      expect(build(["echo"])).toBe("echo");
    });

    it("solo command with space", () => {
      expect(build(["/usr/bin/folder with space/command"])).toBe(
        "/usr/bin/folder\\ with\\ space/command",
      );
    });

    it("solo command with args", () => {
      expect(build(["echo", "Hello"])).toBe("echo Hello");
    });

    it("solo command with args with space", async () => {
      const cmd = build(["echo", "Hello World"]);
      expect(cmd).toBe("echo Hello\\ World");
      expect((await exec(cmd))[0]).toBe("Hello World");
    });

    it("solo command with args with qouted string, left it as-is", async () => {
      const cmd = build(["echo", '"Hello World"']);
      expect(cmd).toBe('echo \\"Hello\\ World\\"');
      expect((await exec(cmd))[0]).toBe('"Hello World"');
    });

    it("solo command with args with qouted string with qoute inside, left it as-is", async () => {
      const cmd = build(["echo", '"Hello " World"']);
      expect(cmd).toBe('echo \\"Hello\\ \\"\\ World\\"'); // wtf
      expect((await exec(cmd))[0]).toBe('"Hello " World"');
    });

    it("some random character", async () => {
      const literal = "Hello '&_#`~[]<>| World";
      const cmd = build(["echo", literal]);
      console.log(cmd);
      expect((await exec(cmd))[0]).toBe(literal);
    });

    it("solo command with args with 'subshell' but actually intepreted as string", async () => {
      const cmd = build(["echo", "Hello $(echo World)"]);
      expect(cmd).toBe("echo Hello\\ \\$\\(echo\\ World\\)");
      expect((await exec(cmd))[0]).toBe("Hello $(echo World)");
    });

    it("solo command with args with real subshell 1", async () => {
      const cmd = build(["echo", ["echo", "Hello World"]]);
      // expect(cmd).toBe("echo Hello\\ \\$\\(echo\\ World\\)"); // fuck no idea what is the mess
      expect((await exec(cmd))[0]).toBe("Hello World");
    });

    it("solo command with args with real subshell 2", async () => {
      const cmd = build(["echo", ["echo", "Hello\\ World"]]);
      expect((await exec(cmd))[0]).toBe("Hello\\ World");
    });

    it("enviroment variable should work", async () => {
      const literal = "Hello '&_#`~[]<>| World";
      const cmd = build(["node", "-e", "console.log(process.env.CCCENV)"], {
        CCCENV: literal,
      });
      console.log(cmd);
      expect((await exec(cmd))[0]).toBe(literal);
    });

    it("pipe should work", async () => {
      const literal = "Hello '&_#`~[]<>| World";
      const cmd = build(["echo", literal, rawString("|"), "base64"]);
      console.log(cmd);
      expect((await exec(cmd))[0]).toBe(
        Buffer.from(literal + "\n").toString("base64"),
      );
      //                                                      ^ waste my time
    });

    // we can keep nesting...

    it("eval a command string", async () => {
      const cmd = build(["eval", build(["echo", "Hello World"])]);
      // expect(cmd).toBe("echo Hello\\ \\$\\(echo\\ World\\)"); // fuck no idea what is the mess
      expect((await exec(cmd))[0]).toBe("Hello World");
    });

    it("eval a command string, but osascript -e", async () => {
      const cmd = build([
        "osascript",
        "-e",
        [
          "do",
          "shell",
          "script",
          `"${build(["echo", "Hello World"]).replace("\\", "\\\\")}"`,
        ].join(" "),
      ]);
      expect((await exec(cmd))[0]).toBe("Hello World");
    });
  });
}

buildTest("normal shell", exec);
buildTest("`eval`", exec_eval);
buildTest("`osascript -e`", exec_osa);
buildTest("`sh -c`", exec_sh);
