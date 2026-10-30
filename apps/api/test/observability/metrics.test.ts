import { describe, expect, it } from 'vitest';
import { MetricsService } from '../../src/observability/metrics.service';

describe('MetricsService', () => {
  it('renders counters, durations and gauges in Prometheus text format', () => {
    const m = new MetricsService();
    m.inc('weblume_psi_requests_total', { strategy: 'mobile', result: 'ok' }, 1, 'PSI calls');
    m.inc('weblume_psi_requests_total', { strategy: 'mobile', result: 'ok' });
    m.inc('weblume_psi_requests_total', { result: 'timeout', strategy: 'desktop' });
    m.observeMs('weblume_psi_latency', { strategy: 'mobile' }, 1200.4, 'PSI time');
    m.observeMs('weblume_psi_latency', { strategy: 'mobile' }, 800);
    const out = m.render([{ name: 'weblume_scan_queue_depth', help: 'Queued', value: 3 }]);
    expect(out).toContain('# HELP weblume_psi_requests_total PSI calls');
    expect(out).toContain('# TYPE weblume_psi_requests_total counter');
    expect(out).toContain('weblume_psi_requests_total{result="ok",strategy="mobile"} 2');
    expect(out).toContain('weblume_psi_requests_total{result="timeout",strategy="desktop"} 1');
    expect(out).toContain('weblume_psi_latency_ms_sum{strategy="mobile"} 2000');
    expect(out).toContain('weblume_psi_latency_ms_count{strategy="mobile"} 2');
    expect(out).toContain('# TYPE weblume_scan_queue_depth gauge');
    expect(out).toContain('weblume_scan_queue_depth 3');
  });

  it('escapes label values', () => {
    const m = new MetricsService();
    m.inc('x_total', { reason: 'a"b\nc' });
    expect(m.render()).toContain('x_total{reason="a_b_c"} 1');
  });
});
