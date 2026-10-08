import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';
import { Api } from '../../../api/api';

@Component({
  selector: 'app-advanced-energy-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advanced-energy-card.component.html',
  styleUrl: './advanced-energy-card.component.css'
})
export class AdvancedEnergyCardComponent implements OnInit, OnChanges {
  @Output() openAnalysis = new EventEmitter<void>();

  @Input() history: any[] | null = null;

  values: number[] = [];
  private pollingTimer: any;

  stats = {
    current: 0,
    peak: 0,
    average: 0,
    total: 0
  };

  constructor(public translate: TranslationService, private api: Api) {}


  ngOnInit() {
    if (this.history && this.history.length > 0) {
      this.processHistory(this.history);
    } else {
      this.loadStats();
    }
    this.startPolling();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['history'] && this.history && this.history.length > 0) {
      this.processHistory(this.history);
    }
  }

  ngOnDestroy() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private loadStats() {
    this.api.getConsumptionHistory().subscribe({
      next: (entries: any[]) => {
        this.processHistory(entries);
      },
      error: (_) => {
        // Fallback sem dados
        this.values = [0];
        this.computeStatsFromSeries([], 0);
      }
    });
  }

  private processHistory(entries: any[]) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // Ordena por data
    const sorted = (entries || [])
      .filter((e) => new Date(e.register_date) >= cutoff)
      .sort((a, b) => new Date(a.register_date).getTime() - new Date(b.register_date).getTime());

    // Calcula energia por hora (kWh) usando diferença temporal entre leituras por dispositivo
    const prevByDevice = new Map<number, { t: number; w: number }>();
    const buckets = new Map<number, number>(); // hourTs -> Wh
    const powerByMinute = new Map<number, number>(); // minuteTs -> W
    for (const e of sorted) {
      const d = new Date(e.register_date);
      const devId = (e.device && e.device.device_id) ? e.device.device_id : (e.device_id ?? 0);
      const prev = prevByDevice.get(devId);
      const w = Number(e.consumption ?? 0);

      const minuteTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), 0, 0).getTime();
      powerByMinute.set(minuteTs, (powerByMinute.get(minuteTs) || 0) + w);

      if (prev) {
        const dtSec = Math.max(0, (d.getTime() - prev.t) / 1000);
        const energyWh = (prev.w || 0) * (dtSec / 3600); // Wh
        const hourTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
        buckets.set(hourTs, (buckets.get(hourTs) || 0) + energyWh);
      }
      prevByDevice.set(devId, { t: d.getTime(), w });
    }

    const valuesKWh = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, wh]) => Number((wh / 1000).toFixed(3)));

    this.values = valuesKWh.length > 0 ? valuesKWh : [0];

    // Estatísticas de potência (W) a partir de buckets por minuto
    const powerSeries = Array.from(powerByMinute.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, w]) => Number(w.toFixed(2)));

    // Energia total no período (kWh)
    const totalWh = Array.from(buckets.values()).reduce((s, v) => s + v, 0);
    const totalKWh = totalWh / 1000;

    this.computeStatsFromSeries(powerSeries, totalKWh);
  }

  private computeStatsFromSeries(powerSeriesW: number[], totalKWh: number) {
    const pw = powerSeriesW;
    const sumPw = pw.reduce((s, v) => s + v, 0);
    const currentW = pw.length ? pw[pw.length - 1] : 0;
    const peakW = pw.length ? Math.max(...pw) : 0;
    const avgW = pw.length ? (sumPw / pw.length) : 0;

    this.stats.current = Number(currentW.toFixed(2));
    this.stats.peak = Number(peakW.toFixed(2));
    this.stats.average = Number(avgW.toFixed(2));

    this.stats.total = Number(totalKWh.toFixed(2));
  }

  private startPolling() {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => {
      // Sempre busca o histórico persistido no backend.
      // Isto garante consistência ao recarregar página / abrir noutro dispositivo.
      this.api.getConsumptionHistory().subscribe({
        next: (entries: any[]) => this.processHistory(entries),
        error: () => {}
      });
    }, 2000);
  }
}
