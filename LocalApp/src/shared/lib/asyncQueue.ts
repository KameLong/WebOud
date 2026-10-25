export type AsyncTask<T> = () => Promise<T>;

export class AsyncQueue<T = unknown> {
    private queue: AsyncTask<T>[] = [];
    private running = false;

    /**
     * タスクをキューの末尾に追加し、未実行なら処理を開始します。
     *
     * @param task 実行したい非同期処理。キューに積まれた順に1つずつ直列で実行される
     */
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
