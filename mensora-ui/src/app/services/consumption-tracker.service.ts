import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConsumptionTrackerService {
  private devicePrev = new Map<number, number>();
  private samples: Array<{ ts: number; deltaWh: number }> = [];

  readonly updated$ = new Subject<void>();

  // Chamado pelo polling em background com dispositivos da overview
  processOverview(devices: any[]) {
    const now = Date.now();
    let sumDeltaWh = 0;
    for (const d of devices || []) {
      const id = Number(d.device_id || 0);
      const totalWh = Number(d.total_consumption || 0);
      const prev = this.devicePrev.get(id);
      if (prev !== undefined) {
        const rawDelta = totalWh - prev;
        if (rawDelta > 0) sumDeltaWh += rawDelta; // ignore resets or negatives
      }
      this.devicePrev.set(id, totalWh);
    }
    if (sumDeltaWh >= 0) {
      this.samples.push({ ts: now, deltaWh: sumDeltaWh });
      // Guarda ultimas 40000 amostras (cerca de 3 semanas a 2s)
      if (this.samples.length > 40000) this.samples.shift();
      this.updated$.next();
    }
  }

  // Constroi buckets por intervalo e devolve labels e valores (kWh)
  getSeries(period: '24h' | '7d' | '30d' | '365d', now = Date.now()): { labels: string[]; values: number[] } {
    const windowMs =
      period === '24h' ? 24 * 60 * 60 * 1000 :
      period === '7d' ? 7 * 24 * 60 * 60 * 1000 :
      period === '30d' ? 30 * 24 * 60 * 60 * 1000 :
      365 * 24 * 60 * 60 * 1000;

    const start = now - windowMs;
    const relevant = this.samples.filter(s => s.ts >= start && s.ts <= now);

    if (period === '24h') {
      const elapsedHours = Math.max(0.001, (now - (relevant[0]?.ts ?? now)) / (60 * 60 * 1000));
      const bucketMin = elapsedHours <= 1 ? 5 : elapsedHours <= 6 ? 30 : 60;
      const buckets = new Map<number, number>();
      // Arredonda para baixo para limite do bucket e acumula
      for (const s of relevant) {
        const dd = new Date(s.ts);
        const flooredMin = Math.floor(dd.getMinutes() / bucketMin) * bucketMin;
        const bucketTs = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate(), dd.getHours(), flooredMin, 0, 0).getTime();
        buckets.set(bucketTs, (buckets.get(bucketTs) || 0) + s.deltaWh);
      }
      // Constroi grelha completa
      const grid: number[] = [];
      const gridStart = relevant.length ? Array.from(buckets.keys()).sort((a,b)=>a-b)[0] : new Date(now).setMinutes(Math.floor(new Date(now).getMinutes()/bucketMin)*bucketMin,0,0);
      for (let t = gridStart; t <= now; t += bucketMin * 60 * 1000) grid.push(t);
      const labels = grid.map(ts => this.formatBucket(ts));
      const values = grid.map(ts => Number(((buckets.get(ts) || 0) / 1000).toFixed(3)));
      return { labels, values };
    }

    if (period === '365d') {
      const byMonth = new Map<string, number>();
      for (const s of relevant) {
        const d = new Date(s.ts);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth.set(key, (byMonth.get(key) || 0) + s.deltaWh);
      }
      const months: string[] = [];
      const dNow = new Date(now);
      for (let i = 11; i >= 0; i--) {
        const m = new Date(dNow.getFullYear(), dNow.getMonth() - i, 1);
        const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
        months.push(key);
      }
      const labels = months.map(key => {
        const [y, m] = key.split('-');
        return `${String(m).padStart(2, '0')}/${y}`;
      });
      const values = months.map(key => Number(((byMonth.get(key) || 0) / 1000).toFixed(3)));
      return { labels, values };
    }

    // 7d/30d por dia
    const byDay = new Map<string, number>();
    for (const s of relevant) {
      const d = new Date(s.ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDay.set(key, (byDay.get(key) || 0) + s.deltaWh);
    }
    const days: string[] = [];
    const totalDays = period === '7d' ? 7 : 30;
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push(key);
    }
    const labels = days.map(key => {
      const [y, m, day] = key.split('-');
      return `${day}/${m}`;
    });
    const values = days.map(key => Number(((byDay.get(key) || 0) / 1000).toFixed(3)));
    return { labels, values };
  }

  private formatBucket(ts: number): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
