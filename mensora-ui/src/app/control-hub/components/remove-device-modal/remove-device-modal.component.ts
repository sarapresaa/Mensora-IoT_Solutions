import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-remove-device-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './remove-device-modal.component.html',
  styleUrl: './remove-device-modal.component.css'
})
export class RemoveDeviceModalComponent {
  @Input() open = false;
  @Input() count = 0;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}
}
