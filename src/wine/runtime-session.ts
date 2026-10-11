/** Coordinates launcher shutdown with an external runtime's recovery journal. */
export function createRuntimeSession(operations: {
  prepare(): Promise<string>;
  requestStop(): Promise<unknown>;
  finish(id: string): Promise<unknown>;
}) {
  let closing = false;
  let active = false;
  let ownedSession: string | undefined;
  let prepared: Promise<string> | undefined;
  let completed: Promise<void> = Promise.resolve();
  let closingPromise: Promise<void> | undefined;

  async function* run<T>(program: () => AsyncGenerator<T, void>) {
    if (closing || active) throw new Error("Runtime session is unavailable");
    active = true;
    let complete!: () => void;
    completed = new Promise(resolve => (complete = resolve));
    try {
      prepared = operations.prepare();
      const id = await prepared;
      ownedSession = id;
      if (!closing) yield* program();
    } finally {
      // Shutdown must not interrupt registry restoration with another stop.
      const id = ownedSession;
      ownedSession = undefined;
      try {
        if (id) await operations.finish(id);
      } finally {
        active = false;
        prepared = undefined;
        complete();
      }
    }
  }

  function close(): Promise<void> {
    closing = true;
    if (!closingPromise) {
      closingPromise = (async () => {
        if (prepared) {
          try {
            await prepared;
          } catch {
            // Failed preparation owns no session, but still has a finally.
          }
        }
        if (ownedSession) await operations.requestStop();
        await completed;
      })();
    }
    return closingPromise;
  }

  return { run, close };
}
