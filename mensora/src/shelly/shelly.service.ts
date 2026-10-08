import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable()
export class ShellyService {
  private readonly logger = new Logger(ShellyService.name);

  constructor(private readonly httpService: HttpService) {}

  async turnOff(ip: string): Promise<void> {
    const payload = {
      id: 1,
      method: 'Switch.Set',
      params: { id: 0, on: false },
    };

    try {
      const observable = this.httpService.post(`http://${ip}/rpc`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);
      this.logger.log(
        `Relay at ${ip} turned OFF`,
        JSON.stringify(response.data),
      );
    } catch (err) {
      this.logger.error(`Failed to turn off Shelly at ${ip}`, err);
    }
  }

  async turnOn(ip: string): Promise<void> {
    const payload = {
      id: 1,
      method: 'Switch.Set',
      params: { id: 0, on: true },
    };

    try {
      const observable = this.httpService.post(`http://${ip}/rpc`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);
      this.logger.log(
        `Relay at ${ip} turned ON`,
        JSON.stringify(response.data),
      );
    } catch (err) {
      this.logger.error(`Failed to turn on Shelly at ${ip}`, err);
    }
  }

  async getStatus(ip: string): Promise<boolean> {
    try {
      const payload = {
        id: 1,
        method: 'Switch.GetStatus',
        params: { id: 0 },
      };

      const observable = this.httpService.post(`http://${ip}/rpc`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);
      // Shelly Gen2: output result.output nao result.state.output
      const isOn = response.data?.result?.output ?? false;
      this.logger.debug(`shelly at ${ip} status: ${isOn}`);
      return isOn;
    } catch (err) {
      this.logger.error(`falha ao obter estado de shelly em ${ip}`, err);
      return false;
    }
  }

  /**
   * Consumo atual (potencia) Watts dispositivo Shelly
   * Usa API Gen2
   * @param ip Endereco IP dispositivo
   * @returns Consumo W (watts) ou 0 se falhar
   */
  async getPowerConsumption(ip: string): Promise<number> {
    try {
      const payload = {
        id: 1,
        method: 'Switch.GetStatus',
        params: { id: 0 },
      };

      const observable = this.httpService.post(`http://${ip}/rpc`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);
      // DEBUG: Log completo da resposta
      this.logger.debug(`[DEBUG] Resposta Shelly getPowerConsumption ${ip}:`);
      this.logger.debug(JSON.stringify(response.data, null, 2));
      
      // Shelly Gen2: apower (potencia ativa W) ou power
      const power = response.data?.result?.apower ?? response.data?.result?.power ?? 0;
      this.logger.debug(`shelly at ${ip} power: ${power}W`);
      return power;
    } catch (err) {
      this.logger.error(`falha ao obter consumo de shelly em ${ip}`, err);
      return 0;
    }
  }

  /**
   * Consumo total acumulado Wh (watt-hora)
   * Usa API Gen2
   * @param ip Endereco IP dispositivo
   * @returns Consumo total Wh
   */
  async getTotalConsumption(ip: string): Promise<number> {
    try {
      const payload = {
        id: 1,
        method: 'Switch.GetStatus',
        params: { id: 0 },
      };

      const observable = this.httpService.post(`http://${ip}/rpc`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);
      // DEBUG: Log completo da resposta
      this.logger.debug(`[DEBUG] Resposta Shelly getTotalConsumption ${ip}:`);
      this.logger.debug(JSON.stringify(response.data, null, 2));
      
      // Shelly Gen2: aenergy (active energy) ou energy
      const energy = response.data?.result?.aenergy?.total ?? response.data?.result?.energy ?? 0;
      this.logger.debug(`shelly at ${ip} total energy: ${energy}Wh`);
      return energy;
    } catch (err) {
      this.logger.error(`falha ao obter energia total de shelly em ${ip}`, err);
      return 0;
    }
  }

  /**
   * Obtém tempo de operação (ON time) em segundos
   * @param ip Endereço IP do dispositivo
   * @returns Tempo de operação em segundos
   */
  async getOperatingTime(ip: string): Promise<number> {
    try {
      const payload = {
        id: 1,
        method: 'Switch.GetStatus',
        params: { id: 0 },
      };

      const observable = this.httpService.post(`http://${ip}/rpc`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);
      // Procura on_time em segundos
      const onTime = response.data?.result?.on_time ?? 0;
      this.logger.debug(`shelly at ${ip} on_time: ${onTime}s`);
      return onTime;
    } catch (err) {
      this.logger.error(`falha ao obter tempo de operação de shelly em ${ip}`, err);
      return 0;
    }
  }

  /**
   * Obtém voltagem (em Volts) de um dispositivo Shelly
   * @param ip Endereço IP do dispositivo
   * @returns Voltagem em V
   */
  async getVoltage(ip: string): Promise<number> {
    try {
      const payload = {
        id: 1,
        method: 'Switch.GetStatus',
        params: { id: 0 },
      };

      const observable = this.httpService.post(`http://${ip}/rpc`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);
      // Shelly Gen2: voltage
      const voltage = response.data?.result?.voltage ?? 0;
      this.logger.debug(`[DEBUG] Resposta Shelly getVoltage ${ip}:`);
      this.logger.debug(JSON.stringify(response.data?.result, null, 2));
      this.logger.debug(`shelly at ${ip} voltage: ${voltage}V`);
      return voltage;
    } catch (err) {
      this.logger.error(`falha ao obter voltagem de shelly em ${ip}`, err);
      return 0;
    }
  }

  /**
   * Obtém corrente (em Amperes) de um dispositivo Shelly
   * @param ip Endereço IP do dispositivo
   * @returns Corrente em A
   */
  async getCurrent(ip: string): Promise<number> {
    try {
      const payload = {
        id: 1,
        method: 'Switch.GetStatus',
        params: { id: 0 },
      };

      const observable = this.httpService.post(`http://${ip}/rpc`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);
      // Shelly Gen2: current
      const current = response.data?.result?.current ?? 0;
      this.logger.debug(`shelly at ${ip} current: ${current}A`);
      return current;
    } catch (err) {
      this.logger.error(`falha ao obter corrente de shelly em ${ip}`, err);
      return 0;
    }
  }

  async ping(ip: string): Promise<boolean> {
    try {
      const observable = this.httpService.get(`http://${ip}/rpc`, {
        timeout: 2000,
      });
      await lastValueFrom(observable);
      return true;
    } catch (err: any) {
      // axios gera erro para 4xx/5xx - se houver resposta significa que o host e alcancavel
      if (err?.response) {
        this.logger.debug(
          `Ping to ${ip} returned status ${err.response.status} (treated as reachable)`,
        );
        return true;
      }
      // tenta a raiz como fallback
      try {
        const observable2 = this.httpService.get(`http://${ip}/`, {
          timeout: 2000,
        });
        await lastValueFrom(observable2);
        return true;
      } catch (err2: any) {
        this.logger.debug(`Ping to ${ip} failed: ${err2?.message ?? err2}`);
        return false;
      }
    }
  }

  async createTimer(
    ip: string,
    hour: number,
    minute: number,
    days: number[] | null,
    onValue: boolean = true,
    enabled: boolean = true,
  ) {
    const timespec = buildTimespec(hour,minute,days);
    const payload = {
      enable: enabled,
      timespec,
      calls: [
        {
        method: 'Switch.Set',
        //on é true para ligar e false para desligar 
        params: { id: 0, on: onValue },
        },
      ],
    };

    try {
      const observable = this.httpService.post(`http://${ip}/rpc/Schedule.Create`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await lastValueFrom(observable);
      this.logger.log(`Created timer on ${ip}`, JSON.stringify(response.data));
      return response.data; //SE FOR PARA MANDAR ID PARA BD
    } catch (err) {
      this.logger.error(`Failed to create timer on Shelly at ${ip}`, err);
      throw err;
    }
  }

  async createTimerInterval(ip: string, onValue: boolean = true, toggleAfter: number) {
    const payload = {
      id: 0,
      on: onValue,
      toggle_after: toggleAfter
    };

    try {
      const observable = this.httpService.post(`http://${ip}/rpc/Switch.Set`, payload,
        { headers: { 'Content-Type': 'application/json' }, 
      });

      const response = await lastValueFrom(observable);
      this.logger.log(`Switched using toggle_after on ${ip}`, JSON.stringify(response.data));
      return response.data;
    } catch (err) {
      this.logger.error(`Failed to set switch state on Shelly at ${ip}`, err);
      throw err;
    }
  }

  async listTimers(ip: string) {
    try {
      const observable = this.httpService.get(`http://${ip}/rpc/Schedule.List`);
      const response = await lastValueFrom(observable);

      this.logger.log(`Timers on ${ip}`, JSON.stringify(response.data));
      return response.data; 
    } catch (err) {
      this.logger.error(`Failed to list timers on Shelly at ${ip}`, err);
      return null;
    }
  }

  async deleteTimer(ip: string, scheduleId: number) {
    const payload = { id: scheduleId };
    try {
      const observable = this.httpService.post(`http://${ip}/rpc/Schedule.Delete`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await lastValueFrom(observable);
      this.logger.log(`Deleted timer ${scheduleId} on ${ip}`, JSON.stringify(response.data));
      return response.data;
    } catch (err) {
      this.logger.error(`Failed to delete timer ${scheduleId} on Shelly at ${ip}`, err);
      throw err;
    }
  }

  async setTimerEnabled(ip: string, scheduleId: number, enabled: boolean) {
    const payload = { id: scheduleId, enable: enabled };
    try {
      const observable = this.httpService.post(`http://${ip}/rpc/Schedule.Update`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await lastValueFrom(observable);
      this.logger.log(
        `Updated timer ${scheduleId} on ${ip} enable=${enabled}`,
        JSON.stringify(response.data),
      );
      return response.data;
    } catch (err) {
      this.logger.error(
        `Failed to update timer ${scheduleId} enable=${enabled} on Shelly at ${ip}`,
        err,
      );
      throw err;
    }
  }

  /**
   * Ativa o modo eco (desliga LED) em dispositivo Shelly Gen2
   * @param ip Endereço IP do dispositivo
   * @returns resultado com indicador de reboot necessário
   */
  async enableEcoMode(ip: string): Promise<{ success: boolean; restart_required: boolean }> {
    try {
      this.logger.log(`[enableEcoMode] Iniciando ativação do eco mode em ${ip}`);

      // Verifica se o dispositivo suporta eco mode
      const deviceInfo = await this.getDeviceInfo(ip);
      if (!deviceInfo.supportsEcoMode) {
        this.logger.warn(`[enableEcoMode] Dispositivo ${ip} não suporta eco mode`);
        return { success: false, restart_required: false };
      }

      // Obtém o status atual do eco mode
      const currentStatus = await this.getEcoModeStatus(ip);
      this.logger.log(`[enableEcoMode] Status atual do eco mode em ${ip}: ${currentStatus}`);

      if (currentStatus) {
        this.logger.log(`[enableEcoMode] Eco mode já está ativado em ${ip}`);
        return { success: true, restart_required: false };
      }

      // Configura o eco mode usando GET com query parameters
      const config = JSON.stringify({ device: { eco_mode: true } });
      const url = `http://${ip}/rpc/Sys.SetConfig?config=${encodeURIComponent(config)}`;

      this.logger.log(`[enableEcoMode] URL: ${url}`);

      const observable = this.httpService.get(url, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);
      this.logger.log(`[enableEcoMode] Resposta da configuração em ${ip}:`, JSON.stringify(response.data));

      const restartRequired = response.data?.restart_required === true;

      // Verifica se houve erro na resposta
      if (response.data?.error) {
        this.logger.error(`[enableEcoMode] Erro na configuração: ${response.data.error.message || response.data.error}`);
        return { success: false, restart_required: false };
      }

      // Pequena pausa para permitir que a configuração seja aplicada
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verifica se a mudança foi aplicada
      const newStatus = await this.getEcoModeStatus(ip);
      this.logger.log(`[enableEcoMode] Status após configuração em ${ip}: ${newStatus}`);

      if (newStatus) {
        this.logger.log(`[enableEcoMode] Eco mode ativado com sucesso em ${ip}`);
        return { success: true, restart_required: restartRequired };
      }

      // Se a configuração não foi aplicada imediatamente, indica reboot necessário
      if (restartRequired) {
        this.logger.warn(`[enableEcoMode] Configuração requer reboot em ${ip}`);
        return { success: true, restart_required: true };
      }

      return { success: false, restart_required: false };
    } catch (err) {
      this.logger.error(`[enableEcoMode] Falha ao ativar eco mode em ${ip}:`, err);
      return { success: false, restart_required: false };
    }
  }

  /**
   * Desativa o modo eco (liga LED) em dispositivo Shelly Gen2
   * @param ip Endereço IP do dispositivo
   * @returns resultado com indicador de reboot necessário
   */
  async disableEcoMode(ip: string): Promise<{ success: boolean; restart_required: boolean }> {
    try {
      this.logger.log(`[disableEcoMode] Iniciando desativação do eco mode em ${ip}`);

      // Verifica se o dispositivo suporta eco mode
      const deviceInfo = await this.getDeviceInfo(ip);
      if (!deviceInfo.supportsEcoMode) {
        this.logger.warn(`[disableEcoMode] Dispositivo ${ip} não suporta eco mode`);
        return { success: false, restart_required: false };
      }

      // Obtém o status atual do eco mode
      const currentStatus = await this.getEcoModeStatus(ip);
      this.logger.log(`[disableEcoMode] Status atual do eco mode em ${ip}: ${currentStatus}`);

      if (!currentStatus) {
        this.logger.log(`[disableEcoMode] Eco mode já está desativado em ${ip}`);
        return { success: true, restart_required: false };
      }

      // Configura o eco mode usando GET com query parameters
      const config = JSON.stringify({ device: { eco_mode: false } });
      const url = `http://${ip}/rpc/Sys.SetConfig?config=${encodeURIComponent(config)}`;

      this.logger.log(`[disableEcoMode] URL: ${url}`);

      const observable = this.httpService.get(url, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);
      this.logger.log(`[disableEcoMode] Resposta da configuração em ${ip}:`, JSON.stringify(response.data));

      const restartRequired = response.data?.restart_required === true;

      // Verifica se houve erro na resposta
      if (response.data?.error) {
        this.logger.error(`[disableEcoMode] Erro na configuração: ${response.data.error.message || response.data.error}`);
        return { success: false, restart_required: false };
      }

      // Pequena pausa para permitir que a configuração seja aplicada
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verifica se a mudança foi aplicada
      const newStatus = await this.getEcoModeStatus(ip);
      this.logger.log(`[disableEcoMode] Status após configuração em ${ip}: ${newStatus}`);

      if (!newStatus) {
        this.logger.log(`[disableEcoMode] Eco mode desativado com sucesso em ${ip}`);
        return { success: true, restart_required: restartRequired };
      }

      // Se a configuração não foi aplicada imediatamente, indica reboot necessário
      if (restartRequired) {
        this.logger.warn(`[disableEcoMode] Configuração requer reboot em ${ip}`);
        return { success: true, restart_required: true };
      }

      return { success: false, restart_required: false };
    } catch (err) {
      this.logger.error(`[disableEcoMode] Falha ao desativar eco mode em ${ip}:`, err);
      return { success: false, restart_required: false };
    }
  }

  async reboot(ip: string): Promise<void> {
    await this.rebootDevice(ip);
  }

  /**
   * Reinicializa o dispositivo Shelly
   * @param ip Endereço IP do dispositivo
   */
  private async rebootDevice(ip: string): Promise<void> {
    try {
      // Forma mais consistente em Gen2: POST direto ao método
      const url = `http://${ip}/rpc/Sys.Reboot`;
      this.logger.log(`[rebootDevice] Reinicializando dispositivo ${ip} via POST: ${url}`);

      const observable = this.httpService.post(url, {}, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 3000,
      });

      await lastValueFrom(observable);
      this.logger.log(`[rebootDevice] Dispositivo ${ip} reinicializado (POST /rpc/Sys.Reboot)`);
      return;
    } catch (err) {
      this.logger.warn(
        `[rebootDevice] Falha ao reinicializar dispositivo ${ip} via POST /rpc/Sys.Reboot, tentando GET`,
        err,
      );
    }

    try {
      // Fallback: GET
      const url = `http://${ip}/rpc/Sys.Reboot`;
      this.logger.log(`[rebootDevice] Reinicializando dispositivo ${ip} via GET: ${url}`);

      const observable = this.httpService.get(url, { timeout: 3000 });
      await lastValueFrom(observable);
      this.logger.log(`[rebootDevice] Dispositivo ${ip} reinicializado (GET /rpc/Sys.Reboot)`);
      return;
    } catch (err2) {
      this.logger.warn(
        `[rebootDevice] Falha ao reinicializar dispositivo ${ip} via GET /rpc/Sys.Reboot, tentando JSON-RPC`,
        err2,
      );
    }

    // Último fallback: JSON-RPC
    try {
      const payload = { id: 1, method: 'Sys.Reboot', params: {} };
      const observable = this.httpService.post(`http://${ip}/rpc`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 3000,
      });
      await lastValueFrom(observable);
      this.logger.log(`[rebootDevice] Dispositivo ${ip} reinicializado (POST /rpc JSON-RPC)`);
    } catch (postErr) {
      this.logger.warn(`[rebootDevice] Falha ao reinicializar dispositivo ${ip} via JSON-RPC`, postErr);
      // Não lança erro: o reboot pode fechar a conexão e parecer erro
    }

    return;
  }

  async getSysStatus(ip: string): Promise<{ uptime?: number; restart_required?: boolean }> {
    try {
      const url = `http://${ip}/rpc/Sys.GetStatus`;
      const observable = this.httpService.get(url, { timeout: 5000 });
      const response = await lastValueFrom(observable);
      return {
        uptime: response.data?.uptime,
        restart_required: response.data?.restart_required,
      };
    } catch (err) {
      this.logger.warn(`[getSysStatus] Falha ao obter Sys.GetStatus em ${ip}`, err);
      return {};
    }
  }

  /**
   * Obtém informações do dispositivo para verificar suporte ao eco mode
   * @param ip Endereço IP do dispositivo
   * @returns informações do dispositivo
   */
  async getDeviceInfo(ip: string): Promise<{ supportsEcoMode: boolean; model?: string }> {
    try {
      // Tenta obter status usando GET
      const url = `http://${ip}/rpc/Sys.GetStatus`;
      this.logger.log(`[getDeviceInfo] Obtendo informações do dispositivo ${ip} via GET: ${url}`);

      const observable = this.httpService.get(url);

      const response = await lastValueFrom(observable);
      // Baseado na documentação, Sys.GetStatus retorna diretamente os dados do sistema
      const model = response.data?.model || response.data?.type || 'unknown';

      // Eco mode é suportado principalmente em dispositivos Gen2 (Plus, Pro)
      // Vamos ser mais permissivos e assumir que todos os dispositivos Gen2 suportam
      const supportsEcoMode = model.includes('Plus') ||
                             model.includes('Pro') ||
                             model.includes('Gen2') ||
                             model.includes('Shelly') ||
                             true; // Assume suporte por padrão

      this.logger.debug(`[getDeviceInfo] Dispositivo ${ip}: ${model}, suporta eco mode: ${supportsEcoMode}`);

      return { supportsEcoMode, model };
    } catch (err) {
      this.logger.warn(`[getDeviceInfo] Não foi possível obter informações do dispositivo ${ip} via GET, tentando POST`, err);

      // Fallback para POST
      try {
        const payload = {
          id: 1,
          method: 'Sys.GetStatus'
        };

        const observable = this.httpService.post(`http://${ip}/rpc`, payload, {
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await lastValueFrom(observable);
        // Baseado na documentação, Sys.GetStatus retorna diretamente os dados do sistema
        const model = response.data?.model || response.data?.type || 'unknown';

        // Eco mode é suportado principalmente em dispositivos Gen2 (Plus, Pro)
        // Vamos ser mais permissivos e assumir que todos os dispositivos Gen2 suportam
        const supportsEcoMode = model.includes('Plus') ||
                               model.includes('Pro') ||
                               model.includes('Gen2') ||
                               model.includes('Shelly') ||
                               true; // Assume suporte por padrão

        this.logger.debug(`[getDeviceInfo] Dispositivo ${ip}: ${model}, suporta eco mode: ${supportsEcoMode}`);

        return { supportsEcoMode, model };
      } catch (postErr) {
        this.logger.warn(`[getDeviceInfo] Não foi possível obter informações do dispositivo ${ip}`, postErr);
        // Assume que suporta por padrão para não bloquear a funcionalidade
        return { supportsEcoMode: true };
      }
    }
  }

  /**
   * Verifica se o dispositivo suporta eco mode tentando uma configuração de teste
   * @param ip Endereço IP do dispositivo
   * @returns true se suporta
   */
  private async testEcoModeSupport(ip: string): Promise<boolean> {
    try {
      // Primeiro obtém o status atual
      const currentStatus = await this.getEcoModeStatus(ip);

      // Tenta configurar o eco mode com o valor oposto usando GET
      const testValue = !currentStatus;
      const config = JSON.stringify({ device: { eco_mode: testValue } });
      const url = `http://${ip}/rpc/Sys.SetConfig?config=${encodeURIComponent(config)}`;

      this.logger.log(`[testEcoModeSupport] Testando suporte com URL: ${url}`);

      const observable = this.httpService.get(url, {
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await lastValueFrom(observable);

      // Se a configuração foi aceita (sem erro), o dispositivo suporta
      if (response.data && !response.data.error) {
        this.logger.debug(`[testEcoModeSupport] Dispositivo ${ip} suporta eco mode`);

        // Restaura o valor original
        const restoreConfig = JSON.stringify({ device: { eco_mode: currentStatus } });
        const restoreUrl = `http://${ip}/rpc/Sys.SetConfig?config=${encodeURIComponent(restoreConfig)}`;

        try {
          const restoreObservable = this.httpService.get(restoreUrl, {
            headers: { 'Content-Type': 'application/json' },
          });
          await lastValueFrom(restoreObservable);
          this.logger.debug(`[testEcoModeSupport] Valor original restaurado em ${ip}`);
        } catch (restoreErr) {
          this.logger.warn(`[testEcoModeSupport] Falha ao restaurar valor original em ${ip}`, restoreErr);
        }

        return true;
      }

      return false;
    } catch (err) {
      this.logger.debug(`[testEcoModeSupport] Dispositivo ${ip} não suporta eco mode:`, err);
      return false;
    }
  }

  /**
   * Obtém o status do modo eco
   * @param ip Endereço IP do dispositivo
   * @returns true se eco mode ativo
   */
  async getEcoModeStatus(ip: string): Promise<boolean> {
    try {
      this.logger.log(`[getEcoModeStatus] Obtendo status do eco mode para ${ip}`);

      // Obtém a configuração usando GET
      const url = `http://${ip}/rpc/Sys.GetConfig`;
      this.logger.log(`[getEcoModeStatus] URL: ${url}`);

      const observable = this.httpService.get(url, { timeout: 5000 });

      const response = await lastValueFrom(observable);
      this.logger.log(`[getEcoModeStatus] Resposta da configuração em ${ip}:`, JSON.stringify(response.data));

      // Verifica se houve erro na resposta
      if (response.data?.error) {
        this.logger.error(`[getEcoModeStatus] Erro ao obter configuração: ${response.data.error.message || response.data.error}`);
        return false;
      }

      // Extrai o status do eco mode da resposta
      const ecoMode = response.data?.device?.eco_mode ?? false;
      this.logger.log(`[getEcoModeStatus] Status do eco mode em ${ip}: ${ecoMode}`);
      return ecoMode;
    } catch (err) {
      this.logger.error(`Failed to get eco mode status on Shelly at ${ip}`, err);
      return false;
    }
  }
  async discoverDevicesLAN(customIPs?: string[]): Promise<any[]> {
    const devices: any[] = [];
    const ipsToTest: Set<string> = new Set();

    // Se IPs customizados foram fornecidos, testar primeiro
    if (customIPs && Array.isArray(customIPs)) {
      customIPs.forEach(ip => ipsToTest.add(ip));
    }

    // Adicionar IPs padrão da rede local
    const baseIP = '192.168.1';
    const maxIP = 254;
    for (let i = 1; i <= maxIP; i++) {
      ipsToTest.add(`${baseIP}.${i}`);
    }

    this.logger.log(`Iniciando descoberta de dispositivos Shelly (${ipsToTest.size} IPs a testar)...`);

    const testConcurrency = 15;
    const ipsArray = Array.from(ipsToTest);

    // Testar IPs em lotes
    for (let i = 0; i < ipsArray.length; i += testConcurrency) {
      const batch = ipsArray.slice(i, i + testConcurrency);
      const results = await Promise.allSettled(
        batch.map(ip => this.checkIfShelly(ip)),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'fulfilled' && (result as PromiseFulfilledResult<any>).value) {
          const device = (result as PromiseFulfilledResult<any>).value;
          devices.push(device);
          this.logger.log(`✓ Dispositivo Shelly encontrado: ${device.ip} - ${device.name} (Gen${device.gen})`);
        }
      }

      // Pequena pausa entre lotes para não sobrecarregar a rede
      if (i + testConcurrency < ipsArray.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.logger.log(`Descoberta concluída: ${devices.length} dispositivo(s) Shelly encontrado(s)`);
    return devices;
  }

  /**
   * Verifica se um IP contém um dispositivo Shelly
   * @param ip Endereço IP a testar
   * @returns dados do dispositivo ou null
   */
  private async checkIfShelly(ip: string): Promise<any | null> {
    try {
      // Try Shelly Gen 2 Sys.GetStatus first
      const observable = this.httpService.get(`http://${ip}/rpc/Sys.GetStatus`, {
        timeout: 1500,
      });

      const response = await lastValueFrom(observable);

      // Sys.GetStatus returns the data directly, not nested
      if (response.data?.mac) {
        return {
          ip,
          id: response.data.mac,
          device_id: response.data.mac,
          name: 'Shelly Device', // No hostname in Sys.GetStatus
          fw: response.data.fw_id,
          gen: 2,
          model: 'Shelly Plus (Gen2)',
        };
      }

      return null;
    } catch (error) {
      // Tentar Shelly.GetStatus como fallback (Gen 2 compatibilidade)
      try {
        const observable = this.httpService.get(`http://${ip}/rpc/Shelly.GetStatus`, {
          timeout: 1500,
        });

        const response = await lastValueFrom(observable);

        if (response.data?.sys?.mac) {
          return {
            ip,
            id: response.data.sys.mac,
            device_id: response.data.sys.mac,
            name: response.data.sys.hostname || response.data.sys.mac,
            fw: response.data.sys.fw_id,
            gen: 2,
            model: 'Shelly Plus (Gen2)',
          };
        }

        return null;
      } catch (err) {
        // Tentar Gen 1 API
        try {
          const observable = this.httpService.get(`http://${ip}/status`, {
            timeout: 1500,
          });

          const response = await lastValueFrom(observable);

          if (response.data?.mac) {
            return {
              ip,
              id: response.data.mac,
              device_id: response.data.mac,
              name: response.data.hostname || response.data.mac,
              fw: response.data.fw_ver,
              gen: 1,
              model: response.data.type || 'Shelly Gen1',
            };
          }

          return null;
        } catch (err2) {
          // Silenciosamente ignorar IPs não-Shelly
          return null;
        }
      }
    }
  }

}

function buildTimespec(hour: number, minute: number, days?: number[] | null): string {
  const seconds = 0;

  if (hour < 0 || hour > 23) throw new Error('Invalid hour');
  if (minute < 0 || minute > 59) throw new Error('Invalid minute');

  const minutesStr = String(minute).padStart(2, '0');
  const hourStr = String(hour).padStart(2, '0');

  let dow = '*';
  if (Array.isArray(days) && days.length > 0) {
    dow = days.map(d => {
      if (d < 0 || d > 7) throw new Error('Invalid day value');
      return String(d);
    }).join(',');
  }

  // segundos minutos horas dia-do-mes mes dia-da-semana
  return `${seconds} ${minutesStr} ${hourStr} * * ${dow}`;
}