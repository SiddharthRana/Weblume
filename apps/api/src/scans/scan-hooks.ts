import { Injectable, Logger } from '@nestjs/common';

export type ScanFinishedHook = (scanId: string) => Promise<void>;

/**
 * Lets other modules react when a scan finishes (e.g. monitoring sends change digests) without
 * the scan worker depending on them. A failing hook is logged and never fails the scan.
 */
@Injectable()
export class ScanHooks {
  private readonly logger = new Logger(ScanHooks.name);
  private readonly finished: ScanFinishedHook[] = [];

  onFinished(hook: ScanFinishedHook): void {
    this.finished.push(hook);
  }

  async runFinished(scanId: string): Promise<void> {
    for (const hook of this.finished) {
      try {
        await hook(scanId);
      } catch (err) {
        this.logger.error(
          `Scan-finished hook failed for ${scanId}: ${err instanceof Error ? err.name : 'unknown'}`,
        );
      }
    }
  }
}
