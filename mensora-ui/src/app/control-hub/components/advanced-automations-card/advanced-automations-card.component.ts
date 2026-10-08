import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';
import { formatWeekdays } from '../../utils/weekday-format';

@Component({
  selector: 'app-advanced-automations-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advanced-automations-card.component.html',
  styleUrl: './advanced-automations-card.component.css'
})
export class AdvancedAutomationsCardComponent {
  @Input() automations: any[] = [];
  @Output() toggleAutomation = new EventEmitter<{ id: number; active: boolean }>();

  constructor(public translate: TranslationService) {}

  getRepetitionInfo(automation: any): string {
    return formatWeekdays(automation?.weekday, this.translate);
  }
}
