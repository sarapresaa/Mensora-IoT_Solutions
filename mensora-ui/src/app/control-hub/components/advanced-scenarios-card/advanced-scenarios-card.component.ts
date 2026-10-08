import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Scenario } from '../../models/scenario.model';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-advanced-scenarios-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advanced-scenarios-card.component.html',
  styleUrl: './advanced-scenarios-card.component.css'
})
export class AdvancedScenariosCardComponent {
  @Input() scenarios: Scenario[] = [];
  @Input() selectedNames: Set<string> | null = null;
  @Output() selectScenario = new EventEmitter<string>();
  @Output() openAdd = new EventEmitter<void>();
  @Output() openRemove = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}
}
