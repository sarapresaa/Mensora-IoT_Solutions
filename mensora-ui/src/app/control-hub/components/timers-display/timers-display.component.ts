import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';

export interface Timer {
  id?: number;
  name?: string;
  timer_name?: string;
  start_time?: string;
  end_time?: string;
  schedule?: string;
  status?: 'Ativo' | 'Inativo' | 'active' | 'inactive';
  automation_target_id?: number;
}

@Component({
  selector: 'app-timers-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timers-display.component.html',
  styleUrl: './timers-display.component.css'
})
export class TimersDisplayComponent {
  @Input() timers: Timer[] = [];
  @Input() title: string = 'Timers';

  constructor(public translate: TranslationService) {}

  getTimerName(timer: Timer): string {
    return timer.timer_name || timer.name || `Timer ${timer.id}`;
  }

  getTimerSchedule(timer: Timer): string {
    return timer.schedule || `${timer.start_time} - ${timer.end_time}` || 'N/A';
  }

  isActive(timer: Timer): boolean {
    return timer.status === 'Ativo' || timer.status === 'active';
  }

  getStatusClass(timer: Timer): string {
    return this.isActive(timer) ? 'status-active' : 'status-inactive';
  }
}
