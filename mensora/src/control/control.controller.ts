import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiParam, ApiBody } from '@nestjs/swagger';
import { ControlService } from './control.service';
import { SystemStateDto } from './dto/system-state.dto';
import { CreateDeviceDto } from './dto/create-device.dto';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { UpdateScenaryStateDto } from './dto/update-scenary-state.dto';
import { CreateScenaryDto } from './dto/create-scenary.dto';
import { CreateAutomationTargetDto } from './dto/create-automation-target.dto';
import { CreateAutomationTargetTimerDto } from './dto/create-automation-target-timer';
import { ApiResponse } from '@nestjs/swagger';
import { SyncConsumptionService } from './sync-consumption.service';
@Controller('control')
export class ControlController {
  constructor(
    private readonly controlService: ControlService,
    private readonly syncConsumptionService: SyncConsumptionService,
  ) {}

  @Get('overview')
  @Get('overview/:user_id')
  @ApiResponse({ status: 200, description: 'Overview returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  overview(@Req() req: any, @Param('user_id') userId?: string) {
    // IMPORTANTE: Overview DEVE ser autenticado!
    // Extrai sempre do userId da sessão autenticada
    const session = req.session as any;
    const authenticatedUserId = session?.userId;
    
    console.log(`[ControlController.overview] Session userId: ${authenticatedUserId}, URL userId: ${userId}`);
    
    // Se user_id vem na URL, valida que pertence ao utilizador autenticado
    if (userId) {
      const requestedUserId = Number(userId);
      if (requestedUserId !== authenticatedUserId) {
        throw new UnauthorizedException('Não pode ver dispositivos de outro utilizador');
      }
    }
    
    // Se não há utilizador autenticado, retorna vazio
    // (não mostra dados de nenhum dispositivo)
    if (!authenticatedUserId) {
      console.log(`[ControlController.overview] No authenticated user, returning empty data`);
      return {
        systemActive: false,
        scenaries: [],
        devices: [],
        automations: [],
        consumption: {
          total: 0,
          dailyAverage: 0,
          weeklyDistribution: [],
        },
      };
    }
    
    // Usa sempre a session autenticada
    console.log(`[ControlController.overview] Calling service with userId: ${authenticatedUserId}`);
    return this.controlService.overview(authenticatedUserId);
  }

  @Post('devices/all/:user_id')
  @ApiResponse({ status: 200, description: 'Devices returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getAllDevices(@Param('user_id') userId: string) {
    return this.controlService.getAllDevicesByUser(+userId);
  }

  @Post('scenary/all/:user_id')
    @ApiResponse({ status: 200, description: 'Scenaries returned successfully'})
    @ApiResponse({ status: 500, description: 'Internal server error' })
  getAllScenariesByUser(@Param('user_id') userId: string) {
    return this.controlService.getAllScenariesByUser(+userId);
  }

  @Get('scenary/devices/:scenaryId')
  @ApiResponse({ status: 200, description: 'Devices returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getDevicesOfScenary(@Param('scenaryId') userId: string) {
    return this.controlService.getDevicesOfScenary(+userId);
  }

  @Post('devices/sync-states')
  @ApiResponse({ status: 200, description: 'States of device returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  syncDeviceStates() {
    return this.controlService.syncDeviceStates();
  }

  @Post('system')
  @ApiResponse({ status: 200, description: 'States of system returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  setSystemState(@Body() payload: SystemStateDto) {
    return this.controlService.setSystemState(payload);
  }

  @Post('devices')
  @ApiResponse({ status: 201, description: 'Device created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createDevice(@Body() payload: CreateDeviceDto, @Req() req: any) {
    const session = req.session as any;
    if (!session?.userId) {
      throw new UnauthorizedException('Utilizador não autenticado');
    }
    payload.user_id = session.userId;
    return this.controlService.createDevice(payload);
  }

  @Post('devices/bulk')
  @ApiResponse({ status: 201, description: 'Device created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createDevicesFromIps(@Body() payload: { ips: string[]; user_id?: number }, @Req() req: any) {
    const session = req.session as any;
    if (!session?.userId) {
      throw new UnauthorizedException('Utilizador não autenticado');
    }
    const userId = payload.user_id || session.userId;
    return this.controlService.createDevicesFromIps(payload.ips || [], userId);
  }

  @Post('devices/probe')
  @ApiResponse({ status: 201, description: 'Device created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createDevicesFromProbedIps(@Body() payload: { ips: string[]; user_id?: number }, @Req() req: any) {
    const session = req.session as any;
    if (!session?.userId) {
      throw new UnauthorizedException('Utilizador não autenticado');
    }
    const userId = payload.user_id || session.userId;
    return this.controlService.createDevicesFromProbedIps(payload.ips || [], userId);
  }

  @Delete('devices/:deviceId')
  @ApiResponse({ status: 201, description: 'Device deleted successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  removeDevice(@Param('deviceId') deviceId: string, @Body() payload?: { user_id?: number }) {
    // user_id é opcional - se enviado, valida propriedade
    return this.controlService.removeDevice(Number(deviceId), payload?.user_id);
  }

  @Patch('devices/:deviceId/state')
  @ApiResponse({ status: 201, description: 'Device state updated successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateDeviceState(
    @Param('deviceId') deviceId: string,
    @Body() payload: { active: boolean; user_id?: number },
  ) {
    // user_id é opcional - se enviado, valida propriedade
    await this.controlService.updateDeviceState(
      Number(deviceId),
      payload.active,
      payload.user_id,
    );
    // Retorna overview atualizado apos mudanca estado
    return this.controlService.overview(payload.user_id);
  }

  @Patch('devices/:deviceId')
  @ApiParam({ name: 'deviceId', type: Number })
  @ApiBody({ type: UpdateDeviceDto }) 
  @ApiResponse({ status: 201, description: 'Device updated successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  updateDevice(@Req() req: any, @Param('deviceId') deviceId: string, @Body() payload: any) {
    // Extrai userId da sessão autenticada
    const session = req.session as any;
    const userId = session?.userId;
    
    console.log('[updateDevice] Request received - deviceId:', deviceId, 'userId:', userId, 'payload:', payload);
    
    // Se não há utilizador autenticado, retorna erro
    if (!userId) {
      console.log('[updateDevice] No authenticated user in session');
      throw new UnauthorizedException('Utilizador não autenticado');
    }
    
    return this.controlService.updateDeviceDetails(Number(deviceId), payload, userId);
  }

  @Post('automations')
  @ApiResponse({ status: 201, description: 'Automation created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createAutomation(@Body() payload: CreateAutomationDto) {
    return this.controlService.createAutomation(payload);
  }

  @Post('automation-targets')
  @ApiResponse({ status: 201, description: 'Automation-Target created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createAutomationTarget(@Body() payload: CreateAutomationTargetDto) {
    return this.controlService.createAutomationTarget(payload);
  }

  @Post('automation-target-timer')
  @ApiResponse({ status: 201, description: 'Automation-Target-Timer created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createAutomationTargetTimer(@Body() payload: CreateAutomationTargetTimerDto) {
    return this.controlService.createAutomationTargetTimer(payload);
  }

  @Patch('automations/:id/state')
  @ApiResponse({ status: 201, description: 'Automation updated successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  updateAutomationState(@Param('id') id: number, @Body() dto: { active: boolean }) {
  return this.controlService.updateAutomationState(id, dto.active);
  }

  @Delete('automations/:id')
  @ApiResponse({ status: 201, description: 'Automation deleted successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  removeAutomation(@Param('id') id: string) {
    return this.controlService.removeAutomation(Number(id));
  }

  @Get('devices/available')
  @ApiResponse({ status: 201, description: 'Available devices returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getAvailableDevices(@Req() req: any) {
    // Retorna apenas os dispositivos do utilizador autenticado que ainda NÃO estão em nenhum cenário
    const session = req.session as any;
    const userId = session?.userId;
    
    if (!userId) {
      return [];
    }
    
    return this.controlService.getAvailableDevicesByUser(userId);
  }

  @Post('scenaries')
  @ApiResponse({ status: 201, description: 'Scenary created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createScenary(@Body() payload: CreateScenaryDto, @Req() req: any) {
    const session = req.session as any;
    if (!session?.userId) {
      throw new UnauthorizedException('Utilizador não autenticado');
    }
    payload.user_id = session.userId;
    return this.controlService.createScenary(payload);
  }

  @Patch('scenaries/:scenaryId/state')
  @ApiParam({ name: 'scenaryId', type: Number })
  @ApiBody({ type: UpdateScenaryStateDto })
  @ApiResponse({ status: 201, description: 'Scenary updated successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  updateScenaryState(
    @Param('scenaryId') scenaryId: string,
    @Body() payload: UpdateScenaryStateDto & { user_id?: number },
  ) {
    // user_id é opcional - se enviado, valida propriedade
    const userId = payload.user_id;
    const { user_id, ...updatePayload } = payload;
    return this.controlService.updateScenaryState(
      Number(scenaryId),
      updatePayload as UpdateScenaryStateDto,
      userId,
    );
  }

  @Delete('scenaries/:scenaryId')
  @ApiResponse({ status: 201, description: 'Scenary deleted successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  removeScenary(@Param('scenaryId') scenaryId: string, @Body() payload?: { user_id?: number }) {
    // user_id é opcional - se enviado, valida propriedade
    return this.controlService.removeScenary(Number(scenaryId), payload?.user_id);
  }

  @Post('scenaries/:scenaryId/devices')
  @ApiResponse({ status: 201, description: 'Device added to Scenary successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  addDeviceToScenary(
    @Param('scenaryId') scenaryId: string,
    @Body() payload: { device_id: number; user_id?: number },
  ) {
    // user_id é opcional - se enviado, valida propriedade
    return this.controlService.addDeviceToScenary(
      Number(scenaryId),
      payload.device_id,
      payload.user_id,
    );
  }

  @Delete('scenaries/:scenaryId/devices/:deviceId')
  @ApiResponse({ status: 201, description: 'Device removed from Scenary successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  removeDeviceFromScenary(
    @Param('scenaryId') scenaryId: string,
    @Param('deviceId') deviceId: string,
    @Body() payload?: { user_id?: number },
  ) {
    // user_id é opcional - se enviado, valida propriedade
    return this.controlService.removeDeviceFromScenary(
      Number(scenaryId),
      Number(deviceId),
      payload?.user_id,
    );
  }

  @Get('history')
  @ApiResponse({ status: 201, description: 'History returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  consumptionHistory(
    @Query('period') period?: '24h' | '7d' | '30d' | '365d',
    @Query('limit') limit?: string,
  ) {
    return this.controlService.consumptionHistory({
      period,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('sync-consumption/status')
  @ApiResponse({ status: 201, description: 'Consumption status returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getConsumptionSyncStatus() {
    // Retorna status de todos os dispositivos em polling
    const states = this.syncConsumptionService.getAllPollingStates();
    const statesArray = Array.from(states.entries()).map(([deviceId, state]) => ({
      device_id: deviceId,
      last_consumption: state.lastConsumption,
      last_update: state.lastUpdate,
    }));
    return {
      polling_active: statesArray.length > 0,
      devices_polling: statesArray.length,
      devices: statesArray,
    };
  }

  @Post('sync-consumption/start')
  @ApiResponse({ status: 201, description: 'Consumption syncing started successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async startConsumptionSync() {
    // Inicializa sincronização de consumos (normalmente já foi inicializada)
    await this.syncConsumptionService.initialize();
    return { message: 'Sincronização de consumos iniciada' };
  }

  @Post('sync-consumption/stop')
  @ApiResponse({ status: 201, description: 'Consumption syncing stopped successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async stopConsumptionSync() {
    // Para sincronização de consumos
    await this.syncConsumptionService.stop();
    return { message: 'Sincronização de consumos parada' };
  }

  /**
   * Consumo estado actual dispositivo Shelly
   */
  @Get('devices/shelly/:deviceId/status')
  @ApiResponse({ status: 200, description: 'Status returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getShellyStatus(@Param('deviceId') deviceId: string) {
    const device = await this.controlService.getDeviceById(Number(deviceId));
    if (!device || device.device_type !== 'shelly') {
      throw new Error('Dispositivo Shelly nao encontrado');
    }

    try {
      const [power, energy, voltage, current, state] = await Promise.all([
        this.controlService.getShellyPower(device.ip_address!),
        this.controlService.getShellyShellyEnergy(device.ip_address!),
        this.controlService.getShellyVoltage(device.ip_address!),
        this.controlService.getShellyCurrent(device.ip_address!),
        this.controlService.getShellyState(device.ip_address!),
      ]);

      return {
        device_id: device.device_id,
        state,
        power,
        energy,
        voltage,
        current,
      };
    } catch (err) {
      throw new Error(`Erro obter status Shelly: ${err}`);
    }
  }
}
