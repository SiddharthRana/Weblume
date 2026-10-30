import type { CheckId } from '@weblume/shared';

export interface RawFinding {
  checkId: CheckId;
  details: Record<string, unknown>;
}

export interface CheckOutcome {
  findings: RawFinding[];
  passed: CheckId[];
}

export function emptyOutcome(): CheckOutcome {
  return { findings: [], passed: [] };
}

/** Records a check as failed (with evidence) or passed. */
export function record(
  out: CheckOutcome,
  checkId: CheckId,
  failed: boolean,
  details: Record<string, unknown> = {},
): void {
  if (failed) out.findings.push({ checkId, details });
  else out.passed.push(checkId);
}
