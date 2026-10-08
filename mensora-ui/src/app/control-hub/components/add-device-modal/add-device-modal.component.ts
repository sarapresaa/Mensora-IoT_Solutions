import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-add-device-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-device-modal.component.html',
  styleUrl: './add-device-modal.component.css'
})
export class AddDeviceModalComponent {
  @Input() open = false;
  @Input() newDeviceName = '';
  @Input() newDeviceStatus = '';
  @Input() newDeviceIp = '';
  @Input() discoveredDevices: any[] = [];
  @Input() addDeviceError = '';
  @Input() deviceCheckStatus = '';

  @Output() close = new EventEmitter<void>();
  @Output() newDeviceNameChange = new EventEmitter<string>();
  @Output() newDeviceStatusChange = new EventEmitter<string>();
  @Output() newDeviceIpChange = new EventEmitter<string>();
  @Output() addDevice = new EventEmitter<void>();
  @Output() addDiscoveredDevice = new EventEmitter<any>();
  @Output() testShelly = new EventEmitter<string>();

  constructor(public translate: TranslationService) {}

}
