export class ConcurrentTasks<T, R> implements AsyncIterable<R> {
  public constructor(
    private readonly limit: number,
    private readonly inputs: T[],
    private readonly work: (input: T) => Promise<R>
  ) {}

  public async *[Symbol.asyncIterator](): AsyncIterator<R> {
    const running = this.inputs
      .slice(0, this.limit)
      .map(input => this.work(input));

    let index = running.length;

    while (true) {
      const promise = running.shift();
      if (!promise) {
        break;
      }

      if (index < this.inputs.length) {
        const input = this.inputs[index++];
        running.push(this.work(input));
      }

      yield await promise;
    }
  }
}
