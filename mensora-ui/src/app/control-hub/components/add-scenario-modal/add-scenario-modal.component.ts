import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-add-scenario-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-scenario-modal.component.html',
  styleUrl: './add-scenario-modal.component.css'
})
export class AddScenarioModalComponent {
  @Input() open = false;
  @Input() availableDevices: any[] = [];
  @Input() selectedDeviceIds: (number | undefined)[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() nameChange = new EventEmitter<string>();
  @Output() toggleDevice = new EventEmitter<number | undefined>();
  @Output() create = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}
}
