import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, MoreThanOrEqual } from 'typeorm';
import { Device } from '../entities/device.entity';
import { Scenary } from '../entities/scenary.entity';
import { ScenaryDevice } from '../entities/scenary_device.entity';
import { Automation } from '../entities/automation.entity';
import { ConsumptionHistory } from '../entities/consumption_history.entity';
import { ShellyService } from '../shelly/shelly.service';
import { ShellyCloudService } from '../shelly/shelly-cloud.service';
import { DiscoverIotService } from '../discover_iot/discover_iot.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { SystemStateDto } from './dto/system-state.dto';
import { UpdateScenaryStateDto } from './dto/update-scenary-state.dto';
import { CreateScenaryDto } from './dto/create-scenary.dto';
import { Automation_Target } from 'src/entities/automation_target.entity';
import { CreateAutomationTargetDto } from './dto/create-automation-target.dto';
import { CreateAutomationTargetTimerDto } from './dto/create-automation-target-timer';
import { SyncConsumptionService } from './sync-consumption.service';
import { Automation_Target_Timer } from 'src/entities/automation_target_time.entity';

@Injectable()
export class ControlService {
  constructor(
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
    @InjectRepository(Scenary)
    private readonly scenaryRepo: Repository<Scenary>,
    @InjectRepository(ScenaryDevice)
    private readonly scenaryDeviceRepo: Repository<ScenaryDevice>,
    @InjectRepository(Automation)
    private readonly automationRepo: Repository<Automation>,
    @InjectRepository(Automation_Target)
    private readonly targetRepo: Repository<Automation_Target>,
    @InjectRepository(Automation_Target_Timer)
    private readonly targetRepoTimer: Repository<Automation_Target_Timer>,
    @InjectRepository(ConsumptionHistory)
    private readonly historyRepo: Repository<ConsumptionHistory>,
    private readonly shellyService: ShellyService,
    private readonly shellyCloudService: ShellyCloudService,
    private readonly discoverService: DiscoverIotService,
    private readonly syncConsumptionService: SyncConsumptionService,
  ) {}

  async overview(userId?: number) {
    console.log(`[ControlService.overview] Called with userId: ${userId}`);
    
    // Get scenaries with joins on user relationship
    let scenariesQueryBuilder = this.scenaryRepo
      .createQueryBuilder('scenary')
      .leftJoinAndSelect('scenary.user', 'user')
      .leftJoinAndSelect('scenary.scenaryDevices', 'scenaryDevices')
      .leftJoinAndSelect('scenaryDevices.device', 'device')
      .orderBy('scenary.scenary_name', 'ASC');

    // Get devices with joins on user relationship
    let devicesQueryBuilder = this.deviceRepo
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.user', 'user')
      .orderBy('device.device_name', 'ASC');

    // If userId provided, filter by owner using user relationship
    if (userId) {
      scenariesQueryBuilder = scenariesQueryBuilder.where('scenary.user_id = :userId', { userId });
      devicesQueryBuilder = devicesQueryBuilder.where('device.user_id = :userId', { userId });
    }

    const scenaries = await scenariesQueryBuilder.getMany();
    console.log(`[ControlService.overview] Found ${scenaries.length} scenaries for user ${userId}`);

    // Force re-read from database to ensure latest state
    const devices = await devicesQueryBuilder.getMany();
    console.log(`[ControlService.overview] Found ${devices.length} devices for user ${userId}`);
    console.log(`[ControlService.overview] Devices:`, devices.map(d => ({ id: d.device_id, name: d.device_name, user_id: d.user?.user_id })));
    
    const automations = await this.automationRepo.find({
      relations: [],
    });
    const history = await this.historyRepo.find({
      order: { register_date: 'DESC' },
      take: 30,
    });

    const weeklyDistribution = this.buildWeeklyDistribution(history);
    const total = history.reduce(
      (sum, entry) => sum + Number(entry.consumption ?? 0),
      0,
    );
    const days =
      new Set(
        history.map((entry) =>
          entry.register_date?.toISOString()?.slice(0, 10),
        ),
      ).size || 1;
    const dailyAverage = total / days;

    // O sistema está ativo se PELO MENOS 1 dispositivo real está ligado
    // (device_state = true significa que está efetivamente ligado no mundo físico)
    const systemActive = devices.some((device) => device.device_state === true);

    return {
      systemActive,
      scenaries: scenaries.map((scenary) => ({
        id: scenary.scenary_id,
        name: scenary.scenary_name,
        description: scenary.scenary_description,
        state: scenary.scenary_state,
        devices: scenary.scenaryDevices?.map((link) => link.device),
      })),
      devices,
      automations,
      consumption: {
        total,
        dailyAverage,
        weeklyDistribution,
      },
    };
  }

  /**
   * Verifica se um utilizador é proprietário de um dispositivo
   */
  private async isDeviceOwner(deviceId: number, userId: number): Promise<boolean> {
    const device = await this.deviceRepo.findOne({
      where: { device_id: deviceId },
      relations: ['user'],
    });
    return device?.user?.user_id === userId;
  }

  /**
   * Verifica se um utilizador é proprietário de um cenário
   */
  private async isScenaryOwner(scenaryId: number, userId: number): Promise<boolean> {
    const scenary = await this.scenaryRepo.findOne({
      where: { scenary_id: scenaryId },
      relations: ['user'],
    });
    return scenary?.user?.user_id === userId;
  }

  /**
   * Sincroniza o estado real de todos os dispositivos
   * Consulta o estado físico de cada dispositivo e atualiza a BD
   * Chamado na inicialização do sistema e pelo polling periódico
   */
  async syncDeviceStates() {
    console.log(`[syncDeviceStates] Iniciando sincronização de estados...`);
    const allDevices = await this.deviceRepo
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.user', 'user')
      .getMany();

    const changedDeviceIds: number[] = [];

    for (const device of allDevices) {
      console.log(`[syncDeviceStates] Verificando dispositivo ${device.device_name} (ID: ${device.device_id}): estado atual = ${device.device_state}`);
      let realState: boolean | null = null;

      // Shelly
      if (device.device_type === 'shelly' && device.ip_address) {
        try {
          console.log(`[syncDeviceStates] Sincronizando Shelly ${device.device_name} @ ${device.ip_address}`);
          realState = await this.shellyService.getStatus(device.ip_address);
          console.log(`[syncDeviceStates] Shelly ${device.device_name} state: ${realState}`);
        } catch (e) {
          console.warn(`[syncDeviceStates] Erro ao obter estado Shelly local ${device.device_name}, tentando Cloud...`, e?.message);
          try {
            realState = await this.shellyCloudService.getStatus(device.device_id?.toString());
            console.log(`[syncDeviceStates] Shelly Cloud ${device.device_name} state: ${realState}`);
          } catch (cloudError) {
            console.error(`[syncDeviceStates] Erro também na cloud para ${device.device_name}:`, cloudError?.message);
          }
        }
      }

      // Atualiza BD se conseguiu obter estado E se o estado mudou
      if (realState !== null && realState !== device.device_state) {
        console.log(`[syncDeviceStates] Atualizando ${device.device_name}: ${device.device_state} -> ${realState}`);
        device.device_state = realState;
        await this.deviceRepo.save(device);
        changedDeviceIds.push(device.device_id);
      } else if (realState === null) {
        console.log(`[syncDeviceStates] Não foi possível obter estado real para ${device.device_name}`);
      } else {
        console.log(`[syncDeviceStates] Estado de ${device.device_name} não mudou: ${device.device_state}`);
      }
    }

    console.log(`[syncDeviceStates] Sincronização concluída. ${changedDeviceIds.length} dispositivos mudaram de estado: [${changedDeviceIds.join(', ')}]`);

    // Sempre sincroniza estados dos cenários após sincronizar dispositivos
    // Isso garante que cenários reflitam corretamente o estado dos dispositivos
    console.log(`[syncDeviceStates] Sincronizando estados de todos os cenários`);
    await this.syncScenarioStates();

    return this.overview();
  }

  async getAvailableDevices(userId?: number) {
    // 1. Obter todos os IDs de dispositivos que estão associados a algum cenário
    let associatedQuery = this.scenaryDeviceRepo
      .createQueryBuilder('scenaryDevice')
      .select('scenaryDevice.device_id', 'deviceId')
      .distinct(true);

    if (userId) {
      associatedQuery = associatedQuery
        .innerJoin('scenaryDevice.scenary', 'scenary')
        .innerJoin('scenary.user', 'user')
        .where('user.user_id = :userId', { userId });
    }

    const associatedDevices = await associatedQuery.getRawMany();

    const associatedDeviceIds = associatedDevices.map(
      (item) => item.deviceId,
    );

    // 2. Obter todos os dispositivos do utilizador cujo ID não está na lista de IDs associados
    let query = this.deviceRepo
      .createQueryBuilder('device')
      .leftJoin('device.user', 'user')
      .where('user.user_id = :userId', { userId });

    if (associatedDeviceIds.length > 0) {
      query = query.andWhere('device.device_id NOT IN (:...ids)', {
        ids: associatedDeviceIds,
      });
    }

    const availableDevices = await query
      .orderBy('device.device_name', 'ASC')
      .getMany();

    return availableDevices;
  }

  async getAllDevicesByUser(userId: number) {
    const userDevices = await this.deviceRepo
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.user', 'user')
      .where('device.user_id = :userId', { userId })
      .select(['device.device_name', 'device.ip_address', 'device.device_id', 'user.user_id'])
      .orderBy('device.device_name', 'ASC')
      .getMany();
    return userDevices;
  }

  /**
   * Retorna apenas os dispositivos do utilizador que ainda NÃO estão associados a nenhum cenário
   * (ou seja, dispositivos disponíveis para adicionar a um novo cenário)
   */
  async getAvailableDevicesByUser(userId: number) {
    // 1. Obter todos os IDs de dispositivos que estão associados a algum cenário DO UTILIZADOR
    const associatedDevices = await this.scenaryDeviceRepo
      .createQueryBuilder('scenaryDevice')
      .innerJoin('scenaryDevice.scenary', 'scenary')
      .innerJoin('scenary.user', 'user')
      .where('user.user_id = :userId', { userId })
      .select('scenaryDevice.device_id', 'deviceId')
      .distinct(true)
      .getRawMany();

    const associatedDeviceIds = associatedDevices.map((item) => item.deviceId);

    // 2. Obter todos os dispositivos do utilizador cujo ID não está na lista de IDs associados
    let query = this.deviceRepo
      .createQueryBuilder('device')
      .leftJoin('device.user', 'user')
      .where('user.user_id = :userId', { userId });

    if (associatedDeviceIds.length > 0) {
      query = query.andWhere('device.device_id NOT IN (:...ids)', {
        ids: associatedDeviceIds,
      });
    }

    const availableDevices = await query
      .select([
        'device.device_id',
        'device.device_name',
        'device.ip_address',
        'device.device_state',
      ])
      .orderBy('device.device_name', 'ASC')
      .getMany();

    return availableDevices;
  }

  async getAllScenariesByUser(userId: number) {
    const userScenaries = await this.scenaryRepo
      .createQueryBuilder('scenary')
      .leftJoinAndSelect('scenary.user', 'user')
      .where('scenary.user_id = :userId', { userId })
      .select(['scenary.scenary_name', 'scenary.scenary_id', 'user.user_id'])
      .orderBy('scenary.scenary_name', 'ASC')
      .getMany();
    return userScenaries;
  }

  async getDevicesOfScenary(scenaryId: number) {
    const result = await this.scenaryRepo
      .createQueryBuilder('scenary')
      .innerJoinAndSelect('scenary.scenaryDevices', 'scenaryDevices')
      .innerJoinAndSelect('scenaryDevices.device', 'device')
      .innerJoinAndSelect('device.user', 'user')
      .where('scenary.scenary_id = :scenaryId', { scenaryId })
      .select(['scenary.scenary_id', 'device.device_id', 'device.ip_address', 'user.user_id'])
      .getMany();
    
    // Transform to raw format for backwards compatibility
    return result.flatMap(s => 
      s.scenaryDevices.map(sd => ({
        scenary_id: s.scenary_id,
        device_id: sd.device.device_id,
        ip_address: sd.device.ip_address
      }))
    );
  }

  // actualiza o estado global do sistema
  // esta funcao actualiza todos os cenarios e define o estado de todos os devices
  // payload.active = true  -> sistema fica ativo
  // payload.active = false -> sistema fica desativado
  async setSystemState(payload: SystemStateDto) {
    const allScenaries = await this.scenaryRepo
      .createQueryBuilder('scenary')
      .leftJoinAndSelect('scenary.user', 'user')
      .select(['scenary.scenary_id', 'user.user_id'])
      .getMany();
    const scenaryIds = allScenaries.map(s => s.scenary_id);
    if (scenaryIds.length > 0) {
      await this.scenaryRepo.update(
        { scenary_id: In(scenaryIds) },
        { scenary_state: payload.active ? 'active' : 'inactive' },
      );
    }
    const allDevices = await this.deviceRepo
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.user', 'user')
      .select(['device.device_id', 'user.user_id'])
      .getMany();
    const deviceIds = allDevices.map(d => d.device_id);

    if (payload.active && payload.mode === 'saving') {
      // Modo poupança: ativa apenas dispositivos em cenários
      const devicesInScenaries = await this.scenaryDeviceRepo
        .createQueryBuilder('scenaryDevice')
        .select('scenaryDevice.device_id')
        .getRawMany();
      const deviceIdsInScenaries = devicesInScenaries.map(item => item.device_id);

      // Liga dispositivos em cenários
      if (deviceIdsInScenaries.length > 0) {
        await this.deviceRepo.update(
          { device_id: In(deviceIdsInScenaries) },
          { device_state: true },
        );
      }

      // Desliga dispositivos não em cenários
      const deviceIdsNotInScenaries = deviceIds.filter(id => !deviceIdsInScenaries.includes(id));
      if (deviceIdsNotInScenaries.length > 0) {
        await this.deviceRepo.update(
          { device_id: In(deviceIdsNotInScenaries) },
          { device_state: false },
        );
      }
    } else {
      // Modo equilibrado ou desativado: define estado de todos os dispositivos
      if (deviceIds.length > 0) {
        await this.deviceRepo.update({ device_id: In(deviceIds) }, { device_state: payload.active });
      }
    }

    const allDevicesFull = await this.deviceRepo
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.user', 'user')
      .getMany();
    console.log(`[setSystemState] Found ${allDevicesFull.length} devices at ${new Date().toISOString()}`);
    for (const device of allDevicesFull) {
      console.log(`[setSystemState] Device:`, {
        id: device.device_id,
        name: device.device_name,
        type: device.device_type,
        ip: device.ip_address,
        state: device.device_state,
      });
      // Shelly
      if (device.device_type === 'shelly' && device.ip_address) {
        try {
          console.log(`[setSystemState] Controlando Shelly ${device.device_name} @ ${device.ip_address}`);
          if (device.device_state) await this.shellyService.turnOn(device.ip_address);
          else await this.shellyService.turnOff(device.ip_address);
          console.log(`[setSystemState] Shelly ${device.device_name} controlado com sucesso`);

          // Gerenciar eco mode baseado no modo selecionado
          if (payload.mode === 'saving') {
            console.log(`[setSystemState] Ativando eco mode no dispositivo ${device.device_name} (${device.ip_address})`);
            await this.shellyService.enableEcoMode(device.ip_address);
            console.log(`[setSystemState] Eco mode ativado com sucesso em ${device.device_name}`);
          } else {
            console.log(`[setSystemState] Desativando eco mode no dispositivo ${device.device_name} (${device.ip_address})`);
            await this.shellyService.disableEcoMode(device.ip_address);
            console.log(`[setSystemState] Eco mode desativado com sucesso em ${device.device_name}`);
          }
        } catch (e) { 
          console.error(`[setSystemState] Erro Shelly ${device.device_name}:`, e?.message); 
        }
      }
    }
    return this.overview();
  }

  async createDevice(payload: CreateDeviceDto) {
    if (!payload.user_id) {
      throw new Error(`[createDevice] user_id is required in payload`);
    }
    // cria um novo device na base de dados
    const device = this.deviceRepo.create({
      device_name: payload.device_name,
      device_description: (payload.device_description ?? null) as any,
      location: (payload.location ?? null) as any,
      device_state: false,
      ip_address: (payload.ip_address ?? null) as any,
      device_type: (payload.device_type ?? null) as any,
      user: { user_id: payload.user_id }
    });

    const savedDevice = await this.deviceRepo.save(device);

    // Adiciona o novo dispositivo ao polling de consumos
    await this.syncConsumptionService.addDevicePolling(savedDevice);

    if (payload.scenary_id) {
      await this.scenaryDeviceRepo.save({
        scenary_id: payload.scenary_id,
        device_id: savedDevice.device_id,
      });
    }

    return this.overview(payload.user_id);
  }

  async createDevicesFromIps(ips: string[], userId: number) {
    // create devices for each IP if not already present
    for (const ip of ips) {
      const existing = await this.deviceRepo.findOne({
        where: { ip_address: ip },
      });
      // probe to get hints
      let hints: string[] = [];
      try {
        // discoverService.probeIp returns { ip, openPorts, hints }

        const res = await this.discoverService.probeIp(ip);
        hints = res.hints || [];
      } catch (e) {
        // ignore probe errors
      }

      const inferredType = hints.includes('shelly')
        ? 'shelly'
        : hints.includes('tasmota')
          ? 'tasmota'
          : hints.includes('esp')
            ? 'esp'
            : 'unknown';

      const nameFromHints = hints.length
        ? `${hints[0]} device ${ip}`
        : `Discovered device ${ip}`;

      if (existing) {
        // update existing with inferred type/name if missing
        let changed = false;
        if (!existing.device_type && inferredType) {
          (existing as any).device_type = inferredType;
          changed = true;
        }
        if (!existing.device_name) {
          existing.device_name = nameFromHints;
          changed = true;
        }
        if (changed) await this.deviceRepo.save(existing);
        continue;
      }

      await this.deviceRepo.insert({
        device_name: nameFromHints,
        device_description: 'Auto-discovered on network',
        ip_address: ip,
        device_state: false,
        device_type: inferredType,
        user: { user_id: userId }
      } as any);
    }

    return this.overview(userId);
  }

  async createDevicesFromProbedIps(ips: string[], userId: number) {
    // alias for clarity
    return this.createDevicesFromIps(ips, userId);
  }

  async removeDevice(deviceId: number, userId?: number) {
    // Validar propriedade do dispositivo se userId for fornecido
    if (userId !== undefined) {
      const isOwner = await this.isDeviceOwner(deviceId, userId);
      if (!isOwner) {
        throw new NotFoundException('Dispositivo não encontrado ou não tem permissão');
      }
    }
    
    // Remove do polling de consumos
    await this.syncConsumptionService.removeDevicePolling(deviceId);
    
    // remove um device pelo id
    await this.deviceRepo.delete(deviceId);
    return this.overview(userId);
  }

  /**
   * Sincroniza o estado dos cenários com o estado real dos dispositivos
   * Se deviceId for passado, sincroniza apenas cenários que contêm esse dispositivo
   * Se deviceId não for passado, sincroniza todos os cenários
   */
  private async syncScenarioStates(deviceId?: number) {
    let query = this.scenaryRepo
      .createQueryBuilder('scenary')
      .leftJoinAndSelect('scenary.user', 'user')
      .leftJoinAndSelect('scenary.scenaryDevices', 'scenaryDevices')
      .leftJoinAndSelect('scenaryDevices.device', 'device');

    // Se deviceId foi passado, filtra apenas cenários que contêm esse dispositivo
    if (deviceId) {
      query = query.where('scenaryDevices.device_id = :deviceId', { deviceId });
    }

    const scenaries = await query.getMany();
    console.log(`[syncScenarioStates] ${deviceId ? `deviceId=${deviceId}` : 'all'} - Found ${scenaries.length} scenaries`);

    for (const scenary of scenaries) {
      if (!scenary.scenaryDevices || scenary.scenaryDevices.length === 0) {
        console.log(`[syncScenarioStates] Cenário ${scenary.scenary_name} não tem dispositivos, pulando`);
        continue;
      }

      console.log(`[syncScenarioStates] Cenário ${scenary.scenary_name} (${scenary.scenary_state}) tem ${scenary.scenaryDevices.length} dispositivos:`);
      scenary.scenaryDevices.forEach(link => {
        console.log(`  - Device ${link.device?.device_name}: state=${link.device?.device_state}`);
      });

      // Verifica se PELO MENOS UM dispositivo do cenário está ligado
      const atLeastOneDeviceOn = scenary.scenaryDevices.some(link => link.device?.device_state === true);

      // Verifica se TODOS os dispositivos do cenário estão desligados
      const allDevicesOff = scenary.scenaryDevices.every(link => !link.device?.device_state);

      console.log(`[syncScenarioStates] Cenário ${scenary.scenary_name}: atLeastOneDeviceOn=${atLeastOneDeviceOn}, allDevicesOff=${allDevicesOff}`);

      // Se pelo menos um dispositivo está ligado e cenário está inativo, ativa o cenário
      if (atLeastOneDeviceOn && scenary.scenary_state === 'inactive') {
        console.log(`[syncScenarioStates] Ativando cenário ${scenary.scenary_name} (pelo menos um dispositivo ligado)`);
        scenary.scenary_state = 'active';
        await this.scenaryRepo.save(scenary);
      }
      // Se todos os dispositivos estão desligados e cenário está ativo, desativa o cenário
      else if (allDevicesOff && scenary.scenary_state === 'active') {
        console.log(`[syncScenarioStates] Desativando cenário ${scenary.scenary_name} (todos dispositivos desligados)`);
        scenary.scenary_state = 'inactive';
        await this.scenaryRepo.save(scenary);
      } else {
        console.log(`[syncScenarioStates] Cenário ${scenary.scenary_name} mantém estado ${scenary.scenary_state}`);
      }
    }
  }

  async updateDeviceState(deviceId: number, active: boolean, userId?: number) {
    // Validar propriedade do dispositivo se userId for fornecido
    if (userId !== undefined) {
      const isOwner = await this.isDeviceOwner(deviceId, userId);
      if (!isOwner) {
        throw new NotFoundException('Dispositivo não encontrado ou não tem permissão');
      }
    }
    
    // actualiza o estado de um device individual
    const device = await this.deviceRepo.findOne({
      where: { device_id: deviceId },
    });
    if (!device) throw new NotFoundException('Device not found');

    console.log(`[updateDeviceState] Antes: device_id=${deviceId}, state=${device.device_state}, new_state=${active}`);
    device.device_state = active;
    const saved = await this.deviceRepo.save(device);
    console.log(`[updateDeviceState] Depois: saved.device_state=${saved.device_state}`);

    // Tenta controlar o dispositivo físico
    try {
      // Shelly
      const ip = (device as any).ip_address;
      if (device.device_type === 'shelly' && ip) {
        try {
          console.log(`[updateDeviceState] Controlando Shelly ${device.device_name} @ ${ip}`);
          if (active) await this.shellyService.turnOn(ip);
          else await this.shellyService.turnOff(ip);
          console.log(`[updateDeviceState] Shelly ${device.device_name} controlado com sucesso`);
        } catch (e) {
          console.error(`[updateDeviceState] Erro Shelly ${device.device_name}:`, e?.message);
        }
      }
    } catch (e) {
      console.error('Error updating device state physically', e);
    }

    // Após atualizar o dispositivo, sincroniza estados dos cenários que contêm este dispositivo
    await this.syncScenarioStates(deviceId);

    return saved;
  }

  async updateDeviceDetails(
    deviceId: number,
    payload: {
      device_name?: string;
      device_description?: string;
    },
    userId?: number,
  ) {
    console.log('[updateDeviceDetails] deviceId:', deviceId, 'userId:', userId, 'payload:', payload);
    
    // Validar propriedade do dispositivo se userId for fornecido
    if (userId !== undefined) {
      const isOwner = await this.isDeviceOwner(deviceId, userId);
      console.log('[updateDeviceDetails] isOwner:', isOwner);
      if (!isOwner) {
        throw new NotFoundException('Dispositivo não encontrado ou não tem permissão');
      }
    }
    
    // actualiza nome e descricao de um device
    const device = await this.deviceRepo.findOne({
      where: { device_id: deviceId },
    });
    if (!device) throw new NotFoundException('Device not found');

    console.log('[updateDeviceDetails] Found device:', device.device_name);

    if (payload.device_name !== undefined)
      device.device_name = payload.device_name;
    if (payload.device_description !== undefined)
      device.device_description = payload.device_description;

    console.log('[updateDeviceDetails] Saving device with updated values:', device.device_name);
    const result = await this.deviceRepo.save(device);
    console.log('[updateDeviceDetails] Device saved successfully');
    return result;
  }

  async createAutomation(payload: CreateAutomationDto) {
    const automation = this.automationRepo.create({
      automation_name: payload.automation_name ?? 'Automação',
      start_time: payload.start_time ?? null,
      end_time: payload.end_time ?? null,
      interval_unit: payload.interval_unit ?? 'seconds',
      interval_value: payload.interval_value ?? undefined,
      weekday: payload.weekday ?? null,
      IFTTT: payload.IFTTT ?? 'OFF',
      IFTTT_trigger: payload.IFTTT_trigger ?? null,
      IFTTT_action: payload.IFTTT_action ?? 'OFF',
      active: payload.active ?? true,
    });

    await this.automationRepo.save(automation);
    return automation;
  }

  async createAutomationTarget(payload: CreateAutomationTargetDto) {
    const automation = await this.automationRepo.findOneBy({
      automation_id: payload.automation_id,
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

      let device: Device | undefined;
      let scenary: Scenary | undefined;

    if (payload.target_type === 'device') {
      const foundDevice = await this.deviceRepo.findOneBy({ device_id: payload.device_id });
      if (!foundDevice) {
        throw new NotFoundException('Device not found');
      }
      device = foundDevice;
    }

    if (payload.target_type === 'scenary') {
      const foundScenary = await this.scenaryRepo.findOneBy({ scenary_id: payload.scenary_id });
      if (!foundScenary) {
        throw new NotFoundException('Scenary not found');
      }
      scenary = foundScenary;
    }

    const target = this.targetRepo.create({
      automation: automation,
      target_type: payload.target_type,
      device: device,
      scenary: scenary,
    });

    await this.targetRepo.save(target);
    return target;
  }

    async createAutomationTargetTimer(payload: CreateAutomationTargetTimerDto) {
      const automationTarget = await this.targetRepo.findOneBy({
        target_id: payload.target_id,
      });

      if (!automationTarget) {
        throw new NotFoundException('Automation Target not found');
      }

      const targetTimer = this.targetRepoTimer.create({
        target: automationTarget,
        timer_id: payload.timer_id,
        device_id: payload.device_id
      });

    await this.targetRepoTimer.save(targetTimer);
    return targetTimer;
  }

  async updateAutomationState(id: number, active: boolean) {
    const automation = await this.automationRepo.findOne({
      where: { automation_id: id },
      relations: ['targets', 'targets.timer', 'targets.device'],
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    automation.active = active;
    await this.automationRepo.save(automation);

    // Mantém timers no dispositivo: apenas ativa/desativa (não cria nem apaga)
    if (automation.targets) {
      for (const target of automation.targets) {
        if (
          target.timer &&
          target.timer.length > 0 &&
          target.device?.device_type === 'shelly' &&
          target.device.ip_address
        ) {
          for (const timer of target.timer) {
            if (!timer.timer_id) continue;
            try {
              await this.shellyService.setTimerEnabled(
                target.device.ip_address,
                timer.timer_id,
                active,
              );
            } catch (error) {
              console.error(
                `[updateAutomationState] Erro ao atualizar enable=${active} do timer ${timer.timer_id} no dispositivo ${target.device.ip_address}:`,
                error,
              );
            }
          }
        }
      }
    }

    return automation;
  }

  async removeAutomation(id: number) {
    const automation = await this.automationRepo.findOne({
      where: { automation_id: id },
      relations: ['targets', 'targets.timer', 'targets.device'],
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    // Remove timers físicos dos dispositivos Shelly antes de remover do banco
    if (automation.targets) {
      for (const target of automation.targets) {
        if (target.timer && target.timer.length > 0) {
          for (const timer of target.timer) {
            // Remove timer físico do dispositivo Shelly se for um dispositivo Shelly
            if (target.device?.device_type === 'shelly' && target.device.ip_address && timer.timer_id) {
              try {
                console.log(`[removeAutomation] Removendo timer físico ${timer.timer_id} do dispositivo ${target.device.ip_address}`);
                await this.shellyService.deleteTimer(target.device.ip_address, timer.timer_id);
                console.log(`[removeAutomation] Timer físico removido com sucesso`);
              } catch (error) {
                console.error(`[removeAutomation] Erro ao remover timer físico ${timer.timer_id} do dispositivo ${target.device.ip_address}:`, error);
                // Continua mesmo com erro para não bloquear a remoção da automação
              }
            }
          }
        }
      }
    }

    // Remove automation target timers do banco de dados
    if (automation.targets) {
      for (const target of automation.targets) {
        if (target.timer && target.timer.length > 0) {
          for (const timer of target.timer) {
            await this.targetRepoTimer.delete(timer.att_id);
          }
        }
      }
    }

    // Remove automation targets
    for (const target of automation.targets) {
      await this.targetRepo.delete(target.target_id);
    }

    // Remove the automation
    await this.automationRepo.delete(id);

    return { message: 'Automation removed successfully' };
  }

  async createScenary(payload: CreateScenaryDto) {
    const scenary = this.scenaryRepo.create({
      scenary_name: payload.scenary_name,
      scenary_description: (payload.scenary_description ?? null) as any,
      scenary_state: payload.scenary_state ?? 'inactive',
      user: { user_id: payload.user_id }
    });

    await this.scenaryRepo.save(scenary);
    return this.overview(payload.user_id);
  }

  async updateScenaryState(scenaryId: number, payload: UpdateScenaryStateDto, userId?: number) {
    // Validar propriedade do cenário se userId for fornecido
    if (userId !== undefined) {
      const isOwner = await this.isScenaryOwner(scenaryId, userId);
      if (!isOwner) {
        throw new NotFoundException('Cenário não encontrado ou não tem permissão');
      }
    }
    
    const scenary = await this.scenaryRepo.findOne({
      where: { scenary_id: scenaryId },
      relations: ['scenaryDevices', 'scenaryDevices.device'],
    });
    if (!scenary) throw new NotFoundException('Scenary not found');

    scenary.scenary_state = payload.scenary_state;
    await this.scenaryRepo.save(scenary);

    // Turn on/off all devices in the scenario
    if (scenary.scenaryDevices) {
      for (const link of scenary.scenaryDevices) {
        const device = link.device;
        if (!device) continue;
        device.device_state = payload.scenary_state === 'active';
        await this.deviceRepo.save(device);
        // Shelly
        if (device.device_type === 'shelly' && device.ip_address) {
          try {
            console.log(`[updateScenaryState] Controlando Shelly ${device.device_name} @ ${device.ip_address}`);
            if (payload.scenary_state === 'active') await this.shellyService.turnOn(device.ip_address);
            else await this.shellyService.turnOff(device.ip_address);
            console.log(`[updateScenaryState] Shelly ${device.device_name} controlado com sucesso`);
          } catch (e) { 
            console.error(`[updateScenaryState] Erro Shelly ${device.device_name}:`, e?.message); 
          }
        }
      }
    }

    return this.overview();
  }

  async removeScenary(scenaryId: number, userId?: number) {
    // Validar propriedade do cenário se userId for fornecido
    if (userId !== undefined) {
      const isOwner = await this.isScenaryOwner(scenaryId, userId);
      if (!isOwner) {
        throw new NotFoundException('Cenário não encontrado ou não tem permissão');
      }
    }
    
    // Primeiro remove as associações de dispositivos
    await this.scenaryDeviceRepo.delete({ scenary_id: scenaryId });
    // Depois remove o cenário
    await this.scenaryRepo.delete(scenaryId);
    return this.overview(userId);
  }

  async addDeviceToScenary(scenaryId: number, deviceId: number, userId?: number) {
    // Validar propriedade do cenário e do dispositivo se userId for fornecido
    if (userId !== undefined) {
      const scenaryOwner = await this.isScenaryOwner(scenaryId, userId);
      const deviceOwner = await this.isDeviceOwner(deviceId, userId);
      if (!scenaryOwner || !deviceOwner) {
        throw new NotFoundException('Cenário ou dispositivo não encontrado ou não tem permissão');
      }
    }
    
    const scenary = await this.scenaryRepo.findOne({
      where: { scenary_id: scenaryId },
    });
    if (!scenary) throw new NotFoundException('Scenary not found');

    const device = await this.deviceRepo.findOne({
      where: { device_id: deviceId },
    });
    if (!device) throw new NotFoundException('Device not found');

    // Verifica se já existe a associação
    const existing = await this.scenaryDeviceRepo.findOne({
      where: { scenary_id: scenaryId, device_id: deviceId },
    });
    if (existing) {
      return this.overview(userId); // Já existe, retorna sem erro
    }

    // Cria a associação
    await this.scenaryDeviceRepo.save({
      scenary_id: scenaryId,
      device_id: deviceId,
    });

    return this.overview(userId);
  }

  async removeDeviceFromScenary(scenaryId: number, deviceId: number, userId?: number) {
    // Validar propriedade do cenário se userId for fornecido
    if (userId !== undefined) {
      const isOwner = await this.isScenaryOwner(scenaryId, userId);
      if (!isOwner) {
        throw new NotFoundException('Cenário não encontrado ou não tem permissão');
      }
    }
    
    await this.scenaryDeviceRepo.delete({
      scenary_id: scenaryId,
      device_id: deviceId,
    });
    return this.overview(userId);
  }

  async consumptionHistory(params?: { period?: '24h' | '7d' | '30d' | '365d'; limit?: number }) {
    const period = params?.period ?? '24h';
    const now = Date.now();
    const windowMs = period === '24h'
      ? 24 * 60 * 60 * 1000
      : period === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : period === '30d'
      ? 30 * 24 * 60 * 60 * 1000
      : 365 * 24 * 60 * 60 * 1000;

    const cutoff = new Date(now - windowMs);
    const limit = Math.min(Math.max(Number(params?.limit ?? 200000), 1), 300000);

    // Nota: histórico é amostrado a cada ~2s por dispositivo; devolvemos apenas janela solicitada.
    // Inclui relação device para o frontend conseguir somar por device_id.
    return this.historyRepo.find({
      where: { register_date: MoreThanOrEqual(cutoff) },
      relations: { device: true },
      order: { register_date: 'DESC' },
      take: limit,
    });
  }

  private buildWeeklyDistribution(entries: ConsumptionHistory[]) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const distribution = days.map((day) => ({ day, value: 0 }));

    entries.forEach((entry) => {
      const date = entry.register_date ? new Date(entry.register_date) : null;
      if (!date) return;
      const idx = date.getDay();
      distribution[idx].value += Number(entry.consumption ?? 0);
    });

    return distribution;
  }

  /**
   * Obtém um dispositivo pelo ID
   */
  async getDeviceById(deviceId: number): Promise<Device> {
    const device = await this.deviceRepo.findOne({
      where: { device_id: deviceId },
    });
    if (!device) {
      throw new Error(`Dispositivo ${deviceId} não encontrado`);
    }
    return device;
  }

  /**
   * Obtém o estado do Shelly
   */
  async getShellyState(ip: string): Promise<boolean> {
    return this.shellyService.getStatus(ip);
  }

  /**
   * Obtém a potência do Shelly
   */
  async getShellyPower(ip: string): Promise<number> {
    return this.shellyService.getPowerConsumption(ip);
  }

  /**
   * Obtém a energia total do Shelly
   */
  async getShellyShellyEnergy(ip: string): Promise<number> {
    return this.shellyService.getTotalConsumption(ip);
  }

  /**
   * Obtém a voltagem do Shelly
   */
  async getShellyVoltage(ip: string): Promise<number> {
    return this.shellyService.getVoltage(ip);
  }

  /**
   * Obtém a corrente do Shelly
   */
  async getShellyCurrent(ip: string): Promise<number> {
    return this.shellyService.getCurrent(ip);
  }

  /**
   * Converte intervalo para segundos
   */
  private convertIntervalToSeconds(value: number, unit: string): number {
    switch (unit) {
      case 'seconds':
        return value;
      case 'minutes':
        return value * 60;
      case 'hours':
        return value * 3600;
      case 'days':
        return value * 86400;
      default:
        return value; // assume seconds
    }
  }

}
