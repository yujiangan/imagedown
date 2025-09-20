export async function concurrentTask<T>(
  tasks: T[],  
  concurrency: number,
  callback: (task: T, total: number, index: number) => Promise<void>
): Promise<void> {
  const taskQueue = [...tasks.keys()];
  const total = taskQueue.length;
  if (total === 0) return;

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    const worker = async () => {
      while (taskQueue.length > 0) {
        const taskIndex = taskQueue.shift()!;
        const displayIndex = taskIndex + 1;
        const task = tasks[taskIndex];
        
        try {
          await callback(task, total, displayIndex);
        } catch (err) {
          console.error(`任务[${displayIndex}]处理失败:`, (err as Error).message);
        }
      }
    };
    workers.push(worker());
  }

  await Promise.all(workers);
}