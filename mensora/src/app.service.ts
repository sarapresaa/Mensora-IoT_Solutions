import { Injectable, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { ControlService } from './control/control.service';
import { SyncConsumptionService } from './control/sync-consumption.service';

@Injectable()
export class AppService implements OnModuleInit, OnApplicationShutdown {
  constructor(
    private readonly controlService: ControlService,
    private readonly syncConsumptionService: SyncConsumptionService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Executado quando o módulo é inicializado
   * Sincroniza estados dos dispositivos e inicia polling de consumos
   */
  async onModuleInit() {
    console.log('[App] Inicializando aplicação...');
    
    try {
      // Sincroniza estado todos dispositivos
      console.log('[App] Sincronizando estado real dos dispositivos...');
      await this.controlService.syncDeviceStates();
      
      // Inicia polling consumos
      console.log('[App] Iniciando sincronização de consumos...');
      await this.syncConsumptionService.initialize();
      
      console.log('[App] Aplicação inicializada com sucesso');
    } catch (error) {
      console.error('[App] Erro ao inicializar aplicação:', error);
    }
  }

  /**
   * Executado quando a aplicação é encerrada
   * Para os timers de polling
   */
  async onApplicationShutdown() {
    console.log('[App] Encerrando aplicação...');
    
    try {
      await this.syncConsumptionService.stop();
      console.log('[App] Aplicação encerrada com sucesso');
    } catch (error) {
      console.error('[App] Erro ao encerrar aplicação:', error);
    }
  }
}

