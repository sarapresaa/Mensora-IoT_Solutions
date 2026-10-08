import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, SimpleChanges, Output } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-automations-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './automations-modal.component.html',
  styleUrl: './automations-modal.component.css'
})
export class AutomationsModalComponent implements OnChanges {
  @Input() open = false;
  @Input() automations: any[] = [];
  @Input() showList = true;
  @Output() close = new EventEmitter<void>();
  @Output() nameChange = new EventEmitter<string>();
  @Output() startChange = new EventEmitter<string>();
  @Output() endChange = new EventEmitter<string>();
  @Output() intervalValueChange = new EventEmitter<string>();
  @Output() intervalUnitChange = new EventEmitter<'seconds' | 'minutes' | 'hours'>();
  @Output() activeChange = new EventEmitter<boolean>();
  @Output() weekDaysChange = new EventEmitter<number[]>();
  @Output() triggerChange = new EventEmitter<number>();
  @Output() actionChange = new EventEmitter<'ON' | 'OFF'>();
  @Output() create = new EventEmitter<void>();

  daysOfWeek = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 },
  ];

  selectedDays: number[] = [];

  constructor(public translate: TranslationService) { }

  onUnitChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as
      'seconds' | 'minutes' | 'hours';
    this.intervalUnitChange.emit(value);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open']) {
      
      if (this.open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  onDayToggle(event: any) {
    const value = Number(event.target.value);
    if (event.target.checked) {
      this.selectedDays.push(value);
    } else {
      this.selectedDays = this.selectedDays.filter(v => v !== value);
    }
    this.weekDaysChange.emit(this.selectedDays);
  }

}
