import { CommonModule } from '@angular/common';
import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ControlHubApiService } from './control-hub.api';
import { HubScenario } from './control-hub.types';
import { EnergyMode } from './models/energy-mode.model';
import { TimerSchedule } from './models/timer-schedule.model';
import { DeviceZone } from './models/device-zone.model';
import { Scenario } from './models/scenario.model';
import { CustomTimer } from './models/custom-timer.model';
import { TutorialMode, TutorialStep } from './models/tutorial-step.model';
import { AddDeviceModalComponent } from './components/add-device-modal/add-device-modal.component';
import { EditDeviceModalComponent } from './components/edit-device-modal/edit-device-modal.component';
import { TutorialOverlayComponent } from './components/tutorial-overlay/tutorial-overlay.component';
import { RemoveDeviceModalComponent } from './components/remove-device-modal/remove-device-modal.component';
import { ConsumptionHistoryModalComponent } from './components/consumption-history-modal/consumption-history-modal.component';
import { AddTimerModalComponent } from './components/add-timer-modal/add-timer-modal.component';
import { AdvancedAnalysisModalComponent } from './components/advanced-analysis-modal/advanced-analysis-modal.component';
import { AutomationsModalComponent } from './components/automations-modal/automations-modal.component';
import { AddScenarioModalComponent } from './components/add-scenario-modal/add-scenario-modal.component';
import { RemoveScenarioModalComponent } from './components/remove-scenario-modal/remove-scenario-modal.component';
import { RemoveAutomationModalComponent } from './components/remove-automation-modal/remove-automation-modal.component';
import { RestartDeviceModalComponent } from './components/restart-device-modal/restart-device-modal.component';
import { EnergyControlCardComponent } from './components/energy-control-card/energy-control-card.component';
import { BasicTimersCardComponent } from './components/basic-timers-card/basic-timers-card.component';
import { DevicesCardComponent } from './components/devices-card/devices-card.component';
import { ScenariosCardComponent } from './components/scenarios-card/scenarios-card.component';
import { AdvancedEnergyCardComponent } from './components/advanced-energy-card/advanced-energy-card.component';
import { AdvancedTimersCardComponent } from './components/advanced-timers-card/advanced-timers-card.component';
import { AdvancedDevicesCardComponent } from './components/advanced-devices-card/advanced-devices-card.component';
import { SettingsCardComponent } from './components/settings-card/settings-card';
import { TimersDisplayComponent } from './components/timers-display/timers-display.component';
import { AdvancedScenariosManagementCardComponent } from './components/advanced-scenarios-management-card/advanced-scenarios-management-card.component';
import { SystemControlCardComponent } from './components/system-control-card/system-control-card.component';

import { AuthService, User } from '../../auth/auth.service';
import { Router } from '@angular/router';

import { TranslationService } from '../services/translation.service';
import { Api } from '../api/api';
import { ConsumptionTrackerService } from '../services/consumption-tracker.service';


@Component({
  selector: 'app-control-hub',
  standalone: true,
  imports: [
    CommonModule,
    AddDeviceModalComponent,
    EditDeviceModalComponent,
    TutorialOverlayComponent,
    RemoveDeviceModalComponent,
    AddTimerModalComponent,
    ConsumptionHistoryModalComponent,
    AdvancedAnalysisModalComponent,
    AutomationsModalComponent,
    AddScenarioModalComponent,
    RemoveScenarioModalComponent,
    RemoveAutomationModalComponent,
    RestartDeviceModalComponent,
    SystemControlCardComponent,
    EnergyControlCardComponent,
    BasicTimersCardComponent,
    DevicesCardComponent,
    ScenariosCardComponent,
    AdvancedEnergyCardComponent,
    AdvancedTimersCardComponent,
    AdvancedDevicesCardComponent,
    SettingsCardComponent,
    TimersDisplayComponent,
    AdvancedScenariosManagementCardComponent,
  ],
  templateUrl: './control-hub.component.html',
  styleUrl: './control-hub.component.css'
})
export class ControlHubComponent implements OnInit, OnDestroy {

  loggedIn = false;
  currentUser: User | null = null;
  private pollingInterval: any = null;

  public toggleScenarioState(scenario: Scenario) {
    const newState = scenario.state === 'active' ? 'inactive' : 'active';
    if (!scenario.id) return;
    this.api.setScenarioState(scenario.id, newState).subscribe({
      next: () => this.loadOverview(),
      error: (err) => {
        // Opcional: mostrar erro
        this.backendError.set('Erro ao atualizar cenário.');
      }
    });
  }

  public onScenarioDeviceStateChange(event: { scenarioId: number; deviceId: number; state: boolean }) {
    console.log('[Scenario Device State Change]', event);
    // The component handles the toggle directly via the API
    // This is just for logging/additional actions if needed
  }

  public onAdvancedScenarioToggle(event: { scenarioId: number; state: boolean }) {
    console.log('[Advanced Scenario Toggle]', event);
    // Toggle all devices in the scenario
    const state = event.state ? 'active' : 'inactive';
    this.api.setScenarioState(event.scenarioId, state).subscribe({
      next: () => this.loadOverview(),
      error: (err) => {
        console.error('Erro ao atualizar cenário:', err);
      }
    });
  }

  public onAdvancedDeviceToggle(event: { scenarioId: number; deviceId: number; state: boolean }) {
    console.log('[Advanced Device Toggle]', event);
    this.api.setDeviceState(event.deviceId, event.state).subscribe({
      next: () => this.loadOverview(),
      error: (err) => {
        console.error('Erro ao atualizar dispositivo:', err);
      }
    });
  }

  protected readonly mode = signal<'basic' | 'advanced'>('basic');
  protected readonly modes: { key: 'basic' | 'advanced'; label: string }[] = [
    { key: 'basic', label: 'Básico' },
    { key: 'advanced', label: 'Avançado' }
  ];

  protected readonly darkMode = signal<'dark' | 'light'>('dark');
  protected readonly darkMmodes: { key: 'dark' | 'light'; label: string }[] = [
    { key: 'dark', label: 'Dark' },
    { key: 'light', label: 'Light' }
  ];

  protected readonly energyModes: EnergyMode[] = [
    { label: 'Modo Equilibrado', value: 'balanced' },
    { label: 'Modo Poupança', value: 'saving' }
  ];

  protected readonly selectedEnergyMode = signal<string>('balanced');

  // Eco mode restart flow
  protected readonly ecoRestartOpen = signal(false);
  protected readonly ecoRestartBusy = signal(false);
  protected readonly ecoRestartIps = signal<string[]>([]);
  protected readonly ecoRestartTargetMode = signal<'balanced' | 'saving'>('balanced');

  // Mensagem de erro quando o backend não está disponível
  protected readonly backendError = signal<string>('');

  protected readonly basicTimers: TimerSchedule[] = [];

  protected readonly basicDevices: DeviceZone[] = [];

  protected readonly configToggles = [
    { label: 'Usar Informação Meteorológica' },
    { label: 'Assistente de Voz' }
  ];

  public scenarios: Scenario[] = [];

  // cenarios da db
  protected readonly hubScenarios = signal<HubScenario[]>([]);

  // cenarios transformados para o componente advanced scenarios details
  protected readonly scenariosForDetails = computed(() => {
    return this.hubScenarios().map(scenario => ({
      id: scenario.id,
      name: scenario.name,
      state: scenario.state as 'active' | 'inactive',
      devices: scenario.devices?.map(device => ({
        device_id: device.device_id,
        device_name: device.device_name,
        device_state: device.device_state,
        device_type: device.device_type || 'unknown',
        ip_address: device.ip_address || ''
      })) || []
    }));
  });

  // timers da db
  protected readonly hubTimers = signal<any[]>([]);

  protected readonly advancedTimers: CustomTimer[] = [];

  protected readonly advancedDevices: DeviceZone[] = [];

  protected readonly advancedControls = ['Notificações Meteorológicas', 'Assistente de Voz'];

  private readonly tutorialSteps: Record<TutorialMode, TutorialStep[]> = {
    advanced: [
      {
        key: 'tutorialAdvanced',
        title: 'Modo Avançado',
        description: 'Acesse este modo para obter controlo total sobre o sistema com funcionalidades adicionais.'
      },
      {
        key: 'tutorialScenarios',
        title: 'Cenários',
        description: 'Organize os seus dispositivos em cenários e controle-os individualmente.'
      },
      {
        key: 'tutorialGraphics',
        title: 'Análise de Energia',
        description: 'Monitorize a informação através de gráficos detalhados do consumo de energia com filtros por dia/semana.'
      },
      {
        key: 'tutorialSchedule',
        title: 'Automações',
        description: 'Configure horários precisos e escolha dias específicos da semana.'
      }
    ],
    basic: [
      {
        key: 'tutorialWelcome',
        title: 'Bem-vindo ao Mensora',
        description: 'Este tutorial irá guiá-lo através das funcionalidades básicas do sistema inteligente Mensora.'
      },
      {
        key: 'tutorialSwitch',
        title: 'Controlo Remoto',
        description: 'Use o interruptor principal para ligar ou desligar o sistema geral.'
      },
      {
        key: 'tutorialTimer',
        title: 'Temporizador',
        description: 'Crie temporizadores com opções predefinidas para automatizar o sistema.'
      },
      {
        key: 'tutorialEnergy',
        title: 'Gestão de Energia',
        description: 'Escolha entre modo Normal ou Poupança para controlar o consumo de energia.'
      },
      {
        key: 'tutorialDevices',
        title: 'Dispositivos',
        description: 'Adicione ou remova dispositivos IoT aos seus cenários facilmente.'
      }
    ]
  };

  isDarkMode = signal(true);
  selectedLanguage = signal<'pt' | 'en'>('pt');
  isEnglish(): boolean {
    return this.selectedLanguage() === 'en';
  }

  protected readonly settingsOpen = signal(false);
  protected modalUser = signal<any>(null);

  protected readonly tutorialOpen = signal(false);
  protected readonly tutorialMode = signal<TutorialMode>('basic');
  protected readonly tutorialStep = signal(0);
  protected readonly tutorialDirection = signal<'forward' | 'backward'>('forward');
  protected readonly tutorialAnimFlip = signal(false);

  protected readonly removeDeviceOpen = signal(false);
  protected readonly addDeviceOpen = signal(false);
  protected readonly newDeviceName = signal('');
  protected readonly newDeviceStatus = signal('');
  protected readonly discoveredDevices = signal<any[]>([]);
  protected readonly deviceCheckStatus = signal<string>('');
  protected readonly newDeviceIp = signal('');
  protected readonly newDeviceIsShelly = signal(false);
  protected readonly newDeviceScenarioId = signal<number | null>(null);

  // feedback de erro nos modais
  protected readonly addDeviceError = signal<string>('');

  protected readonly addTimerOpen = signal(false);

  protected readonly viewHistoryOpen = signal(false);

  protected readonly advancedAnalysisOpen = signal(false);
  protected readonly consumptionHistory = signal<any[]>([]);

  protected readonly hubDevices = signal<any[]>([]);

  protected readonly automations = signal<any[]>([]);
  protected readonly automationsOpen = signal(false);
  protected readonly availableDevices = signal<any[]>([]);
  protected readonly newAutomationName = signal('');
  protected readonly newAutomationStart = signal(<string | null>(null));
  protected readonly newAutomationEnd = signal(<string | null>(null));
  protected readonly newIntervalValue = signal<number | undefined>(undefined);
  protected readonly newIntervalUnit = signal<'seconds' | 'minutes' | 'hours'>('seconds');
  protected readonly newWeekdays = signal<string | null>(null);
  protected readonly newIFTTT = signal<'ON' | 'OFF'>('OFF');
  protected readonly newIFTTT_Trigger = signal<number | undefined>(undefined);
  protected readonly newIFTTTAction = signal<'ON' | 'OFF'>('OFF');

  protected readonly newAutomationActive = signal(false);
  protected readonly selectedAutomationId = signal<number | null>(null);
  protected readonly selectedAutomationTargetId = signal<number | null>(null);


  protected readonly targetsOpen = signal(false);
  protected readonly newTargetType = signal<'device' | 'scenary' | undefined>(undefined);
  protected readonly newTargetDeviceId = signal<number | null>(null);
  protected readonly newTargetScenaryId = signal<number | null>(null);

  protected readonly newTargetTimerId = signal<number | undefined>(undefined);
  protected readonly newTargetTimerDeviceId = signal<number | undefined>(undefined);
  protected readonly selectedTargetId = signal<number | null>(null);

  protected readonly modalAdvanced = signal(false);
  protected readonly newTimerName = signal('');
  protected readonly newTimerStart = signal(<string | null>(null));
  protected readonly newTimerEnd = signal(<string | null>(null));
  protected readonly newTimerValue = signal<number | undefined>(undefined);
  protected readonly newTimerIntervalUnit = signal<'seconds' | 'minutes' | 'hours'>('seconds');
  protected readonly newTimerWeekdays = signal<string | null>(null);
  protected readonly newTimerIFTTT = signal<'ON' | 'OFF'>('OFF');
  protected readonly newTimerIFTTT_Trigger = signal<number | undefined>(undefined);
  protected readonly newTimerIFTTTAction = signal<'ON' | 'OFF'>('OFF');
  protected readonly newTimerActive = signal(false);

  protected readonly selectedDeviceIds = signal<Set<number>>(new Set());
  protected readonly selectedScenarioNames = signal<Set<string>>(new Set());
  protected readonly selectedAdvancedScenarioIds = signal<Set<number>>(new Set());
  protected readonly selectedAdvancedTimerIds = signal<Set<number>>(new Set());
  protected readonly selectedAdvancedAutomationIds = signal<Set<number>>(new Set());

  protected readonly addScenarioOpen = signal(false);
  protected readonly removeScenarioOpen = signal(false);
  protected readonly removeAutomationOpen = signal(false);
  protected readonly newScenarioName = signal('');
  protected readonly newScenarioDevices = signal<(number | undefined)[]>([]);
  protected readonly availableDevicesForScenario = signal<any[]>([]);

  // estado sistema
  protected readonly systemOn = signal<boolean>(true);

  protected readonly editOpen = signal(false);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editIp = signal('');
  protected readonly editScenarioId = signal<number | null>(null);
  protected readonly editDeviceType = signal('');

  protected readonly currentTutorialSteps = computed(() => this.tutorialSteps[this.tutorialMode()]);
  protected readonly currentTutorialStep = computed(() => this.currentTutorialSteps()[this.tutorialStep()]);
  protected readonly tutorialProgress = computed(() => ({
    index: this.tutorialStep(),
    total: this.currentTutorialSteps().length
  }));

  constructor(
    private readonly api: ControlHubApiService,
    private readonly userApi: Api,
    private authService: AuthService,
    public translate: TranslationService,
    private router: Router,
    private tracker: ConsumptionTrackerService) {
    this.translate.language$.subscribe(lang => {
      this.selectedLanguage.set(lang);
    });
  }

  ngOnInit() {
    this.authService.checkLogin().subscribe({
      next: (user) => { },
      error: () => {
        this.router.navigate(['/login']);
      }
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.loadUserLanguage();

    this.authService.loggedIn$.subscribe(state => {
      this.loggedIn = state;
      if (!state) this.router.navigate(['/login']);
      else {
        // Carrega histórico de consumo imediatamente ao iniciar
        this.api.consumptionHistory().subscribe({
          next: data => this.consumptionHistory.set(data || []),
          error: () => {}
        });

        // Sincroniza estados reais dos dispositivos na inicialização
        this.syncAndLoadOverview();

        // Inicia polling periódico de consumos E sincronização de estados (a cada 2 segundos)
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => {
          // Sincroniza o estado real dos dispositivos primeiro
          this.api.syncDeviceStates().subscribe({
            next: () => {
              // Depois atualiza os valores de consumo
              this.updateConsumptionValues();
              // Finalmente, recarrega overview para manter tudo sincronizado
              this.loadOverview();
            },
            error: () => {
              // Se erro, tenta atualizar consumo mesmo assim
              this.updateConsumptionValues();
              this.loadOverview();
            }
          });
        }, 2000);
      }
    });
  }

  ngOnDestroy() {
    // Para o polling ao destruir o componente
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  // Atualiza consumo sem recarregar; chamada a cada 2s; preserva valores anteriores se erro
  private updateConsumptionValues() {
    const devices = this.hubDevices();

    devices.forEach(device => {
      const idx = this.basicDevices.findIndex(d => d.device_id === device.device_id);
      if (idx >= 0) {
        // Para cada dispositivo faz requisicao individual a cloud/shelly
        if (device.device_type === 'shelly') {
          // Shelly RPC passa device_id e IP
          this.api.getShellyConsumption(device.ip_address, device.device_id).subscribe({
            next: (data: any) => {
              console.debug(`[POLLING] Response Shelly ${device.device_name}:`, data);
              // So atualiza se ha valores validos de Shelly
              if (data.power !== undefined) {
                this.basicDevices[idx].current_consumption = data.power;
              }
              if (data.energy !== undefined) {
                this.basicDevices[idx].total_consumption = data.energy;
              }
              if (data.voltage !== undefined) {
                this.basicDevices[idx].voltage = data.voltage;
              }
              if (data.current !== undefined) {
                this.basicDevices[idx].current = data.current;
              }
            },
            error: (err) => {
              console.debug(`[POLLING] Erro ao obter dados Shelly ${device.device_name}:`, err);
              // Nao limpar valores anteriores em erro
              // Mantem ultimos valores validos na UI
            }
          });
        }
      }
    });
  }

  // Sincroniza estado dos dispositivos e carrega overview
  private syncAndLoadOverview() {
    this.api.syncDeviceStates().subscribe({
      next: () => {
        // Depois de sincronizar carrega overview atualizada
        this.loadOverview();
      },
      error: (err) => {
        console.error('Erro ao sincronizar estados:', err);
        // Mesmo com erro de sincronizacao carrega overview
        this.loadOverview();
      }
    });
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  loadOverview() {
    this.api.overview().subscribe({
      next: overview => {
        // Limpa erro de backend se chamada foi bem sucedida
        this.backendError.set('');

        // Atualiza estado do sistema com estado real dos dispositivos
        this.systemOn.set(overview.systemActive ?? false);

        // Carrega dispositivos
        try {
          const oldDevices = new Map(this.basicDevices.map(d => [d.device_id, d]));
          this.basicDevices.length = 0;
          this.hubDevices.set(overview.devices || []);
          overview.devices?.forEach(d => {
            const oldDevice = oldDevices.get(d.device_id);
            this.basicDevices.push({
              device_id: d.device_id,
              name: d.device_name,
              status: d.device_description || 'Dispositivo',
              state: d.device_state ? 'on' : 'off',
              // Preserva valores de consumo para evitar 0 quando ha erro
              current_consumption: oldDevice?.current_consumption,
              total_consumption: oldDevice?.total_consumption,
              total_operating_time: oldDevice?.total_operating_time,
              voltage: oldDevice?.voltage,
              current: oldDevice?.current
            });
          });
        } catch (e) { }

        // Atualiza tracker de consumo em background
        try {
          this.tracker.processOverview(overview.devices || []);
        } catch (e) { }

        // Carrega cenarios
        try {
          this.scenarios.length = 0;
          this.hubScenarios.set(overview.scenaries || []);
          overview.scenaries?.forEach(s => this.scenarios.push({
            id: s.id,
            name: s.name,
            devices: (s.devices || []).length + ' ' + this.translate.t('devices'),
            state: s.state === 'active' ? 'active' : 'inactive'
          }));
          console.log('Scenarios loaded:', this.scenarios);
        } catch (e) { console.error('Error loading scenarios', e); }

        // Carrega automacoes
        try {
          this.automations.set(overview.automations || []);
        } catch (e) { }

        // Carrega timers
        try {
          const timers = overview.automations
            ?.filter((a: any) => a.automation_target_timers && a.automation_target_timers.length > 0)
            .flatMap((a: any) => a.automation_target_timers.map((t: any) => ({
              ...t,
              automation_name: a.automation_name
            }))) || [];
          this.hubTimers.set(timers);
        } catch (e) { console.error('Error loading timers', e); }

        // Carrega dispositivos disponiveis (nao em cenarios)
        this.api.getAvailableDevices().subscribe({
          next: (devices) => {
            this.availableDevices.set(devices.map(d => ({
              device_id: d.device_id,
              name: d.device_name,
              status: d.ip_address || 'Dispositivo',
              state: d.device_state ? 'on' : 'off',
            })) || []);
          },
          error: () => { }
        });

        // Sincroniza estado do eco mode com dispositivos Shelly
        this.syncEcoModeState();
      },
      error: () => {
        this.backendError.set('Verifique se o servidor Back-End está ativo');
      }
    });
  }

  // Sincroniza estado do eco mode consultando dispositivos Shelly
  private async syncEcoModeState() {
    const shellyDevices = this.hubDevices().filter((d: any) => d.device_type === 'shelly' && d.ip_address);

    if (shellyDevices.length === 0) {
      console.log('[UI] Nenhum dispositivo Shelly encontrado, mantendo modo padrão');
      return;
    }

    console.log('[UI] Sincronizando estado do eco mode com', shellyDevices.length, 'dispositivos Shelly');

    // Consulta estado de eco mode de cada dispositivo
    const ecoModeStates: boolean[] = [];

    for (const device of shellyDevices) {
      try {
        const response: any = await this.api.getEcoModeStatus(device.ip_address).toPromise();
        const isEcoModeActive = response?.ecoMode || false;
        ecoModeStates.push(isEcoModeActive);
        console.log(`[UI] Dispositivo ${device.ip_address}: eco mode = ${isEcoModeActive}`);
      } catch (error) {
        console.error(`[UI] Erro ao consultar eco mode de ${device.ip_address}:`, error);
        // Em erro assume que nao esta em eco mode
        ecoModeStates.push(false);
      }
    }

    // Se todos estao em eco mode define 'saving'
    // Se nenhum esta em eco mode define 'balanced'
    // Se misto mantem estado atual ou define 'balanced'
    const allInEcoMode = ecoModeStates.every(state => state === true);
    const noneInEcoMode = ecoModeStates.every(state => state === false);

    if (allInEcoMode) {
      this.selectedEnergyMode.set('saving');
      console.log('[UI] Todos os dispositivos em eco mode, definindo UI como "saving"');
    } else if (noneInEcoMode) {
      this.selectedEnergyMode.set('balanced');
      console.log('[UI] Nenhum dispositivo em eco mode, definindo UI como "balanced"');
    } else {
      // Estados mistos mantem estado atual ou define balanced
      console.log('[UI] Estados mistos de eco mode, mantendo estado atual');
    }
  }

  private async pollEcoModeAfterReboot(
    ip: string,
    expected: boolean,
    maxAttempts = 25,
    delayMs = 1500,
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response: any = await this.api.getEcoModeStatus(ip).toPromise();
        const isEcoModeActive = !!response?.ecoMode;
        if (isEcoModeActive === expected) return isEcoModeActive;
      } catch {
        // Durante reboot e normal falhar
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    // Timeout devolve estado atual se possivel ou assume false
    try {
      const response: any = await this.api.getEcoModeStatus(ip).toPromise();
      return !!response?.ecoMode;
    } catch {
      return false;
    }
  }

  private async waitForRebootCycle(ip: string, delayMs = 1500): Promise<boolean> {
    // Tenta observar dispositivo a ficar offline (pode nao acontecer)
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const res: any = await this.api.shellyPing(ip).toPromise();
        const ok = res?.ok === true;
        if (!ok) break;
      } catch {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Depois aguarda ate voltar a responder
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        const res: any = await this.api.shellyPing(ip).toPromise();
        if (res?.ok === true) return true;
      } catch {
        // Durante reboot pode falhar
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return false;
  }

  protected toggleMode(nextMode: 'basic' | 'advanced') {
    this.mode.set(nextMode);
  }

  protected async selectEnergyMode(value: string) {
    console.log('[UI] Alterando modo de energia para:', value);

    // Atualiza UI de imediato para feedback visual
    this.selectedEnergyMode.set(value);

    // Encontra todos os dispositivos Shelly ligados
    const shellyDevices = this.hubDevices().filter((d: any) => d.device_type === 'shelly' && d.ip_address);

    if (shellyDevices.length === 0) {
      console.warn('[UI] Nenhum dispositivo Shelly encontrado para controle de eco mode');
      return;
    }

    const restartRequiredIps: string[] = [];

    // Para cada Shelly ativa ou desativa eco mode
    const promises = shellyDevices.map(async (device: any) => {
      const ip = device.ip_address;
      console.log(`[UI] ${value === 'saving' ? 'Ativando' : 'Desativando'} eco mode no dispositivo ${ip}`);

      try {
        if (value === 'saving') {
          // Ativa eco mode (desliga LED)
          const res: any = await this.api.enableEcoMode(ip).toPromise();
          if (res?.restart_required === true) restartRequiredIps.push(ip);
          console.log(`[UI] Eco mode ativado com sucesso em ${ip}`);
        } else {
          // Desativa eco mode (liga LED)
          const res: any = await this.api.disableEcoMode(ip).toPromise();
          if (res?.restart_required === true) restartRequiredIps.push(ip);
          console.log(`[UI] Eco mode desativado com sucesso em ${ip}`);
        }
      } catch (error) {
        console.error(`[UI] Erro ao alterar eco mode em ${ip}:`, error);
        // Nao lança erro para nao interromper outras operacoes
      }
    });

    // Aguarda operacoes terminarem
    await Promise.allSettled(promises);

    // Se algum precisa reboot pede permissao ao utilizador
    if (restartRequiredIps.length > 0) {
      this.ecoRestartIps.set(Array.from(new Set(restartRequiredIps)));
      this.ecoRestartTargetMode.set(value === 'saving' ? 'saving' : 'balanced');
      this.ecoRestartOpen.set(true);
      return;
    }

    // Sincroniza estado real dos dispositivos apos operacoes
    setTimeout(() => {
      this.syncEcoModeState();
      console.log('[UI] Modo de energia alterado para:', value);
    }, 1000);
  }

  protected cancelEcoRestart() {
    this.ecoRestartOpen.set(false);
    this.ecoRestartBusy.set(false);
    this.ecoRestartIps.set([]);
    // Re-sincroniza para refletir estado real (user nao reiniciou)
    this.syncEcoModeState();
  }

  protected async confirmEcoRestart() {
    const ips = this.ecoRestartIps();
    if (!ips || ips.length === 0) return this.cancelEcoRestart();

    const expected = this.ecoRestartTargetMode() === 'saving';

    this.ecoRestartBusy.set(true);

    try {
      // Reinicia dispositivos
      for (const ip of ips) {
        try {
          await this.api.rebootShelly(ip).toPromise();
        } catch (err) {
          console.error(`[UI] Falha ao pedir reboot ao Shelly ${ip}:`, err);
        }
      }

      // Aguarda ciclo de reboot (offline/online)
      for (const ip of ips) {
        const backOnline = await this.waitForRebootCycle(ip);
        console.log(`[UI] Pós-reboot ${ip}: backOnline=${backOnline}`);
      }

      // Aguarda e consulta estado eco apos reboot
      for (const ip of ips) {
        const eco = await this.pollEcoModeAfterReboot(ip, expected);
        console.log(`[UI] Pós-reboot ${ip}: ecoMode=${eco}`);
      }
    } finally {
      this.ecoRestartBusy.set(false);
      this.ecoRestartOpen.set(false);
      this.ecoRestartIps.set([]);
      // Atualiza UI com estado real
      await this.syncEcoModeState();
    }
  }

  public activeScenarios = computed(() =>
    this.scenarios.map(s => ({
      ...s,
      stateClass:
        s.state === 'active' ? 'state-active' : s.state === 'waiting' ? 'state-idle' : 'state-off'
    }))
  );

  toggleDarkMode() {
    this.isDarkMode.set(!this.isDarkMode());

    if (!this.isDarkMode()) {
      document.body.classList.add('darkmode');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.body.classList.remove('darkmode');
      document.documentElement.style.colorScheme = 'light';
    }
  }

  loadUserLanguage(){
    if(!this.currentUser?.preferred_language) return;
    const langMap = {
      'pt-PT': 'pt',
      'en-US': 'en',
    } as const;
    const lang = langMap[this.currentUser?.preferred_language as 'pt-PT' | 'en-US'] ?? 'pt';
    this.translate.setLanguage(lang);
  }

  toggleLanguage() {
    const next = this.translate.getLanguage() === 'pt' ? 'en' : 'pt';
    this.translate.setLanguage(next);

    if (!this.currentUser) return;
    const preferred_language: 'pt-PT' | 'en-US' = next === 'pt' ? 'pt-PT' : 'en-US';
    const payload = { preferred_language };

    this.userApi.updateMe(this.currentUser.id, payload).subscribe({
      next: (res) => {
        console.log('Language Update Successful ', res);
      },
      error: (err) => {
        console.log('Language Not Updated ', err);
      }
    });
  }

  t(key: string) {
    return this.translate.t(key);
  }
  protected async openSettings() {
    this.modalUser.set(this.currentUser);
    this.settingsOpen.set(true);

  }

  protected closeSettings() {
    this.settingsOpen.set(false);
  }

  protected openTutorial(mode?: TutorialMode) {
    const chosenMode = mode ?? this.mode();
    this.tutorialMode.set(chosenMode);
    this.tutorialStep.set(0);
    this.tutorialDirection.set('forward');
    this.flipAnimationKey();
    this.tutorialOpen.set(true);
  }

  protected closeTutorial() {
    this.tutorialOpen.set(false);
  }

  protected nextTutorialStep() {
    const { index, total } = this.tutorialProgress();
    if (index >= total - 1) {
      this.closeTutorial();
      return;
    }
    this.tutorialDirection.set('forward');
    this.tutorialStep.update(value => value + 1);
    this.flipAnimationKey();
  }

  protected prevTutorialStep() {
    if (this.tutorialStep() === 0) return;
    this.tutorialDirection.set('backward');
    this.tutorialStep.update(value => value - 1);
    this.flipAnimationKey();
  }

  private flipAnimationKey() {
    this.tutorialAnimFlip.update(value => !value);
  }

  // Abre modal de adicionar dispositivo
  protected openAddDevice() {
    this.addDeviceOpen.set(true);
    this.newDeviceScenarioId.set(null);
    this.newDeviceIp.set(''); // Limpa IP anterior
    this.newDeviceName.set(''); // Limpa nome anterior
    this.newDeviceStatus.set(''); // Limpa descricao anterior
    this.addDeviceError.set(''); // Limpa erros anteriores
    this.deviceCheckStatus.set('');
    this.discoveredDevices.set([]);

    // Obtem IPs dos dispositivos ja adicionados na BD
    const existingIps = new Set(
      this.hubDevices()
        .filter((d: any) => d.ip_address)
        .map((d: any) => d.ip_address)
    );

    console.log('[UI] Dispositivos já adicionados - IPs:', [...existingIps]);

    // Busca mDNS e filtra dispositivos ja adicionados
    this.api.getDiscoveredDevices().subscribe({
      next: (list) => {
        console.log('[UI] mdns encontrados (todos)', list);
        // Filtra dispositivos que ja existem (por IP)
        const filtered = (list || []).filter((d: any) => {
          const ip = d.addresses?.[0] || d.ip;
          return !existingIps.has(ip);
        });
        console.log('[UI] mdns após filtro', filtered);
        this.discoveredDevices.set(filtered);
      },
      error: (err) => {
        console.error('[UI] erro mdns', err);
        this.discoveredDevices.set([]);
      }
    });
  }

  protected closeAddDevice() {
    this.addDeviceOpen.set(false);
    this.newDeviceName.set('');
    this.newDeviceStatus.set('');
    this.newDeviceScenarioId.set(null);
    this.addDeviceError.set('');
    this.deviceCheckStatus.set('');
  }

  protected setNewDeviceName(value: string) {
    this.newDeviceName.set(value);
  }

  protected setNewDeviceStatus(value: string) {
    this.newDeviceStatus.set(value);
  }

  protected setNewDeviceIp(value: string) { this.newDeviceIp.set(value); }
  protected setNewDeviceIsShelly(value: boolean) { this.newDeviceIsShelly.set(value); }
  protected setNewDeviceScenarioId(value: number | null) { this.newDeviceScenarioId.set(value); }

  protected addDiscoveredDevice(device: any) {
    // Define detalhes do dispositivo descoberto
    this.newDeviceName.set(device.name || device.hostname || 'Dispositivo Descoberto');
    this.newDeviceIp.set(device.addresses?.[0] || device.ip || '');
    this.newDeviceStatus.set(device.type || 'Dispositivo descoberto via mDNS');
    // Inicia processo de adicionar dispositivo
    this.addDevice();
  }

  protected addDevice() {
    const name = this.newDeviceName().trim();
    if (!name) {
      this.addDeviceError.set('O nome do dispositivo é obrigatório!');
      return;
    }

    const ip = this.newDeviceIp().trim();

    // IP e obrigatorio; pode ser manual ou via lista mDNS
    if (!ip) {
      this.addDeviceError.set('O endereço IP é obrigatório!\n\nPode adicionar manualmente ou selecionar da lista de dispositivos mDNS.');
      return;
    }

    const payload: any = { device_name: name, device_description: this.newDeviceStatus() };
    payload.ip_address = ip;
    if (this.newDeviceScenarioId()) payload.scenary_id = this.newDeviceScenarioId();

    console.log('[MENSORA] A adicionar dispositivo:', { name, ip });

    // Verifica se IP ja existe na BD
    const existingDevice = this.hubDevices().find((d: any) => d.ip_address === ip);
    if (existingDevice) {
      this.addDeviceError.set(`⚠️ Já existe um dispositivo com o IP ${ip}: "${existingDevice.device_name}"`);
      return;
    }

    // Limpa erro anterior se validacao ok
    this.addDeviceError.set('');

    // Verifica se e Shelly
    this.deviceCheckStatus.set('A verificar Shelly...');
    console.log('[MENSORA] A verificar IP:', ip);

    this.api.shellyPing(ip).pipe(catchError(err => {
      console.log('[MENSORA] Erro Shelly ping:', err);
      return of({ ok: false, error: true });
    })).subscribe({
      next: (result: any) => {
        console.log('[MENSORA] Resultado Shelly:', result);

        const isShelly = result?.ok === true;

        if (isShelly) {
          payload.device_type = 'shelly';
          this.deviceCheckStatus.set('SHELLY detetado!');
          console.log('[MENSORA] SHELLY DETETADO:', ip);
        } else {
          this.deviceCheckStatus.set('Dispositivo generico');
          console.log('[MENSORA] Tipo nao detetado, dispositivo generico');
        }

        this.createDeviceAndClose(payload, name);
      },
      error: (err) => {
        console.error('[MENSORA] Erro na verificacao:', err);
        this.deviceCheckStatus.set('Erro na verificacao');
        this.createDeviceAndClose(payload, name);
      }
    });
  }

  // Cria dispositivo e fecha modal
  private createDeviceAndClose(payload: any, name: string) {
    console.log('[MENSORA] A criar dispositivo:', payload);
    this.basicDevices.push({ name, status: payload.device_description || 'Dispositivo', state: 'off' });
    this.deviceCheckStatus.set('');
    this.closeAddDevice();
    this.api.createDevice(payload).subscribe({
      next: () => {
        console.log('[MENSORA] Dispositivo criado com sucesso:', payload.device_type || 'generico');
        this.loadOverview();
      },
      error: (err) => {
        console.error('[MENSORA] Erro ao criar dispositivo:', err);
      }
    });
  }

  // Testa Shelly
  protected testShelly(ip: string) {
    if (!ip) return;
    this.api.shellyPing(ip).subscribe({
      next: (res: any) => {
        console.log('[UI] shelly ping', ip, res);
        alert('Ping ' + ip + ' => ' + res?.ok);
      },
      error: (err) => {
        console.error('[UI] erro shelly', err);
        alert('Erro ao testar Shelly');
      }
    });
  }

  protected openRemoveDevice() {
    if (this.selectedDeviceIds().size === 0) return;
    this.removeDeviceOpen.set(true);
  }

  protected selectDevice(id?: number) {
    if (!id) return;
    const current = this.selectedDeviceIds();
    const newSet = new Set(current);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      // Limpa selecao de cenarios ao selecionar dispositivo
      this.selectedScenarioNames.set(new Set());
    }
    this.selectedDeviceIds.set(newSet);
  }

  protected isDeviceSelected(id?: number): boolean {
    if (!id) return false;
    return this.selectedDeviceIds().has(id);
  }

  protected openEditForSelected() {
    const ids = this.selectedDeviceIds();
    if (ids.size !== 1) return;
    const id = Array.from(ids)[0];
    const device = this.hubDevices().find((d: any) => d.device_id === id);
    if (!device) return;

    this.editName.set(device.device_name || '');
    this.editDescription.set(device.device_description || '');
    this.editIp.set(device.ip_address || '');
    this.editScenarioId.set(device.scenary_id || null);
    this.editDeviceType.set(device.device_type || '');
    this.editOpen.set(true);
  }

  protected closeEdit() {
    this.editOpen.set(false);
    this.editName.set('');
    this.editDescription.set('');
    this.editIp.set('');
    this.editScenarioId.set(null);
    this.editDeviceType.set('');
  }

  protected setEditScenarioId(value: number | null) {
    this.editScenarioId.set(value);
  }

  protected saveEdit() {
    const ids = this.selectedDeviceIds();
    if (ids.size !== 1) return;
    const id = Array.from(ids)[0];

    const payload: any = {
      device_name: this.editName(),
      device_description: this.editDescription()
    };

    if (this.editScenarioId() !== null) {
      payload.scenary_id = this.editScenarioId();
    }

    console.log('[MENSORA] Updating device:', id, 'with payload:', payload);

    this.api.updateDevice(id, payload).subscribe({
      next: (response) => {
        console.log('[MENSORA] Device updated successfully:', response);
        this.loadOverview();
        this.closeEdit();
      },
      error: (error) => {
        console.error('[MENSORA] Error updating device:', error);
        alert('Erro ao atualizar dispositivo: ' + (error?.error?.message || error?.message || 'Erro desconhecido'));
      }
    });
  }

  protected confirmRemoveDevice() {
    const ids = Array.from(this.selectedDeviceIds());
    if (ids.length === 0) return;

    // Remove todos em paralelo e espera terminarem
    const removeObservables = ids.map(id =>
      this.api.removeDevice(id).pipe(catchError(() => of(null)))
    );

    forkJoin(removeObservables).subscribe({
      next: () => {
        console.log('[MENSORA] Dispositivos removidos:', ids);
        this.selectedDeviceIds.set(new Set());
        this.loadOverview();
        this.closeRemoveDevice();
      },
      error: () => {
        this.selectedDeviceIds.set(new Set());
        this.loadOverview();
        this.closeRemoveDevice();
      }
    });
  }

  protected closeRemoveDevice() {
    this.removeDeviceOpen.set(false);
  }

  openBasicTimer() {
    this.modalAdvanced.set(false);
    this.openAddTimer();
  }

  openAdvancedTimer() {
    this.modalAdvanced.set(true);
    setTimeout(() => {
      this.openAddTimer();
    });
  }

  protected openAddTimer() {
    this.addTimerOpen.set(true);
  }

  protected closeAddTimer() {
    this.addTimerOpen.set(false);
  }

  protected setNewTimerName(v: string) { this.newTimerName.set(v); }
  protected setNewTimerStart(v: string) { this.newTimerStart.set(v); }
  protected setNewTimerEnd(v: string) { this.newTimerEnd.set(v); }
  protected setNewTimerValue(v: string) { this.newTimerValue.set(+v); }
  protected setNewTimerUnit(v: 'seconds' | 'minutes' | 'hours') { this.newTimerIntervalUnit.set(v); }
  protected setTimerNewWeekdays(v: string) { this.newTimerWeekdays.set(v); }
  protected setTimerNewIFTTT(v: 'ON' | 'OFF') { this.newTimerIFTTT.set(v); }
  protected setTimerNewIFTTT_Trigger(v: string) { this.newTimerIFTTT_Trigger.set(+v); }
  protected setTimerNewIFTTTAction(v: 'ON' | 'OFF') { this.newTimerIFTTTAction.set(v); }
  protected setTimerNewActive(v: boolean) { this.newTimerActive.set(v); }

  selectedDevice: DeviceZone | null = null;
  selectedScenary: Scenario | null = null;

  protected createTimer() {
    const name = this.newTimerName().trim();
    if (!name) return this.closeAddTimer();

    this.api.createAutomation({
      automation_name: name,
      start_time: this.newTimerStart() || undefined,
      end_time: this.newTimerEnd() || undefined,
      interval_value: this.newTimerValue() ?? 0,
      interval_unit: this.newTimerIntervalUnit() ?? 'seconds',
      weekday: this.newTimerWeekdays() || undefined,
      IFTTT: this.newTimerIFTTT() ?? 'OFF',
      IFTTT_trigger: this.newTimerIFTTT_Trigger() || undefined,
      IFTTT_action: this.newTimerIFTTTAction() ?? 'OFF',
      active: this.newTimerActive(),
    }).subscribe({
      next: (auto) => {
        this.loadOverview();
        this.closeAddTimer();

        if (auto) {

          const automationId = auto.automation_id;
          this.selectedAutomationId.set(automationId);
          const scheduleEnabled = !!auto.active;

          if (this.selectedDevice != null) {

            const deviceId = this.selectedDevice?.device_id!;
            const deviceIp: string = String(this.selectedDevice?.ip_address ?? '');

            this.createAutomationTarget("device", automationId, deviceId, deviceIp, scheduleEnabled);

          } else if (this.selectedScenary != null) {

            const scenaryId = this.selectedScenary?.id!;

            this.createAutomationTarget("scenary", automationId, scenaryId, "0", scheduleEnabled);

          }
        }
      },
      error: () => { this.closeAddTimer(); }
    });
  }

  protected closeAutomations() {
    this.automationsOpen.set(false);
  }

  protected toggleSystem() {
    const newState = !this.systemOn();
    // Atualiza UI apos resposta do backend
    this.api.setSystem({ active: newState, mode: this.selectedEnergyMode() }).subscribe({
      next: () => {
        // Recarrega overview para obter estado real do sistema
        this.loadOverview();
      },
      error: (err) => {
        this.backendError.set('Erro ao atualizar estado do sistema.');
      }
    });
  }

  protected setNewAutomationName(v: string) { this.newAutomationName.set(v); }
  protected setNewAutomationStart(v: string) { this.newAutomationStart.set(v); }
  protected setNewAutomationEnd(v: string) { this.newAutomationEnd.set(v); }
  protected setNewIntervalValue(v: string) { this.newIntervalValue.set(+v); }
  protected setNewIntervalUnit(v: 'seconds' | 'minutes' | 'hours') { this.newIntervalUnit.set(v); }
  protected setNewWeekdays(v: string) { this.newWeekdays.set(v); }
  protected setNewIFTTT(v: 'ON' | 'OFF') { this.newIFTTT.set(v); }
  protected setNewIFTTT_Trigger(v: string) { this.newIFTTT_Trigger.set(+v); }
  protected setNewIFTTTAction(v: 'ON' | 'OFF') { this.newIFTTTAction.set(v); }
  protected setNewAutomationActive(v: boolean) { this.newAutomationActive.set(v); }

  public createAutomation() {

    const name = this.newAutomationName().trim();

    if (!name) return this.closeAutomations();

    this.api.createAutomation({
      automation_name: name,
      start_time: this.newAutomationStart() || undefined,
      end_time: this.newAutomationEnd() || undefined,
      interval_value: this.newIntervalValue() ?? 0,
      interval_unit: this.newIntervalUnit() ?? 'seconds',
      weekday: this.newWeekdays() ?? undefined,
      IFTTT: this.newIFTTT() ?? 'OFF',
      IFTTT_trigger: this.newIFTTT_Trigger() ?? undefined,
      IFTTT_action: this.newIFTTTAction() ?? 'OFF',
      active: this.newAutomationActive(),
    }).subscribe({
      next: (auto) => {
        this.loadOverview();
        this.closeAutomations();
        if (auto.active) {
          this.selectedAutomationId.set(auto.automation_id);
          this.openTargetPopup();
        }
      },
      error: () => { this.closeAutomations(); }
    });
  }

  protected openTargetPopup() { this.targetsOpen.set(true); }
  protected closeTargetPopup() { this.targetsOpen.set(false); }
  protected closeTargetPopupForce() {
    const automationId = this.selectedAutomationId();

    this.closeTargetPopup();

    if (!automationId) return;

    const automation = this.automations()?.find(a => a.automation_id === automationId);
    if (!automation) return;

    if (automation.active && (!automation.targets || automation.targets.length === 0)) {
      this.api.updateAutomationState(automationId, false).subscribe({
        next: () => this.loadOverview(),
        error: () => { }
      });
    }
  }
  protected setNewTargetType(v: 'device' | 'scenary' | undefined) { this.newTargetType.set(v); }
  protected setNewTargetDeviceId(id: number) { this.newTargetDeviceId.set(id); }
  protected setNewTargetScenaryId(id: number) { this.newTargetScenaryId.set(id); }
  protected setNewAutomationId(id: number) { this.selectedAutomationId.set(id) };

  protected async createAutomationTarget(
    type: 'device' | 'scenary',
    automationId: number,
    typeId: number,
    deviceIp?: string,
    scheduleEnabled: boolean = true,
  ) {

    try {
      const payload = {
        automation_id: automationId,
        target_type: type,
        device_id: type === 'device' ? typeId : undefined,
        scenary_id: type === 'scenary' ? typeId : undefined,
      };

      const target: any = await this.api.createAutomationTarget(payload).toPromise();
      const automationTargetId = target.target_id;
      this.selectedAutomationTargetId.set(automationTargetId);

      if (type === 'device') {
        await this.handleDeviceTimers(automationTargetId, typeId, deviceIp!, scheduleEnabled);
      }

      if (type === 'scenary') {
        const devices: any[] = (await this.api.getDevicesByScenaryId(typeId).toPromise()) || [];

        for (const device of devices) {
          const ip = device.d_ip_address;
          const deviceId = device.d_device_id;

          await this.handleDeviceTimers(automationTargetId, deviceId, ip, scheduleEnabled);
        }
      }

      this.closeTargetPopup();
      this.loadOverview();

    } catch (err) {
      console.error('Error creating automation target:', err);
      this.closeTargetPopup();
    }
  }

  private async handleDeviceTimers(
    automationTargetId: number,
    typeId: number,
    deviceIp: string,
    scheduleEnabled: boolean,
  ) {

    const selectedDaysStr = this.newTimerWeekdays();
    let days: number[];

    if (selectedDaysStr && selectedDaysStr.length > 0) {

      days = selectedDaysStr.split(',').map(s => +s.trim());

    } else {

      days = [0, 1, 2, 3, 4, 5, 6];

    }

    if (this.newTimerValue() == undefined && this.newTimerStart() == null && this.newTimerEnd() == null) {
      const timerId = await this.createShellyTimer(deviceIp, 10, 0, days, scheduleEnabled);
      this.createAutomationTargetTimer(automationTargetId, timerId, typeId);

    } else if (this.newTimerValue() == undefined) {
      const startTime = this.newTimerStart();
      const endTime = this.newTimerEnd();

      if (!startTime || !endTime) {
        console.error("Start or end time is null");
        return;
      }

      const { hour: startHour, minute: startMinute } = this.parseHourMinute(startTime);
      const { hour: endHour, minute: endMinute } = this.parseHourMinute(endTime);

      const startTimerId = await this.createShellyTimer(deviceIp, startHour, startMinute, days, scheduleEnabled);
      this.createAutomationTargetTimer(automationTargetId, startTimerId, typeId);

      const endTimerId = await this.createShellyTimerOff(deviceIp, endHour, endMinute, days, scheduleEnabled);
      this.createAutomationTargetTimer(automationTargetId, endTimerId, typeId);

    } else {
      let intervalValueInSeconds = this.newTimerValue() ?? 0;
      if (this.newTimerIntervalUnit() !== 'seconds') {
        intervalValueInSeconds = this.transformToSeconds(this.newTimerValue() ?? 0, this.newTimerIntervalUnit());
      }

      await this.createShellyTimerInterval(deviceIp, intervalValueInSeconds);
    }
  }

  protected parseHourMinute(time: string): { hour: number; minute: number } {
    const [hourStr, minuteStr] = time.split(':');
    return {
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10)
    };
  }

  protected transformToSeconds(value: number, unit: 'seconds' | 'minutes' | 'hours'): number {
    switch (unit) {
      case 'seconds':
        return value;
      case 'minutes':
        return value * 60;
      case 'hours':
        return value * 3600;
      default:
        return value;
    }
  }

  protected async createShellyTimerInterval(deviceIp: string, toggleAfter: number): Promise<void> {
    const payload = { ip: deviceIp, toggleAfter };

    try {
      const response = await this.api.shellyTimerOnInterval(payload).toPromise();
      console.log('Shelly interval timer set successfully', response);
    } catch (err) {
      console.error('Error creating Shelly interval timer:', err);
      throw err;
    }
  }

  protected async createShellyTimer(deviceIp: string, hour: number, minute: number, days: number[], enable: boolean) {
    const payload = { ip: deviceIp, hour, minute, days, enable };

    try {
      const response: any = await this.api.shellyTimerOn(payload).toPromise();
      console.log('Timer set successfully', response);

      const timerId = response.onTimer.id;
      return timerId;
    } catch (err) {
      console.error('Error setting timer', err);
      throw err;
    }
  }

  protected async createShellyTimerOff(deviceIp: string, hour: number, minute: number, days: number[], enable: boolean) {
    const payload = { ip: deviceIp, hour, minute, days, enable };

    try {
      const response: any = await this.api.shellyTimerOff(payload).toPromise();
      console.log('Timer set successfully', response);

      const timerId = response.offTimer.id;
      return timerId;
    } catch (err) {
      console.error('Error setting timer', err);
      throw err;
    }
  }


  protected onAutomationToggle(event: { id: number; active: boolean }) {
    const { id, active } = event;

    this.api.updateAutomationState(id, active).subscribe({
      next: () => {
        this.loadOverview();
      },
      error: () => { }
    });
  }

  protected setNewTargetTimerId(v: number) { this.newTargetTimerId.set(v); }
  protected setNewTargetTimerDeviceId(v: number) { this.newTargetTimerDeviceId.set(v); }

  protected createAutomationTargetTimer(automationTargetId: number, timerId: number, deviceId: number) {

    const payload = {
      target_id: automationTargetId,
      timer_id: timerId,
      device_id: deviceId,
    };

    this.api.createAutomationTargetTimer(payload).subscribe({
      next: () => {
        this.loadOverview();
        this.closeTargetPopup(); // TODO: criar metodo closeTimerPopup()
      },
      error: () => { }
    });
  }

  protected removeAutomationTargetTime(attId: number) {
    this.api.deleteAutomationTargetTime(attId).subscribe({
      next: () => this.loadOverview(),
      error: () => { }
    });
  }

  protected openViewHistory() {
    this.viewHistoryOpen.set(true);
    this.api.consumptionHistory().subscribe({
      next: data => this.consumptionHistory.set(data || []),
      error: () => { }
    });
  }

  protected closeViewHistory() {
    this.viewHistoryOpen.set(false);
    this.consumptionHistory.set([]);
  }

  protected openAdvancedAnalysis() {
    this.advancedAnalysisOpen.set(true);
  }

  protected closeAdvancedAnalysis() {
    this.advancedAnalysisOpen.set(false);
  }

  protected toggleDeviceState(deviceId?: number) {
    if (!deviceId) return;

    const idx = this.basicDevices.findIndex(d => d.device_id === deviceId);
    const current = this.basicDevices[idx];
    const newState = current && current.state === 'on' ? false : true;

    this.api.setDeviceState(deviceId, newState).subscribe({
      next: () => {
        if (current) {
          this.basicDevices[idx] = { ...current, state: newState ? 'on' : 'off' };
        }
        // Controla dispositivo fisico
        try {
          const device = this.hubDevices().find((d: any) => d.device_id === deviceId);
          const ip = device?.ip_address;
          const dtype = device?.device_type;

          if (ip && dtype === 'shelly') {
            const shellyCall = newState ? this.api.shellyOn(ip) : this.api.shellyOff(ip);
            shellyCall.subscribe({
              next: () => {
                // Depois de mudar estado fisico recarrega overview para sincronizar
                setTimeout(() => this.loadOverview(), 500);
              },
              error: (err) => {
                console.error('Erro ao controlar Shelly:', err);
                // Mesmo com erro recarrega para mostrar estado real
                setTimeout(() => this.loadOverview(), 500);
              }
            });
          }
        } catch (e) {
          // Erro ao alternar dispositivo fisico
          console.error('Erro ao controlar dispositivo:', e);
          setTimeout(() => this.loadOverview(), 500);
        }
      },
      error: () => {
        this.backendError.set('Erro ao atualizar estado do dispositivo.');
        // Mesmo com erro tenta recarregar para sincronizar
        setTimeout(() => this.loadOverview(), 500);
      }
    });
  }

  // Seleciona cenario
  protected selectScenario(name: string) {
    const current = this.selectedScenarioNames();
    const newSet = new Set(current);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
      // Limpa selecao de dispositivos ao selecionar um cenario
      this.selectedDeviceIds.set(new Set());
    }
    this.selectedScenarioNames.set(newSet);
  }

  protected isScenarioSelected(name: string): boolean {
    return this.selectedScenarioNames().has(name);
  }

  protected openAddScenario() {
    this.addScenarioOpen.set(true);
    this.newScenarioName.set('');
    this.newScenarioDevices.set([]);

    // Carrega dispositivos disponiveis (nao adicionados a cenarios)
    this.api.getAvailableDevices().subscribe({
      next: (devices) => {
        console.log('[UI] Dispositivos disponíveis para cenário:', devices);
        this.availableDevicesForScenario.set(devices || []);
      },
      error: (err) => {
        console.error('[UI] Erro ao obter dispositivos disponíveis:', err);
        this.availableDevicesForScenario.set([]);
      }
    });
  }

  protected closeAddScenario() {
    this.addScenarioOpen.set(false);
    this.newScenarioName.set('');
    this.newScenarioDevices.set([]);
  }

  protected setNewScenarioName(value: string) {
    this.newScenarioName.set(value);
  }

  protected toggleScenarioDevice(deviceId?: number) {
    if (!deviceId) return;
    const current = this.newScenarioDevices();
    if (current.includes(deviceId)) {
      this.newScenarioDevices.set(current.filter(id => id !== deviceId));
    } else {
      this.newScenarioDevices.set([...current, deviceId]);
    }
  }

  protected createScenario() {
    const name = this.newScenarioName().trim();
    if (!name) return this.closeAddScenario();

    const deviceIds = this.newScenarioDevices().filter(id => id !== undefined) as number[];

    this.api.createScenario({ scenary_name: name, scenary_state: 'inactive' }).subscribe({
      next: () => {
        this.api.overview().subscribe({
          next: overview => {
            const newScenario = overview.scenaries?.find(s => s.name === name);
            if (newScenario && deviceIds.length > 0) {
              // Aguarda associacoes antes de carregar overview
              forkJoin(deviceIds.map(deviceId => this.api.addDeviceToScenario(deviceId, newScenario.id))).subscribe({
                next: () => {
                  this.loadOverview();
                  this.closeAddScenario();
                },
                error: () => {
                  this.loadOverview();
                  this.closeAddScenario();
                }
              });
            } else {
              this.loadOverview();
              this.closeAddScenario();
            }
          },
          error: () => {
            this.loadOverview();
            this.closeAddScenario();
          }
        });
      },
      error: () => {
        this.scenarios.push({ name, devices: deviceIds.length + ' dispositivos', state: 'inactive' });
        this.closeAddScenario();
      }
    });
  }

  protected openRemoveScenario() {
    if (this.selectedScenarioNames().size === 0) return;
    this.removeScenarioOpen.set(true);
  }

  protected closeRemoveScenario() {
    this.removeScenarioOpen.set(false);
  }

  protected closeRemoveAutomation() {
    this.removeAutomationOpen.set(false);
  }

  protected confirmRemoveAutomation() {
    const automationIds = Array.from(this.selectedAdvancedAutomationIds());
    if (automationIds.length === 0) return;

    // Remove automacoes em paralelo e aguarda fim
    const removeObservables = automationIds.map(id =>
      this.api.removeAutomation(id).pipe(catchError(() => of(null)))
    );

    forkJoin(removeObservables).subscribe({
      next: () => {
        console.log('[MENSORA] Automations removed:', automationIds);
        this.selectedAdvancedAutomationIds.set(new Set());
        this.loadOverview();
        this.closeRemoveAutomation();
      },
      error: () => {
        this.selectedAdvancedAutomationIds.set(new Set());
        this.loadOverview();
        this.closeRemoveAutomation();
      }
    });
  }

  protected confirmRemoveScenario() {
    // Verifica se ha cenarios avancados selecionados
    const advancedScenarioIds = Array.from(this.selectedAdvancedScenarioIds());
    if (advancedScenarioIds.length > 0) {
      // Remove cenarios avancados
      const removeObservables = advancedScenarioIds.map(id =>
        this.api.removeScenario(id).pipe(catchError(() => of(null)))
      );

      forkJoin(removeObservables).subscribe({
        next: () => {
          console.log('[MENSORA] Cenários avançados removidos:', advancedScenarioIds);
          this.selectedAdvancedScenarioIds.set(new Set());
          this.loadOverview();
          this.closeRemoveScenario();
        },
        error: () => {
          this.selectedAdvancedScenarioIds.set(new Set());
          this.loadOverview();
          this.closeRemoveScenario();
        }
      });
      return;
    }

    // Remove cenarios por nome
    const scenarioNames = Array.from(this.selectedScenarioNames());
    if (scenarioNames.length === 0) return;

    // Encontra IDs dos cenarios pelos nomes
    const scenarioIds: number[] = [];
    scenarioNames.forEach(name => {
      const scenario = this.scenarios.find(s => s.name === name);
      if (scenario && scenario.id) {
        scenarioIds.push(scenario.id);
      }
    });

    if (scenarioIds.length === 0) return;

    const removeObservables = scenarioIds.map(id =>
      this.api.removeScenario(id).pipe(catchError(() => of(null)))
    );

    forkJoin(removeObservables).subscribe({
      next: () => {
        console.log('[MENSORA] Cenários removidos:', scenarioNames);
        this.selectedScenarioNames.set(new Set());
        this.loadOverview();
        this.closeRemoveScenario();
      },
      error: () => {
        this.selectedScenarioNames.set(new Set());
        this.loadOverview();
        this.closeRemoveScenario();
      }
    });
  }

  protected onAdvancedScenarioSelect(scenarioId: number) {
    const current = this.selectedAdvancedScenarioIds();
    const newSet = new Set(current);
    if (newSet.has(scenarioId)) {
      newSet.delete(scenarioId);
    } else {
      newSet.add(scenarioId);
      // Limpa outras selecoes ao selecionar um cenario
      this.selectedAdvancedTimerIds.set(new Set());
      this.selectedAdvancedAutomationIds.set(new Set());
      this.selectedDeviceIds.set(new Set());
    }
    this.selectedAdvancedScenarioIds.set(newSet);
  }

  protected onAdvancedTimerSelect(timerId: number) {
    const current = this.selectedAdvancedTimerIds();
    const newSet = new Set(current);
    if (newSet.has(timerId)) {
      newSet.delete(timerId);
    } else {
      newSet.add(timerId);
      // Limpa outras selecoes ao selecionar um timer
      this.selectedAdvancedScenarioIds.set(new Set());
      this.selectedAdvancedAutomationIds.set(new Set());
      this.selectedDeviceIds.set(new Set());
    }
    this.selectedAdvancedTimerIds.set(newSet);
  }

  protected onAdvancedAutomationSelect(automationId: number) {
    const current = this.selectedAdvancedAutomationIds();
    const newSet = new Set(current);
    if (newSet.has(automationId)) {
      newSet.delete(automationId);
    } else {
      newSet.add(automationId);
      // Limpa outras selecoes ao selecionar uma automacao
      this.selectedAdvancedScenarioIds.set(new Set());
      this.selectedAdvancedTimerIds.set(new Set());
      this.selectedDeviceIds.set(new Set());
    }
    this.selectedAdvancedAutomationIds.set(newSet);
  }

  protected openRemoveAdvancedScenario() {
    if (this.selectedAdvancedScenarioIds().size === 0) return;
    this.removeScenarioOpen.set(true);
  }

  protected openRemoveAdvancedAutomation() {
    if (this.selectedAdvancedAutomationIds().size === 0) return;
    this.removeAutomationOpen.set(true);
  }
}
