import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';
import { Chart, registerables } from 'chart.js';
import { Api } from '../../../api/api';

Chart.register(...registerables);

@Component({
  selector: 'app-advanced-analysis-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advanced-analysis-modal.component.html',
  styleUrl: './advanced-analysis-modal.component.css'
})
export class AdvancedAnalysisModalComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private pollingTimer: any;
  private openedAt = 0; // timestamp quando o modal abriu
  private bucketMinutes24hStamp: number | null = null;
  private historyCache = new Map<number, any>();

  labels: string[] = [];
  values: number[] = [];

  period: '24h' | '7d' | '30d' | '365d' = '24h';

  stats = {
    current: 0,
    peak: 0,
    average: 0,
    total: 0
  };

  constructor(public translate: TranslationService, private api: Api) {}

  ngOnInit() {
    // Stats e gráfico serão carregados quando abrir
  }

  ngAfterViewInit() {
    // Não fazer nada aqui - esperar pelo ngOnChanges
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open'] && this.open) {
      this.openedAt = Date.now();
      this.bucketMinutes24hStamp = null;
      this.historyCache.clear();
      // Destruir gráfico anterior se existir
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      // Inicia polling do histórico do backend enquanto o modal estiver aberto
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }

      // Esperar DOM atualizar e criar gráfico
      setTimeout(() => {
        this.refreshFromBackendHistory();
        this.pollingTimer = setInterval(() => this.refreshFromBackendHistory(), 2000);
      }, 150);
    } else if (changes['open'] && !this.open) {
      // Fechar modal - destruir gráfico
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      // parar polling
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private refreshFromBackendHistory() {
    // Pede ao backend a janela correta para este período (evita reset ao refresh/outro dispositivo)
    this.api.getConsumptionHistory({ period: this.period, limit: 200000 }).subscribe({
      next: (entries: any[]) => {
        // Mantém cache local para evitar que buckets antigos "caiam" quando o endpoint devolve só os últimos N registos.
        for (const e of (entries || [])) {
          const id = Number(e?.history_id ?? NaN);
          if (Number.isFinite(id)) this.historyCache.set(id, e);
        }
        this.processHistory(Array.from(this.historyCache.values()));
        // Total (kWh) deve vir dos contadores de energia (Wh) dos dispositivos Shelly
        this.api.getOverview().subscribe({
          next: (ov: any) => {
            const devices = Array.isArray(ov?.devices) ? ov.devices : [];
            const totalWh = devices.reduce((sum: number, d: any) => sum + Number(d?.total_consumption ?? 0), 0);
            this.stats.total = Number((totalWh / 1000).toFixed(2));
          },
          error: () => {
            // manter valor anterior
          }
        });
        if (!this.chart) setTimeout(() => this.createChart(), 0);
        else this.updateChartAxes();
      },
      error: () => {
        if (!this.chart) setTimeout(() => this.createChart(), 0);
      }
    });
  }

  private processHistory(entries: any[]) {
    const now = Date.now();
    const windowMs = this.period === '24h'
      ? 24 * 60 * 60 * 1000
      : this.period === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : this.period === '30d'
      ? 30 * 24 * 60 * 60 * 1000
      : 365 * 24 * 60 * 60 * 1000;

    const cutoff = now - windowMs;

    // Limpar cache fora da janela (mantém memória controlada e evita que o eixo X deslize cedo demais)
    for (const [id, e] of this.historyCache.entries()) {
      const t = new Date(e?.register_date).getTime();
      if (!Number.isFinite(t) || t < cutoff) this.historyCache.delete(id);
    }

    const sorted = (entries || [])
      .filter((e) => {
        const t = new Date(e.register_date).getTime();
        return Number.isFinite(t) && t >= cutoff;
      })
      .sort((a, b) => new Date(a.register_date).getTime() - new Date(b.register_date).getTime());

    // Buckets de energia (Wh) no período (gráfico) e stats de potência (W)
    const energyBucketsWh = new Map<number, number>();
    const prevForEnergy = new Map<number, { t: number; w: number }>();

    const startForBucketsTs = sorted.length
      ? new Date(sorted[0].register_date).getTime()
      : now;

    const computeBucketMinutes24h = (elapsedHours: number): number => {
      // Regras solicitadas:
      // <= 1h : 5 min
      // 1 <= 5h : 20 min
      // 5 <= 10h : 30 min
      // 10+ : 60 min
      if (elapsedHours <= 1) return 5;
      if (elapsedHours <= 5) return 20;
      if (elapsedHours <= 10) return 30;
      return 60;
    };

    // "Stamp" do bucket de 24h: fixa o tamanho enquanto o modal estiver aberto,
    // para evitar que pontos antigos mudem quando o tempo passa.
    if (this.period === '24h' && this.bucketMinutes24hStamp === null) {
      const elapsedHours = Math.max(0.001, (now - startForBucketsTs) / (60 * 60 * 1000));
      this.bucketMinutes24hStamp = computeBucketMinutes24h(elapsedHours);
    }
    const bucketMinutes24h = this.period === '24h' ? (this.bucketMinutes24hStamp ?? 60) : 60;

    const bucketKeyFor = (ts: number): number => {
      const d = new Date(ts);
      if (this.period === '24h') {
        // buckets dinâmicos por minutos
        const m = d.getMinutes();
        const flooredMin = Math.floor(m / bucketMinutes24h) * bucketMinutes24h;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), flooredMin, 0, 0).getTime();
      }
      if (this.period === '365d') {
        // por mês
        return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
      }
      // por dia (7d/30d)
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    };

    const bucketEndFor = (bucketStartTs: number): number => {
      const d = new Date(bucketStartTs);
      if (this.period === '24h') {
        return bucketStartTs + bucketMinutes24h * 60 * 1000;
      }
      if (this.period === '365d') {
        return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
      }
      // 7d/30d
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
    };

    const addEnergyAcrossBuckets = (fromTs: number, toTs: number, w: number) => {
      if (!(toTs > fromTs) || !(w > 0)) return;
      let cursor = fromTs;
      while (cursor < toTs) {
        const bucketStart = bucketKeyFor(cursor);
        const bucketEnd = bucketEndFor(bucketStart);
        const sliceEnd = Math.min(toTs, bucketEnd);
        const dtSec = Math.max(0, (sliceEnd - cursor) / 1000);
        const energyWh = w * (dtSec / 3600);
        energyBucketsWh.set(bucketStart, (energyBucketsWh.get(bucketStart) || 0) + energyWh);
        cursor = sliceEnd;
      }
    };

    // Stats de potência: soma (todos os dispositivos), max e média por "chamada" (snapshot por segundo)
    const powerByDevice = new Map<number, number>();
    let totalPowerW = 0;
    let currentSecond: number | null = null;
    const powerSamplesW: number[] = [];

    for (const e of sorted) {
      const t = new Date(e.register_date).getTime();
      const devId = (e.device && e.device.device_id) ? Number(e.device.device_id) : Number(e.device_id ?? 0);
      const w = Number(e.consumption ?? 0);

      const sec = Math.floor(t / 1000);
      if (currentSecond === null) currentSecond = sec;
      if (sec !== currentSecond) {
        powerSamplesW.push(totalPowerW);
        currentSecond = sec;
      }

      const prevW = powerByDevice.get(devId) ?? 0;
      totalPowerW += (w - prevW);
      powerByDevice.set(devId, w);

      // Energia (Wh) por bucket via integração (prev.w * dt) distribuída pelos buckets
      const prevEnergy = prevForEnergy.get(devId);
      if (prevEnergy) {
        addEnergyAcrossBuckets(prevEnergy.t, t, prevEnergy.w || 0);
      }
      prevForEnergy.set(devId, { t, w });
    }
    if (currentSecond !== null) powerSamplesW.push(totalPowerW);

    // Construir grelha completa:
    // - enquanto ainda não há dados suficientes para preencher a janela (ex: só 10 min de dados),
    //   começar no primeiro registo (para não "desaparecer" o primeiro ponto a cada refresh)
    // - quando já há dados suficientes, usar cutoff (janela deslizante)
    const endTs = bucketKeyFor(now);
    const earliestTs = sorted.length ? new Date(sorted[0].register_date).getTime() : cutoff;
    const startTs = bucketKeyFor(Math.max(cutoff, earliestTs));

    const stepMs = this.period === '24h'
      ? bucketMinutes24h * 60 * 1000
      : this.period === '365d'
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const grid: number[] = [];
    if (this.period === '365d') {
      const dStart = new Date(startTs);
      const dEnd = new Date(endTs);
      const cur = new Date(dStart.getFullYear(), dStart.getMonth(), 1);
      while (cur.getTime() <= dEnd.getTime()) {
        grid.push(cur.getTime());
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      for (let ts = startTs; ts <= endTs; ts += stepMs) grid.push(ts);
    }

    this.labels = grid.map((ts) => {
      const d = new Date(ts);
      if (this.period === '24h') {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
      if (this.period === '365d') return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    this.values = grid.map((ts) => Number(((energyBucketsWh.get(ts) || 0) / 1000).toFixed(3)));

    const currentW = totalPowerW;
    const peakW = powerSamplesW.length ? Math.max(...powerSamplesW) : 0;
    const avgW = powerSamplesW.length
      ? (powerSamplesW.reduce((s, v) => s + v, 0) / powerSamplesW.length)
      : 0;

    this.stats.current = Number(currentW.toFixed(2));
    this.stats.peak = Number(peakW.toFixed(2));
    this.stats.average = Number(avgW.toFixed(2));
    // this.stats.total é preenchido via /overview (energia total dos dispositivos)
  }

  createChart() {
    console.log('🎨 Tentando criar gráfico...');
    console.log('Canvas exists?', !!this.chartCanvas);
    console.log('Chart already exists?', !!this.chart);

    if (!this.chartCanvas) {
      console.error('❌ Canvas não encontrado!');
      return;
    }

    if (this.chart) {
      console.log('⚠️ Gráfico já existe, a destruir...');
      this.chart.destroy();
      this.chart = null;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('❌ Contexto 2D não encontrado!');
      return;
    }

    console.log('✅ A criar gráfico...');

    // Detectar dark mode
    const isDarkMode = document.body.classList.contains('darkmode');
    // O gráfico tem fundo claro; usar texto escuro sempre para melhor contraste
    const axisTextColor = '#2c3e50';
    // Grid ligeiramente mais escura para visibilidade em dark mode
    const gridColor = isDarkMode ? '#b0b7c3' : '#d0d7de';

    // Range dinâmico do eixo Y baseado nos valores atuais (kWh por hora)
    const maxKWh = this.values.length ? Math.max(...this.values) : 0;
    const suggestedMax = maxKWh > 0 ? maxKWh * 1.25 : 0.1;
    const stepSize = this.computeStepSize(suggestedMax);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [{
          label: 'Consumo (kWh)',
          data: this.values.map(v => Number(v.toFixed(3))),
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#3498db',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#2980b9',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : '#fff',
            titleColor: isDarkMode ? '#e5e7eb' : axisTextColor,
            bodyColor: isDarkMode ? '#f1f5f9' : axisTextColor,
            borderColor: isDarkMode ? '#64b5f6' : gridColor,
            borderWidth: 1.5,
            padding: 14,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (context) => {
                return `Hora: ${context[0].label}`;
              },
              label: (context) => {
                return `Consumo: ${context.parsed.y} kWh`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              display: true
            },
            ticks: {
              color: axisTextColor,
              font: { size: 12, weight: 600 }
            },
            title: {
              display: true,
              text: this.period === '24h' ? 'Hora/Minutos' : (this.period === '365d' ? 'Mês' : 'Dia'),
              color: axisTextColor,
              font: { size: 13, weight: 600 }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
              display: true
            },
            ticks: {
              color: axisTextColor,
              stepSize,
              callback: (value: number | string) => `${Number(value).toFixed(suggestedMax >= 1 ? 2 : 3)} kWh`,
              font: { size: 12, weight: 600 }
            },
            title: {
              display: true,
              text: 'Consumo por intervalo (kWh)',
              color: axisTextColor,
              font: { size: 13, weight: 600 }
            },
            suggestedMax
          }
        }
      }
    });

    console.log('✅ Gráfico criado com sucesso!');
  }

  private updateChartAxes() {
    if (!this.chart) return;
    this.chart.data.labels = this.labels;
    (this.chart.data.datasets[0] as any).data = this.values;
    const maxKWh = this.values.length ? Math.max(...this.values) : 0;
    (this.chart.options.scales!['y'] as any).suggestedMax = maxKWh > 0 ? maxKWh * 1.25 : 0.1;
    (this.chart.options.scales!['y'] as any).ticks.stepSize = this.computeStepSize((this.chart.options.scales!['y'] as any).suggestedMax);
    (this.chart.options.scales!['x'] as any).title.text = this.period === '24h' ? 'Hora/Minutos' : (this.period === '365d' ? 'Mês' : 'Dia');
    this.chart.update();
  }

  private computeStepSize(suggestedMax: number): number {
    // Escolhe um passo razoável em função do máximo sugerido
    if (suggestedMax <= 0.1) return 0.02;
    if (suggestedMax <= 0.5) return 0.05;
    if (suggestedMax <= 1) return 0.1;
    if (suggestedMax <= 5) return 0.5;
    return Math.ceil(suggestedMax / 10);
  }

  setPeriod(p: '24h' | '7d' | '30d' | '365d') {
    this.period = p;
    if (this.open) this.refreshFromBackendHistory();
  }

  onPeriodChange(event: Event) {
    const sel = event.target as HTMLSelectElement;
    const val = sel.value as '24h' | '7d' | '30d' | '365d';
    this.setPeriod(val);
  }
}
