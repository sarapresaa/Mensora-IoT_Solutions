import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Scenario } from '../../models/scenario.model';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-scenarios-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scenarios-card.component.html',
  styleUrl: './scenarios-card.component.css'
})
export class ScenariosCardComponent {
    @Output() toggleState = new EventEmitter<Scenario>();
  @Input() scenarios: Scenario[] = [];
  ngOnChanges() {
    console.log('ScenariosCardComponent scenarios input:', this.scenarios);
  }
  @Input() selectedNames: Set<string> | null = null;
  @Output() selectScenario = new EventEmitter<string>();
  @Output() openAdd = new EventEmitter<void>();
  @Output() openRemove = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}
}
