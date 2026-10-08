import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-remove-scenario-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './remove-scenario-modal.component.html',
  styleUrl: './remove-scenario-modal.component.css'
})
export class RemoveScenarioModalComponent {
  @Input() open = false;
  @Input() count = 0;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}
}
