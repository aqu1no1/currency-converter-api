import { setTimeout } from 'node:timers/promises';

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  { timeout = 5_000, interval = 50 }: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeout;

  while (!(await condition())) {
    if (Date.now() > deadline) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }

    await setTimeout(interval);
  }
}
