import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Scenario } from '../../models/scenario.model';
import { DeviceZone } from '../../models/device-zone.model';
import { TranslationService } from '../../../services/translation.service';
import { SimpleChanges } from '@angular/core';
import { ControlHubApiService } from '../../control-hub.api';
import { AuthService, User } from '../../../../auth/auth.service';

@Component({
  selector: 'app-add-timer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-timer-modal.component.html',
  styleUrl: './add-timer-modal.component.css'
})
export class AddTimerModalComponent {
  @Input() open = false;
  @Input() scenarios: Scenario[] = [];
  @Input() devices: DeviceZone[] = [];
  @Input() advanced: boolean = false;
  @Input() automations: any[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<void>();
  @Output() nameChange = new EventEmitter<string>();
  @Output() startChange = new EventEmitter<string>();
  @Output() endChange = new EventEmitter<string>();
  @Output() intervalValueChange = new EventEmitter<string>();
  @Output() intervalUnitChange = new EventEmitter<'seconds' | 'minutes' | 'hours'>();
  @Output() activeChange = new EventEmitter<boolean>();
  @Output() weekDaysChange = new EventEmitter<string>();
  @Output() scenarioChange = new EventEmitter<number | null>();
  @Output() deviceChange = new EventEmitter<number | null>();
  @Output() deviceSelected = new EventEmitter<DeviceZone | null>();
  @Output() scenarioSelected = new EventEmitter<Scenario | null>();

  daysOfWeek = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 },
  ];

  selectedDays: number[] = [];
  
  selectedType: 'scenario' | 'device' | '' = '';
  selectedDevice: DeviceZone | null = null;
  selectedScenario: Scenario | null = null;
  selectedTimerType: 'start_end' | 'interval' | '' = '';

  private currentUser: User | null = null;

  constructor(
    public translate: TranslationService,
    private controlHubApi: ControlHubApiService,
    private authService: AuthService
  ) {}

  onUnitChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as
      'seconds' | 'minutes' | 'hours';
    this.intervalUnitChange.emit(value);
  }

  showWeekdays = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['advanced']) {
      this.showWeekdays = changes['advanced'].currentValue;
    }
  }

  onDayToggle(event: any) {
    const value = Number(event.target.value);
    
    if (event.target.checked) {
      this.selectedDays.push(value);
    } else {
      this.selectedDays = this.selectedDays.filter(v => v !== value);
    }

    this.weekDaysChange.emit(this.selectedDays.join(','));
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (this.selectedType === 'device') this.loadUserDevices();
      if (this.selectedType === 'scenario') this.loadUserScenarios();
    });
  }

  onTypeSelect() {
    this.selectedScenario = null;
    this.selectedDevice = null;
    this.scenarioChange.emit(null);
    this.deviceChange.emit(null);

    if (this.selectedType === 'device') {
      this.loadUserDevices();
    } else if (this.selectedType === 'scenario') {
      this.loadUserScenarios();
    }
  }

  private loadUserDevices() {
    if (!this.currentUser) return;

    this.controlHubApi.getDevicesByUser(this.currentUser.id).subscribe({
      next: (devices) => {
        this.devices = devices.map((s) => ({
          device_id: s.device_id!,
          name: s.device_name,
          ip_address: s.ip_address,
          status: '',
          state: 'off',
          current_consumption: 0,
          total_consumption: 0,
          total_operating_time: 0,
          voltage: 0,
          current: 0
        }));
      },
      error: (err) => {
        console.error('Error loading devices:', err);
        this.devices = [];
      }
    });
  }

  private loadUserScenarios() {
    if (!this.currentUser) return;

    this.controlHubApi.getScenaryByUser(this.currentUser.id).subscribe({
      next: (scenarios) => {
        this.scenarios = scenarios.map((s) => ({
          id: s.scenary_id!,
          name: s.scenary_name,
          devices: '',
          state: 'inactive',
          stateClass: undefined
        }));
      },
      error: (err) => {
        console.error('Error loading scenarios:', err);
        this.scenarios = [];
      }
    });
  }

  onDeviceSelect(event: Event) {
    const deviceId = Number((event.target as HTMLSelectElement).value);
    this.selectedDevice = this.devices.find(d => d.device_id === deviceId) ?? null;
    this.deviceSelected.emit(this.selectedDevice);
  }

  onScenarioSelect(event: Event) {
    const scenarioID = Number((event.target as HTMLSelectElement).value);
    this.selectedScenario = this.scenarios.find(s => s.id === scenarioID) ?? null;
    this.scenarioSelected.emit(this.selectedScenario);
  }

}