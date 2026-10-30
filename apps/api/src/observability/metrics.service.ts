import { Injectable } from '@nestjs/common';

type Labels = Record<string, string>;

const key = (name: string, labels: Labels) =>
  `${name}{${Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v.replace(/["\\\n]/g, '_')}"`)
    .join(',')}}`;

/**
 * Minimal in-process counters in Prometheus text format, so no metrics library or agent is needed.
 * Per instance and reset on restart; database-wide numbers are added by the /metrics endpoint.
 */
@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly help = new Map<string, string>();

  inc(name: string, labels: Labels = {}, by = 1, help?: string): void {
    if (help) this.help.set(name, help);
    const k = key(name, labels);
    this.counters.set(k, (this.counters.get(k) ?? 0) + by);
  }

  /** Records a duration as a _sum/_count pair (average = sum / count). */
  observeMs(name: string, labels: Labels, ms: number, help?: string): void {
    this.inc(`${name}_ms_sum`, labels, Math.round(ms), help);
    this.inc(`${name}_ms_count`, labels, 1, help);
  }

  render(gauges: { name: string; help: string; labels?: Labels; value: number }[] = []): string {
    const lines: string[] = [];
    const seen = new Set<string>();
    const header = (name: string, type: string, help?: string) => {
      if (seen.has(name)) return;
      seen.add(name);
      if (help) lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${type}`);
    };
    for (const [k, v] of [...this.counters].sort(([a], [b]) => a.localeCompare(b))) {
      const name = k.slice(0, k.indexOf('{'));
      const base = name.replace(/_ms_(sum|count)$/, '');
      header(name, 'counter', this.help.get(base) ?? this.help.get(name));
      lines.push(`${k.endsWith('{}') ? name : k} ${v}`);
    }
    for (const g of gauges) {
      header(g.name, 'gauge', g.help);
      const k = key(g.name, g.labels ?? {});
      lines.push(`${k.endsWith('{}') ? g.name : k} ${g.value}`);
    }
    return lines.join('\n') + '\n';
  }
}
