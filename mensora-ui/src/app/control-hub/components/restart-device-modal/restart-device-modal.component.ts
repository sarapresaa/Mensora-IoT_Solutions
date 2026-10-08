import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-restart-device-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restart-device-modal.component.html',
  styleUrl: './restart-device-modal.component.css'
})
export class RestartDeviceModalComponent {
  @Input() open = false;
  @Input() busy = false;
  @Input() count = 0;
  @Input() targetMode: 'balanced' | 'saving' = 'balanced';
  @Input() ips: string[] = [];

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}
}
