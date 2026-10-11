import { describe, expect, it, vi } from "vitest";
import { createRuntimeSession } from "./runtime-session";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => (resolve = done));
  return { promise, resolve };
}

async function consume(program: AsyncGenerator<unknown, void>) {
  for await (const step of program) void step;
}

describe("external runtime recovery session", () => {
  it("does not finish a journal when preparation fails and permits a retry", async () => {
    const prepare = vi.fn(async () => "retry-journal");
    prepare.mockRejectedValueOnce(new Error("another owner is active"));
    const finish = vi.fn(async () => undefined);
    const session = createRuntimeSession({
      prepare,
      finish,
      requestStop: async () => undefined,
    });
    const program = async function* () {
      yield "running";
    };
    await expect(consume(session.run(program))).rejects.toThrow(
      "another owner"
    );
    expect(finish).not.toHaveBeenCalled();
    await consume(session.run(program));
    expect(finish).toHaveBeenCalledWith("retry-journal");
  });

  it("propagates restoration failure without hanging launcher close", async () => {
    const session = createRuntimeSession({
      prepare: async () => "journal",
      requestStop: async () => undefined,
      finish: async () => {
        throw new Error("restore failed");
      },
    });
    await expect(
      consume(
        session.run(async function* () {
          yield "running";
        })
      )
    ).rejects.toThrow("restore failed");
    await session.close();
  });
  it("restores after a launch failure, including failure before the first yield", async () => {
    const finish = vi.fn(async () => undefined);
    const session = createRuntimeSession({
      prepare: async () => "journal",
      requestStop: async () => undefined,
      finish,
    });
    await expect(
      consume(
        session.run(async function* () {
          throw new Error("patch failed");
        })
      )
    ).rejects.toThrow("patch failed");
    expect(finish).toHaveBeenCalledWith("journal");
  });

  it("does not start the game when the launcher closes during preparation", async () => {
    const prepared = deferred<string>();
    const game = vi.fn(async function* () {
      yield "running";
    });
    const finish = vi.fn(async () => undefined);
    const session = createRuntimeSession({
      prepare: () => prepared.promise,
      requestStop: async () => undefined,
      finish,
    });
    const launch = consume(session.run(game));
    const closed = session.close();
    prepared.resolve("journal");
    await Promise.all([launch, closed]);
    expect(game).not.toHaveBeenCalled();
    expect(finish).toHaveBeenCalledOnce();
  });

  it("stops an active game and waits for recovery before completing shutdown", async () => {
    const started = deferred<void>();
    const gameExited = deferred<void>();
    const restored = deferred<void>();
    const restoring = deferred<void>();
    const session = createRuntimeSession({
      prepare: async () => "journal",
      requestStop: async () => gameExited.resolve(),
      finish: async () => {
        restoring.resolve();
        await restored.promise;
      },
    });
    const launch = consume(
      session.run(async function* () {
        started.resolve();
        await gameExited.promise;
      })
    );
    await started.promise;
    let closed = false;
    const close = session.close().then(() => {
      closed = true;
    });
    await restoring.promise;
    expect(closed).toBe(false);
    restored.resolve();
    await Promise.all([launch, close]);
    expect(closed).toBe(true);
  });

  it("coalesces repeated close events so they cannot interrupt recovery", async () => {
    const started = deferred<void>();
    const exited = deferred<void>();
    const requestStop = vi.fn(async () => exited.resolve());
    const session = createRuntimeSession({
      prepare: async () => "journal",
      requestStop,
      finish: async () => undefined,
    });
    const launch = consume(
      session.run(async function* () {
        started.resolve();
        await exited.promise;
      })
    );
    await started.promise;
    await Promise.all([session.close(), session.close(), launch]);
    expect(requestStop).toHaveBeenCalledOnce();
  });

  it("does not interrupt restoration if the window closes while finishing", async () => {
    const restoring = deferred<void>();
    const restored = deferred<void>();
    const requestStop = vi.fn(async () => undefined);
    const session = createRuntimeSession({
      prepare: async () => "journal",
      requestStop,
      finish: async () => {
        restoring.resolve();
        await restored.promise;
      },
    });
    const launch = consume(
      session.run(async function* () {
        yield "running";
      })
    );
    await restoring.promise;
    const close = session.close();
    expect(requestStop).not.toHaveBeenCalled();
    restored.resolve();
    await Promise.all([launch, close]);
  });

  it("rejects concurrent launches and never finishes an unowned journal", async () => {
    const prepared = deferred<string>();
    const finish = vi.fn(async () => undefined);
    const session = createRuntimeSession({
      prepare: () => prepared.promise,
      requestStop: async () => undefined,
      finish,
    });
    const launch = consume(
      session.run(async function* () {
        yield "first";
      })
    );
    await expect(
      consume(
        session.run(async function* () {
          yield "second";
        })
      )
    ).rejects.toThrow("unavailable");
    prepared.resolve("first-journal");
    await launch;
    expect(finish).toHaveBeenCalledOnce();
    expect(finish).toHaveBeenCalledWith("first-journal");
  });
});
