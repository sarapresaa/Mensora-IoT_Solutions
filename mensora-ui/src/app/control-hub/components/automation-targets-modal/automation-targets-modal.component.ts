import { Component, Input, Output,EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceZone } from '../../models/device-zone.model';
import { Scenario } from '../../models/scenario.model';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-automation-targets-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './automation-targets-modal.component.html',
  styleUrl: './automation-targets-modal.component.css',
})
export class AutomationTargetsModalComponent {

  @Input() automationId!: number;
  @Input() devices: DeviceZone[] = []; 
  @Input() scenaries: Scenario[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<{ type: "device" | "scenary" | undefined; deviceId: number | undefined; scenaryId: number | undefined; }>(); 
  selectedType: 'device' | 'scenary' | undefined = undefined;
  selectedDeviceId: number | undefined = undefined;
  selectedScenaryId: number | undefined = undefined;

  constructor(public translate: TranslationService) {}
}
