import { Locator, Page } from 'playwright';
import { access } from 'fs/promises';

export type WaitTarget = string | Locator;

export async function waitForAnyVisible(
  page: Page,
  targets: WaitTarget[],
  timeout = 10000
): Promise<WaitTarget> {
  const start = Date.now();

  return new Promise<WaitTarget>((resolve, reject) => {
    let resolved = false;

    for (const target of targets) {
      const locator = typeof target === 'string' ? page.locator(target) : target;

      locator
        .waitFor({ state: 'visible', timeout })
        .then(() => {
          if (!resolved) {
            resolved = true;
            resolve(target);
          }
        })
        .catch(() => {
          // Ignore individual timeouts; we reject below if none succeed
        });
    }

    setTimeout(() => {
      if (!resolved) {
        reject(
          new Error(
            `None of the selectors or locators became visible within ${timeout}ms.`
          )
        );
      }
    }, timeout - (Date.now() - start));
  });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);  // Checks if the file is accessible (exists)
    return true;
  } catch {
    return false;
  }
}
export function parseDateRangeFromEnv(env: Record<string, string | undefined>): { start: Date; end: Date } {
  const start = parseDate(env, 'REPORT_START_DATE');
  const end = parseDate(env, 'REPORT_END_DATE');

  if (start >= end) {
    throw new Error(
      `REPORT_START_DATE (${start.toISOString().slice(0, 10)}) must be before REPORT_END_DATE (${end.toISOString().slice(0, 10)})`
    );
  }

  return { start, end };
}

function parseDate(env: Record<string, string | undefined>, varName: string): Date {
  const raw = env[varName];
  if (!raw) {
    throw new Error(`Environment variable ${varName} is not set`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`Environment variable ${varName} must be in YYYY-MM-DD format, got "${raw}"`);
  }

  const date = new Date(raw);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date in environment variable ${varName}: "${raw}"`);
  }

  return date;
}
