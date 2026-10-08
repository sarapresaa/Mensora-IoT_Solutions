import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../services/translation.service'; 

@Component({
  selector: 'app-edit-device-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './edit-device-modal.component.html',
  styleUrls: ['./edit-device-modal.component.css'],
})
export class EditDeviceModalComponent {
  @Input() open = false;
  @Input() name = '';
  @Input() description = '';
  @Input() ip = '';
  @Input() deviceType = '';

  @Output() close = new EventEmitter<void>();
  @Output() nameChange = new EventEmitter<string>();
  @Output() descriptionChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}
}
