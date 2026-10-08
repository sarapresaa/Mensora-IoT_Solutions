import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { ControlHubApiService } from '../../control-hub.api';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-energy-control-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './energy-control-card.component.html',
  styleUrl: './energy-control-card.component.css'
})
export class EnergyControlCardComponent {
  @Input() energyModes: { label: string; value: string }[] = [];
  @Input() set selectedEnergyMode(value: string) {
    this._selectedEnergyMode.set(value);
  }
  get selectedEnergyMode(): string {
    return this._selectedEnergyMode();
  }
  private _selectedEnergyMode = signal<string>('balanced');
  @Input() devices: any[] = [];
  @Output() selectEnergyMode = new EventEmitter<string>();
  @Output() openHistory = new EventEmitter<void>();

  // Estado para verificar suporte ao eco mode
  ecoModeSupported = signal<boolean>(false);
  checkingSupport = signal<boolean>(false);

  constructor(
    public translate: TranslationService,
    private api: ControlHubApiService
  ) {}

  // Computed property que retorna o modo alternativo
  alternativeMode = computed(() => {
    return this._selectedEnergyMode() === 'balanced' ? 'saving' : 'balanced';
  });

  // Computed property que retorna o texto do botão baseado no estado atual
  currentModeText = computed(() => {
    const currentMode = this._selectedEnergyMode();
    console.log('[EnergyControlCard] currentModeText computed - currentMode:', currentMode);
    if (currentMode === 'balanced') {
      return 'Ativar Poupança de Energia'; // Quando está em balanced, oferece ativar o modo economia
    } else {
      return 'Ativar Modo Normal'; // Quando está em saving, oferece ativar o modo normal
    }
  });

  // Verifica se há dispositivos Shelly disponíveis
  ngOnInit() {
    this.checkShellyDevices();
  }

  ngOnChanges() {
    this.checkShellyDevices();
  }

  private checkShellyDevices() {
    // Assume que eco mode é suportado se há dispositivos Shelly
    const hasShellyDevices = this.devices.some(d => d.device_type === 'shelly' && d.ip_address);
    this.ecoModeSupported.set(hasShellyDevices);
  }

  // Método para alternar entre os modos
  toggleEnergyMode() {
    if (!this.ecoModeSupported()) {
      console.warn('Nenhum dispositivo Shelly conectado para controle de eco mode');
      return;
    }
    this.selectEnergyMode.emit(this.alternativeMode());
  }
}
