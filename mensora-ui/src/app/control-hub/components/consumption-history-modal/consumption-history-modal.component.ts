import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-consumption-history-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consumption-history-modal.component.html',
  styleUrl: './consumption-history-modal.component.css'
})
export class ConsumptionHistoryModalComponent implements OnInit {
  @Input() open = false;
  @Input() history: any[] = [];
  @Output() close = new EventEmitter<void>();

  // Dados mock para o gráfico de barras (3 meses)
  chartData = [
    { month: 'Outubro', consumption: 450, color: '#3498db' },
    { month: 'Novembro', consumption: 380, color: '#2ecc71' },
    { month: 'Dezembro', consumption: 520, color: '#e74c3c' }
  ];

  // Estatísticas calculadas
  stats = {
    total: 0,
    average: 0,
    max: 0,
    min: 0
  };

  constructor(public translate: TranslationService) {}

  ngOnInit() {
    this.calculateStats();
  }

  calculateStats() {
    const consumptions = this.chartData.map(d => d.consumption);
    this.stats.total = consumptions.reduce((sum, val) => sum + val, 0);
    this.stats.average = Math.round(this.stats.total / consumptions.length);
    this.stats.max = Math.max(...consumptions);
    this.stats.min = Math.min(...consumptions);
  }

  getBarHeight(consumption: number): number {
    const maxConsumption = Math.max(...this.chartData.map(d => d.consumption));
    return (consumption / maxConsumption) * 100;
  }
}
