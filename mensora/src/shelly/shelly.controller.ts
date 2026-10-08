import { Controller, Post, Body, Get, Logger, Param } from '@nestjs/common';
import { ShellyService } from './shelly.service';
import { ShellyCloudService } from './shelly-cloud.service';
import { ApiResponse } from '@nestjs/swagger';
import { threadId } from 'worker_threads';

@Controller('shelly')
export class ShellyController {
  private readonly logger = new Logger(ShellyController.name);

  constructor(
    private readonly shellyService: ShellyService,
    private readonly shellyCloudService: ShellyCloudService,
  ) {}

  @Post('off')
  @ApiResponse({ status: 201, description: 'Shelly turned off successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async turnOff(@Body('ip') ip: string) {
    await this.shellyService.turnOff(ip);
    return { message: `Shelly relay at ${ip} turned OFF` };
  }

  @Post('on')
  @ApiResponse({ status: 201, description: 'Shelly turned on successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async turnOn(@Body('ip') ip: string) {
    await this.shellyService.turnOn(ip);
    return { message: `Shelly relay at ${ip} turned ON` };
  }

  @Post('ping')
  @ApiResponse({ status: 201, description: 'Shelly pinged successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async ping(@Body('ip') ip: string) {
    const ok = await this.shellyService.ping(ip);
    return { ok };
  }

  @Post('timer/on')
  @ApiResponse({ status: 201, description: 'OnTimer created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
    async createOnTimer(@Body() body) {
    const onTimer = await this.shellyService.createTimer(
      body.ip,
      body.hour,
      body.minute,
      body.days,
      true,
      body.enable ?? true,
    );
    return { onTimer };
  }

  @Post('timer/off')
  @ApiResponse({ status: 201, description: 'OffTimer created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
    async createOffTimer(@Body() body) {
    const offTimer = await this.shellyService.createTimer(
      body.ip,
      body.hour,
      body.minute,
      body.days,
      false,
      body.enable ?? true,
    );
    return { offTimer };
  }

  @Post('timer/onInterval')
  @ApiResponse({ status: 201, description: 'OnTimerInterval created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
    async createOnTimerInterval(@Body() body) {
    const onTimerInterval = await this.shellyService.createTimerInterval(body.ip, true, body.toggleAfter);
    return { onTimerInterval };
  }

  @Post('timer/offInterval')
  @ApiResponse({ status: 201, description: 'OffTimerInterval created successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
    async createOffTimerInterval(@Body() body) {
    const offTimerInterval = await this.shellyService.createTimerInterval(body.ip, false, body.toggleAfter);
    return { offTimerInterval };
  }

  @Post('timer/list')
  @ApiResponse({ status: 201, description: 'Timers listed successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
    async listTimer(@Body('ip') ip: string) {
      const list = await this.shellyService.listTimers(ip);
      return { list };
    }
  
  @Post('timer/delete')
  @ApiResponse({ status: 201, description: 'Timer deleted successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
    async deleteTimer(@Body() body) {
      const deleteTimer = await this.shellyService.deleteTimer(body.ip, body.id);
    }

  @Post('consumption')
  @ApiResponse({ status: 201, description: 'Consumption returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getConsumption(@Body() body: { ip: string; device_id?: number }) {
    const { ip, device_id } = body;
    
    try {
      const power = await this.shellyService.getPowerConsumption(ip);
      const energy = await this.shellyService.getTotalConsumption(ip);
      const voltage = await this.shellyService.getVoltage(ip);
      const current = await this.shellyService.getCurrent(ip);
      
      return {
        device_id,
        ip,
        power,
        energy,
        voltage,
        current
      };
    } catch (error) {
      this.logger.warn(`Erro ao obter consumo via RPC local para ${ip}: ${error?.message}`);
      
      // Fallback para cloud se LAN falhar
      try {
        const power = await this.shellyCloudService.getPowerConsumption((device_id ?? 0).toString());
        const energy = await this.shellyCloudService.getTotalConsumption((device_id ?? 0).toString());
        const voltage = await this.shellyCloudService.getVoltage((device_id ?? 0).toString());
        const current = await this.shellyCloudService.getCurrent((device_id ?? 0).toString());
        
        return {
          device_id,
          ip,
          power,
          energy,
          voltage,
          current,
          source: 'cloud'
        };
      } catch (cloudError) {
        this.logger.error(`Erro também na cloud para ${device_id}: ${cloudError?.message}`);
        return {
          device_id,
          ip,
          power: 0,
          energy: 0,
          voltage: 0,
          current: 0,
          error: 'Não foi possível obter dados via LAN ou Cloud'
        };
      }
    }
  }

  @Get('discover/cloud')
  @ApiResponse({ status: 200, description: 'Shelly devices returned successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async discoverDevicesFromCloud() {
    try {
      const devices = await this.shellyCloudService.getDeviceList();
      this.logger.log(`${devices.length} dispositivos encontrados na Shelly Cloud`);
      return {
        success: true,
        count: devices.length,
        devices: devices.map(d => ({
          id: d.id,
          device_id: d.device_id,
          name: d.name,
          type: d.type,
          ip: d.ip,
          status: d.status,
        })),
      };
    } catch (error: any) {
      this.logger.error(`Erro ao descobrir dispositivos na cloud: ${error?.message}`);
      return {
        success: false,
        count: 0,
        devices: [],
        error: error?.message,
      };
    }
  }

  @Get('test/cloud')
  @ApiResponse({ status: 200, description: 'Connection test successful'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async testCloudConnection() {
    this.logger.log('Testando conexão com Shelly Cloud...');
    const devices = await this.shellyCloudService.getDeviceList();
    return {
      success: devices.length > 0,
      message: devices.length > 0 ? 'Conectado com sucesso!' : 'Falha na conexão ou token inválido',
      devicesCount: devices.length,
      devices: devices,
    };
  }

  @Post('cloud/on')
  @ApiResponse({ status: 201, description: 'Cloud turned on successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async turnOnCloud(@Body('device_id') deviceId: string) {
    const success = await this.shellyCloudService.turnOn(deviceId);
    return {
      success,
      message: success ? `Shelly ${deviceId} turned ON via Cloud` : `Failed to turn ON Shelly ${deviceId} via Cloud`,
    };
  }

  @Post('cloud/off')
  @ApiResponse({ status: 201, description: 'Cloud turned off successfully'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async turnOffCloud(@Body('device_id') deviceId: string) {
    const success = await this.shellyCloudService.turnOff(deviceId);
    return {
      success,
      message: success ? `Shelly ${deviceId} turned OFF via Cloud` : `Failed to turn OFF Shelly ${deviceId} via Cloud`,
    };
  }

  @Get('discover/lan')
  @ApiResponse({ status: 200, description: 'Shelly devices successfully discovered in LAN!'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async discoverDevicesLAN() {
    try {
      const devices = await this.shellyService.discoverDevicesLAN();
      return {
        success: true,
        count: devices.length,
        devices,
      };
    } catch (error: any) {
      this.logger.error(`Erro ao descobrir dispositivos LAN: ${error?.message}`);
      return {
        success: false,
        count: 0,
        devices: [],
        error: error?.message,
      };
    }
  }

  @Get('eco/enable/:ip')
  @ApiResponse({ status: 200, description: 'Eco Mode successfully enabled'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async enableEcoMode(@Param('ip') ip: string) {
    this.logger.log(`[ShellyController] Recebida requisição para ativar eco mode no IP: ${ip}`);
    const result = await this.shellyService.enableEcoMode(ip);
    this.logger.log(`[ShellyController] Resultado da ativação do eco mode para ${ip}: ${result.success}`);
    return {
      success: result.success,
      restart_required: result.restart_required,
      message: result.success ? `Eco mode enabled on ${ip}` : `Failed to enable eco mode on ${ip}`,
    };
  }

  @Get('eco/disable/:ip')
  @ApiResponse({ status: 200, description: 'Eco Mode successfully disabled'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async disableEcoMode(@Param('ip') ip: string) {
    this.logger.log(`[ShellyController] Recebida requisição para desativar eco mode no IP: ${ip}`);
    const result = await this.shellyService.disableEcoMode(ip);
    this.logger.log(`[ShellyController] Resultado da desativação do eco mode para ${ip}: ${result.success}`);
    return {
      success: result.success,
      restart_required: result.restart_required,
      message: result.success ? `Eco mode disabled on ${ip}` : `Failed to disable eco mode on ${ip}`,
    };
  }

  @Post('reboot')
  @ApiResponse({ status: 201, description: 'Shelly device successfully rebooted'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async reboot(@Body('ip') ip: string) {
    if (!ip) {
      return { success: false, message: 'Missing ip' };
    }
    this.logger.log(`[ShellyController] Recebida requisição para reiniciar dispositivo no IP: ${ip}`);
    await this.shellyService.reboot(ip);
    return { success: true };
  }

  @Get('eco/status/:ip')
  @ApiResponse({ status: 200, description: 'Eco Mode status successfully returned'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getEcoModeStatus(@Param('ip') ip: string) {
    this.logger.log(`[ShellyController] Recebida requisição para obter status do eco mode no IP: ${ip}`);
    const ecoMode = await this.shellyService.getEcoModeStatus(ip);
    this.logger.log(`[ShellyController] Status do eco mode para ${ip}: ${ecoMode}`);
    return { ecoMode };
  }

  @Get('sys/status/:ip')
  @ApiResponse({ status: 200, description: 'System status successfully returned'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSysStatus(@Param('ip') ip: string) {
    const status = await this.shellyService.getSysStatus(ip);
    return status;
  }

  @Post('eco/test/:ip')
  @ApiResponse({ status: 201, description: 'Eco mode successfully tested'})
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async testEcoMode(@Param('ip') ip: string): Promise<{ success: boolean; message: string; details?: any }> {
    this.logger.log(`[POST /eco/test/${ip}] Testando eco mode completo`);

    try {
      // Verifica suporte
      const deviceInfo = await this.shellyService.getDeviceInfo(ip);
      this.logger.log(`[POST /eco/test/${ip}] Dispositivo: ${deviceInfo.model}, Suporte: ${deviceInfo.supportsEcoMode}`);

      if (!deviceInfo.supportsEcoMode) {
        return {
          success: false,
          message: `Dispositivo não suporta eco mode`,
          details: { model: deviceInfo.model }
        };
      }

      // Obtém status inicial
      const initialStatus = await this.shellyService.getEcoModeStatus(ip);
      this.logger.log(`[POST /eco/test/${ip}] Status inicial: ${initialStatus}`);

      // Ativa eco mode
      const enableResult = await this.shellyService.enableEcoMode(ip);
      this.logger.log(
        `[POST /eco/test/${ip}] Ativação: success=${enableResult.success}, restart_required=${enableResult.restart_required}`,
      );

      // Verifica status após ativação
      const afterEnableStatus = await this.shellyService.getEcoModeStatus(ip);
      this.logger.log(`[POST /eco/test/${ip}] Status após ativação: ${afterEnableStatus}`);

      // Desativa eco mode
      const disableResult = await this.shellyService.disableEcoMode(ip);
      this.logger.log(
        `[POST /eco/test/${ip}] Desativação: success=${disableResult.success}, restart_required=${disableResult.restart_required}`,
      );

      // Verifica status final
      const finalStatus = await this.shellyService.getEcoModeStatus(ip);
      this.logger.log(`[POST /eco/test/${ip}] Status final: ${finalStatus}`);

      const success =
        enableResult.success &&
        disableResult.success &&
        afterEnableStatus &&
        !finalStatus;

      return {
        success,
        message: success ? 'Teste do eco mode passou' : 'Teste do eco mode falhou',
        details: {
          model: deviceInfo.model,
          initialStatus,
          enableResult,
          afterEnableStatus,
          disableResult,
          finalStatus
        }
      };

    } catch (err) {
      this.logger.error(`[POST /eco/test/${ip}] Erro no teste`, err);
      return {
        success: false,
        message: `Erro durante o teste: ${err.message}`,
        details: err
      };
    }
  }
}
