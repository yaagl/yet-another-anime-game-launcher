export class ConcurrentTasks<T, R> {
  private readonly limit: number;
  private readonly inputs: T[];
  private readonly work: (input: T) => Promise<R>;

  public constructor(
    limit: number,
    inputs: T[],
    work: (input: T) => Promise<R>
  ) {
    this.limit = limit;
    this.inputs = inputs;
    this.work = work;
  }

  [Symbol.asyncIterator]() {
    let index = 0;

    const running: Promise<R>[] = [];
    for (let i = 0; i < this.limit && i < this.inputs.length; i++) {
      const input = this.inputs[index++];
      running.push(this.work(input));
    }

    return {
      next: async (): Promise<IteratorResult<R>> => {
        const promise = running.shift();
        if (!promise) {
          return { done: true, value: undefined };
        }

        if (index < this.inputs.length) {
          const input = this.inputs[index++];
          running.push(this.work(input));
        }

        return { done: false, value: await promise };
      },
    };
  }
}
