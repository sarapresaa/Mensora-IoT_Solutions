import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { TranslationService } from '../../../services/translation.service';
import { ControlHubApiService } from '../../control-hub.api';

interface ScenarioDevice {
  device_id: number;
  device_name: string;
  device_state: boolean;
  device_type: string;
  ip_address: string;
}

interface ScenarioDetail {
  id?: number;
  name: string;
  state: 'active' | 'inactive';
  devices?: ScenarioDevice[];
}

@Component({
  selector: 'app-advanced-scenarios-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advanced-scenarios-details.component.html',
  styleUrl: './advanced-scenarios-details.component.css'
})
export class AdvancedScenariosDetailsComponent {
  @Input() scenarios: ScenarioDetail[] = [];
  @Output() deviceStateChange = new EventEmitter<{ scenarioId: number; deviceId: number; state: boolean }>();
  @Output() refresh = new EventEmitter<void>();

  protected expandedScenarios = signal<Set<number>>(new Set());
  protected loadingDevices = signal<Set<number>>(new Set());

  constructor(
    public translate: TranslationService,
    private api: ControlHubApiService
  ) {}

  toggleScenario(scenarioId: number | undefined) {
    if (scenarioId === undefined) return;
    const expanded = new Set(this.expandedScenarios());
    if (expanded.has(scenarioId)) {
      expanded.delete(scenarioId);
    } else {
      expanded.add(scenarioId);
    }
    this.expandedScenarios.set(expanded);
  }

  isExpanded(scenarioId: number | undefined): boolean {
    return scenarioId !== undefined && this.expandedScenarios().has(scenarioId);
  }

  toggleDevice(scenarioId: number | undefined, device: ScenarioDevice) {
    if (scenarioId === undefined) return;
    
    const loading = new Set(this.loadingDevices());
    loading.add(device.device_id);
    this.loadingDevices.set(loading);

    const newState = !device.device_state;
    
    // Apenas emite o evento - o componente pai cuida de atualizar o estado na BD e controlar fisicamente
    this.deviceStateChange.emit({ scenarioId, deviceId: device.device_id, state: newState });
    
    // Atualiza UI imediatamente para feedback visual
    device.device_state = newState;
    
    loading.delete(device.device_id);
    this.loadingDevices.set(loading);
    this.refresh.emit();
  }

  isLoadingDevice(deviceId: number): boolean {
    return this.loadingDevices().has(deviceId);
  }

  getDeviceIcon(deviceType: string): string {
    if (deviceType === 'shelly') return '⚡';
    return '📱';
  }
}
