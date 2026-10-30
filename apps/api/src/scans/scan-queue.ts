export const SCAN_QUEUE = Symbol('SCAN_QUEUE');
export const SCAN_JOB = 'scan';

/** Hands a scan to the worker. Implemented with pg-boss; tests use an inline implementation. */
export interface ScanQueue {
  enqueue(scanId: string): Promise<void>;
}
