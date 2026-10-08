/**
 * Serviço de sincronização de consumos
 * Obtém consumos em tempo real ou via polling periódico
 * Sincroniza automáticamente a cada 2 segundos para dispositivos que não têm tempo real
 * 
 * Funcionamento:
 * 1. Na inicialização, inicia polling para todos os dispositivos
 * 2. Se um dispositivo tiver suporte a tempo real, cancela polling para esse dispositivo
 * 3. Atualiza BD com consumos obtidos
 * 4. É dinâmico: novos dispositivos são automaticamente adicionados ao polling
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { ConsumptionHistory } from '../entities/consumption_history.entity';
import { ShellyService } from '../shelly/shelly.service';

interface DevicePollingState {
  device_id: number;
  timer?: NodeJS.Timeout;
  lastConsumption?: number;
  lastUpdate?: Date;
}

@Injectable()
export class SyncConsumptionService {
  private readonly logger = new Logger(SyncConsumptionService.name);
  private pollingStates: Map<number, DevicePollingState> = new Map();
  private readonly POLLING_INTERVAL = 2000; // 2 segundos
  private isInitialized = false;

  constructor(
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
    @InjectRepository(ConsumptionHistory) private readonly historyRepo: Repository<ConsumptionHistory>,
    private readonly shellyService: ShellyService,
  ) {}

  /**
   * Inicializa o serviço de sincronização
   * Começa polling para todos os dispositivos
   * Chamado uma vez na inicialização da aplicação
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('[syncConsumption] Serviço já foi inicializado');
      return;
    }

    this.logger.log('[syncConsumption] Inicializando serviço de sincronização de consumos...');
    this.isInitialized = true;

    try {
      const devices = await this.deviceRepo.find();
      
      for (const device of devices) {
        this.startPollingForDevice(device);
      }

      this.logger.log(`[syncConsumption] Sincronização iniciada para ${devices.length} dispositivo(s)`);
    } catch (error) {
      this.logger.error('[syncConsumption] Erro ao inicializar sincronização:', error);
    }
  }

  /**
   * Adiciona polling para um novo dispositivo
   * Chamado quando um dispositivo é criado
   * @param device Dispositivo a adicionar
   */
  async addDevicePolling(device: Device): Promise<void> {
    if (!this.isInitialized) {
      this.logger.debug(`[syncConsumption] Serviço não inicializado, pulando addDevicePolling`);
      return;
    }

    if (this.pollingStates.has(device.device_id)) {
      this.logger.warn(`[syncConsumption] Device ${device.device_id} já está em polling`);
      return;
    }

    this.logger.log(`[syncConsumption] Adicionando device ${device.device_id} (${device.device_name}) ao polling`);
    this.startPollingForDevice(device);
  }

  /**
   * Remove polling para um dispositivo
   * Chamado quando um dispositivo é removido
   * @param deviceId ID do dispositivo
   */
  async removeDevicePolling(deviceId: number): Promise<void> {
    const state = this.pollingStates.get(deviceId);
    
    if (!state) {
      this.logger.warn(`[syncConsumption] Device ${deviceId} não encontrado em polling`);
      return;
    }

    if (state.timer) {
      clearInterval(state.timer);
      this.logger.log(`[syncConsumption] Polling removido para device ${deviceId}`);
    }

    this.pollingStates.delete(deviceId);
  }

  /**
   * Inicia polling para um dispositivo específico
   * @param device Dispositivo
   */
  private startPollingForDevice(device: Device): void {
    const state: DevicePollingState = {
      device_id: device.device_id,
    };

    // Executa logo na primeira vez
    this.pollDeviceConsumption(device).catch((error) => {
      this.logger.error(`[syncConsumption] Erro no primeiro poll para ${device.device_name}:`, error?.message);
    });

    // Depois inicia polling periódico a cada 2 segundos
    state.timer = setInterval(() => {
      this.pollDeviceConsumption(device).catch((error) => {
        this.logger.error(`[syncConsumption] Erro ao fazer poll para ${device.device_name}:`, error?.message);
      });
    }, this.POLLING_INTERVAL);

    this.pollingStates.set(device.device_id, state);
    this.logger.debug(`[syncConsumption] Polling iniciado para ${device.device_name}`);
  }

  /**
   * Obtém consumo de um dispositivo e atualiza BD
   * Para Shelly, usa IP direto
   * @param device Dispositivo
   */
  private async pollDeviceConsumption(device: Device): Promise<void> {
    try {
      let powerConsumption: number = 0;
      let totalConsumption: number = 0;
      let operatingTime: number = 0;

      // SHELLY
      if (device.device_type === 'shelly' && device.ip_address) {
        try {
          powerConsumption = await this.shellyService.getPowerConsumption(device.ip_address);
          totalConsumption = await this.shellyService.getTotalConsumption(device.ip_address);
          operatingTime = await this.shellyService.getOperatingTime(device.ip_address);

          this.logger.debug(
            `[syncConsumption] Shelly ${device.device_name}: ${powerConsumption}W, total=${totalConsumption}Wh, time=${operatingTime}s`
          );
        } catch (error) {
          this.logger.warn(`[syncConsumption] Erro ao obter consumo Shelly ${device.device_name}:`, error?.message);
        }
      }

      // Atualiza dispositivo com consumos atuais
      if (powerConsumption > 0 || totalConsumption > 0 || operatingTime > 0) {
        device.current_consumption = powerConsumption;
        device.total_consumption = totalConsumption;
        device.total_operating_time = operatingTime;
        
        await this.deviceRepo.save(device);

        // Registra no histórico
        if (powerConsumption > 0) {
          await this.historyRepo.save({
            device: device,
            consumption: powerConsumption,
            operating_time: operatingTime,
            register_date: new Date(),
          } as Partial<ConsumptionHistory>);
        }

        // Atualiza estado de polling
        const state = this.pollingStates.get(device.device_id);
        if (state) {
          state.lastConsumption = powerConsumption;
          state.lastUpdate = new Date();
        }
      }
    } catch (error) {
      this.logger.error(`[syncConsumption] Erro ao fazer poll para ${device.device_name}:`, error?.message);
    }
  }

  /**
   * Obtém estado do polling para um dispositivo
   * @param deviceId ID do dispositivo
   * @returns Estado do polling ou undefined se não está em polling
   */
  getDevicePollingState(deviceId: number): DevicePollingState | undefined {
    return this.pollingStates.get(deviceId);
  }

  /**
   * Obtém todos os estados de polling
   * @returns Mapa de estados
   */
  getAllPollingStates(): Map<number, DevicePollingState> {
    return new Map(this.pollingStates);
  }

  /**
   * Para o serviço e limpa todos os timers
   * Chamado na shutdown
   */
  async stop(): Promise<void> {
    this.logger.log('[syncConsumption] Parando serviço de sincronização...');

    for (const [deviceId, state] of this.pollingStates.entries()) {
      if (state.timer) {
        clearInterval(state.timer);
      }
    }

    this.pollingStates.clear();
    this.isInitialized = false;
    this.logger.log('[syncConsumption] Serviço parado');
  }
}
