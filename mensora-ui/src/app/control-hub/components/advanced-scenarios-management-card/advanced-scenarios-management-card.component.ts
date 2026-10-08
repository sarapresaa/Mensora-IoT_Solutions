import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ScenarioDetail } from '../../control-hub.types';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-advanced-scenarios-management-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advanced-scenarios-management-card.component.html',
  styleUrl: './advanced-scenarios-management-card.component.css'
})
export class AdvancedScenariosManagementCardComponent {
  @Input() scenarios: ScenarioDetail[] = [];
  @Input() selectedIds: Set<number> = new Set();
  @Output() toggleScenarioState = new EventEmitter<{ scenarioId: number; state: boolean }>();
  @Output() toggleDeviceState = new EventEmitter<{ scenarioId: number; deviceId: number; state: boolean }>();
  @Output() selectScenario = new EventEmitter<number>();
  @Output() openAdd = new EventEmitter<void>();
  @Output() openRemove = new EventEmitter<void>();

  constructor(public translate: TranslationService) {}

  onToggleScenario(scenario: ScenarioDetail) {
    const newState = scenario.state === 'active' ? false : true;
    this.toggleScenarioState.emit({ scenarioId: scenario.id, state: newState });
  }

  onToggleDevice(scenario: ScenarioDetail, device: any) {
    const newState = device.device_state ? false : true;
    this.toggleDeviceState.emit({ scenarioId: scenario.id, deviceId: device.device_id, state: newState });
  }

  onSelectScenario(scenarioId: number | undefined) {
    if (scenarioId === undefined) return;
    this.selectScenario.emit(scenarioId);
  }
}