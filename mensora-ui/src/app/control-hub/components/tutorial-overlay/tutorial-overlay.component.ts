import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-tutorial-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutorial-overlay.component.html',
  styleUrl: './tutorial-overlay.component.css'
})
export class TutorialOverlayComponent {
  @Input() open = false;
  @Input() currentStep: any;
  @Input() steps: any[] = [];
  @Input() stepIndex = 0;
  @Output() close = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}
}
