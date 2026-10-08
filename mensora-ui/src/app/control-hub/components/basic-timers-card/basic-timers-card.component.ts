import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TimerSchedule } from '../../models/timer-schedule.model';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-basic-timers-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './basic-timers-card.component.html',
  styleUrl: './basic-timers-card.component.css'
})
export class BasicTimersCardComponent {
  @Input() timers: TimerSchedule[] = [];
  @Input() automations: any[] = [];
  @Output() openAddTimer = new EventEmitter<void>();
  @Output() toggleAutomation = new EventEmitter<{ id: number; active: boolean }>();

  constructor(public translate: TranslationService) {}
}
