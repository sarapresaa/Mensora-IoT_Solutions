import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DeviceZone } from '../../models/device-zone.model';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-devices-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './devices-card.component.html',
  styleUrl: './devices-card.component.css'
})
export class DevicesCardComponent {
  @Input() devices: DeviceZone[] = [];
  @Input() selectedIds: Set<number> | null = null;
  @Output() toggleDevice = new EventEmitter<number | undefined>();
  @Output() selectDevice = new EventEmitter<number | undefined>();
  @Output() openAdd = new EventEmitter<void>();
  @Output() openRemove = new EventEmitter<void>();
  @Output() openEdit = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}
}
