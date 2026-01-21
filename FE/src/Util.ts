export function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    return String(error)
}


export type AsyncTask<T> = () => Promise<T>;

export class AsyncQueue<T = unknown> {
    private queue: AsyncTask<T>[] = [];
    private running = false;

    public push(task: AsyncTask<T>): void {
        this.queue.push(task);
        void this.run();
    }

    private async run(): Promise<void> {
        if (this.running) return;
        this.running = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (!task) continue;

            try {
                await task();
            } catch (e) {
                console.error(e);
            }
        }

        this.running = false;
    }
}