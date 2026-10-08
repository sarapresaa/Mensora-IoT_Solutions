import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-system-control-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-control-card.component.html',
  styleUrl: './system-control-card.component.css'
})
export class SystemControlCardComponent {
  @Input() systemOn = false;
  @Output() toggle = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}
}
