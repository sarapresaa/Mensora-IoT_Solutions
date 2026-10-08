import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CustomTimer } from '../../models/custom-timer.model';
import { TranslationService } from '../../../services/translation.service';
import { formatWeekdays } from '../../utils/weekday-format';

@Component({
  selector: 'app-advanced-timers-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advanced-timers-card.component.html',
  styleUrl: './advanced-timers-card.component.css'
})
export class AdvancedTimersCardComponent {
  @Input() timers: CustomTimer[] = [];
  @Input() automations: any[] = [];
  @Input() selectedTimerIds: Set<number> = new Set();
  @Input() selectedAutomationIds: Set<number> = new Set();
  @Output() openAddTimer = new EventEmitter<void>();
  @Output() toggleAutomation = new EventEmitter<{ id: number; active: boolean }>();
  @Output() selectTimer = new EventEmitter<number>();
  @Output() selectAutomation = new EventEmitter<number>();
  @Output() openRemove = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}

  getRepetitionInfo(automation: any): string {
    return formatWeekdays(automation?.weekday, this.translate);
  }

  onSelectTimer(timerId: number) {
    this.selectTimer.emit(timerId);
  }

  onSelectAutomation(automationId: number) {
    this.selectAutomation.emit(automationId);
  }
}
