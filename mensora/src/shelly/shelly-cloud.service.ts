/**
 * Serviço para integração com Shelly Cloud
 * Permite obter estado e consumo de dispositivos Shelly via cloud
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ShellyCloudService {
  private readonly logger = new Logger(ShellyCloudService.name);
  private readonly baseUrl: string;
  private readonly timeout = 5000;
  private readonly authToken: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('SHELLY_API_ENDPOINT', 'https://shelly-203-eu.shelly.cloud');
    this.authToken = this.config.get<string>('SHELLY_AUTH_TOKEN', '');
    if (this.authToken) {
      this.logger.log(`Serviço Shelly Cloud pronto com autenticação. Endpoint: ${this.baseUrl}`);
    } else {
      this.logger.warn('Serviço Shelly Cloud sem autenticação - funcionalidade limitada');
    }
  }

  /**
   * Obtém lista de dispositivos Shelly Cloud
   * @returns array de dispositivos
   */
  async getDeviceList(): Promise<any[]> {
    try {
      if (!this.authToken) {
        this.logger.warn('Não há AUTH_TOKEN configurado para Shelly Cloud');
        return [];
      }

      this.logger.log(`Conectando a: ${this.baseUrl}/user/devices com token: ${this.authToken.substring(0, 10)}...`);

      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/user/devices`, {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
          },
          timeout: this.timeout,
        }),
      );

      // Verifica se a resposta é um erro da API
      if (response.data?.isok === false) {
        this.logger.error(`Erro da API Shelly Cloud:`, response.data.errors);
        return [];
      }

      this.logger.log(`Resposta da API:`, JSON.stringify(response.data, null, 2));
      this.logger.debug(`Dispositivos Shelly Cloud obtidos: ${response.data.devices?.length || 0}`);
      return response.data.devices || [];
    } catch (error: any) {
      this.logger.error(`Falha ao obter lista de dispositivos Shelly Cloud:`, error?.response?.data || error?.message);
      return [];
    }
  }

  /**
   * Obtém status de um dispositivo específico via Shelly Cloud
   * Compatível com Gen 1, Gen 2 e Gen 3
   * @param deviceId ID do dispositivo
   * @returns status completo do dispositivo
   */
  private async getDeviceStatus(deviceId: string): Promise<any> {
    try {
      if (!this.authToken) {
        return null;
      }

      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/device/status`, {
          params: { id: deviceId },
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
          },
          timeout: this.timeout,
        }),
      );

      if (response.data?.isok === false) {
        this.logger.debug(`Erro ao obter status do dispositivo ${deviceId}: ${JSON.stringify(response.data.errors)}`);
        return null;
      }

      return response.data;
    } catch (error: any) {
      this.logger.debug(`Falha ao obter status do dispositivo ${deviceId}: ${error?.message}`);
      return null;
    }
  }

  /**
   * Identifica a geração do dispositivo baseado na estrutura de dados
   * @param data dados do dispositivo
   * @returns "gen1" | "gen2" | "gen3"
   */
  private detectGeneration(data: any): string {
    // Gen 2/3: têm "switches", "lights", "inputs" etc como arrays de objetos
    if (data?.switches || data?.lights || data?.em || data?.pm1) {
      return 'gen2';
    }
    // Gen 1: tem "relays", "emeters", "lights" como arrays/objetos simples
    if (data?.relays || data?.emeters || data?.meter) {
      return 'gen1';
    }
    return 'gen1'; // Default
  }

  /**
   * Obtém consumo de potência atual (em Watts) via Shelly Cloud
   * Compatível com Gen 1, Gen 2 e Gen 3
   * @param deviceId ID do dispositivo Shelly
   * @returns consumo em watts
   */
  async getPowerConsumption(deviceId: string): Promise<number> {
    try {
      const status = await this.getDeviceStatus(deviceId);
      if (!status) return 0;

      const gen = this.detectGeneration(status.data);
      this.logger.debug(`Device ${deviceId} detected as ${gen}`);

      // Gen 2+: switches array com apower
      if (status.data?.switches?.[0]?.apower !== undefined) {
        const power = status.data.switches[0].apower;
        this.logger.debug(`Shelly Cloud power para ${deviceId} (Gen2): ${power}W`);
        return typeof power === 'number' ? power : 0;
      }

      // Gen 2+: direto em apower
      if (status.data?.apower !== undefined) {
        return typeof status.data.apower === 'number' ? status.data.apower : 0;
      }

      // Gen 1: emeters array
      if (status.data?.emeters?.[0]?.power !== undefined) {
        const power = status.data.emeters[0].power;
        this.logger.debug(`Shelly Cloud power para ${deviceId} (Gen1): ${power}W`);
        return typeof power === 'number' ? power : 0;
      }

      // Gen 1: meter object
      if (status.data?.meter?.power !== undefined) {
        const power = status.data.meter.power;
        this.logger.debug(`Shelly Cloud power para ${deviceId} (Gen1 meter): ${power}W`);
        return typeof power === 'number' ? power : 0;
      }

      return 0;
    } catch (error: any) {
      this.logger.warn(`Falha ao obter potência via Shelly Cloud para ${deviceId}: ${error?.message}`);
      return 0;
    }
  }

  /**
   * Obtém consumo total acumulado (em Wh) via Shelly Cloud
   * Compatível com Gen 1, Gen 2 e Gen 3
   * @param deviceId ID do dispositivo Shelly
   * @returns consumo total em Wh
   */
  async getTotalConsumption(deviceId: string): Promise<number> {
    try {
      const status = await this.getDeviceStatus(deviceId);
      if (!status) return 0;

      // Gen 2+: switches array com aenergy.total
      if (status.data?.switches?.[0]?.aenergy?.total !== undefined) {
        const energy = status.data.switches[0].aenergy.total;
        this.logger.debug(`Shelly Cloud energy para ${deviceId} (Gen2): ${energy}Wh`);
        return typeof energy === 'number' ? energy : 0;
      }

      // Gen 2+: aenergy direto
      if (status.data?.aenergy?.total !== undefined) {
        const energy = status.data.aenergy.total;
        return typeof energy === 'number' ? energy : 0;
      }

      // Gen 1: emeters array com total
      if (status.data?.emeters?.[0]?.total !== undefined) {
        const energy = status.data.emeters[0].total;
        this.logger.debug(`Shelly Cloud energy para ${deviceId} (Gen1): ${energy}Wh`);
        return typeof energy === 'number' ? energy : 0;
      }

      // Gen 1: meter object
      if (status.data?.meter?.total !== undefined) {
        // Gen1 "meter.total" é reportado em Watt-minutes (Wmin) em vários dispositivos (ex.: Shelly1PM, 1L, 2/2.5, Plug)
        // Converter Wmin -> Wh dividindo por 60 para manter consistência com emeters.total (Wh) e Gen2 aenergy.total (Wh)
        const energyWmin = status.data.meter.total;
        if (typeof energyWmin === 'number') {
          const energyWh = energyWmin / 60;
          this.logger.debug(`Shelly Cloud energy para ${deviceId} (Gen1 meter): ${energyWmin}Wmin => ${energyWh}Wh`);
          return energyWh;
        }
        return 0;
      }

      return 0;
    } catch (error: any) {
      this.logger.warn(`Falha ao obter energia via Shelly Cloud para ${deviceId}: ${error?.message}`);
      return 0;
    }
  }

  /**
   * Obtém estado do dispositivo via Shelly Cloud
   * Compatível com Gen 1, Gen 2 e Gen 3
   * @param deviceId ID do dispositivo Shelly
   * @returns estado booleano
   */
  async getStatus(deviceId: string): Promise<boolean> {
    try {
      const status = await this.getDeviceStatus(deviceId);
      if (!status) return false;

      // Gen 2+: switches array com output
      if (status.data?.switches?.[0]?.output !== undefined) {
        const output = status.data.switches[0].output;
        this.logger.debug(`Shelly Cloud status para ${deviceId} (Gen2): ${output}`);
        return output === true;
      }

      // Gen 2+: output direto
      if (status.data?.output !== undefined) {
        return status.data.output === true;
      }

      // Gen 1: relays array
      if (status.data?.relays?.[0]?.ison !== undefined) {
        const isOn = status.data.relays[0].ison;
        this.logger.debug(`Shelly Cloud status para ${deviceId} (Gen1): ${isOn}`);
        return isOn === true;
      }

      // Gen 1: relay object
      if (status.data?.relay?.ison !== undefined) {
        return status.data.relay.ison === true;
      }

      // Gen 1: lights array (para Shelly Color)
      if (status.data?.lights?.[0]?.ison !== undefined) {
        return status.data.lights[0].ison === true;
      }

      return false;
    } catch (error: any) {
      this.logger.warn(`Falha ao obter status via Shelly Cloud para ${deviceId}: ${error?.message}`);
      return false;
    }
  }

  /**
   * Obtém voltagem via Shelly Cloud
   * Compatível com Gen 1, Gen 2 e Gen 3
   * @param deviceId ID do dispositivo Shelly
   * @returns voltagem em V
   */
  async getVoltage(deviceId: string): Promise<number> {
    try {
      const status = await this.getDeviceStatus(deviceId);
      if (!status) return 0;

      // Gen 2+: switches array (em decivolts, dividir por 10)
      if (status.data?.switches?.[0]?.voltage !== undefined) {
        const voltage = status.data.switches[0].voltage;
        if (typeof voltage === 'number') {
          const voltageV = voltage / 10;
          this.logger.debug(`Shelly Cloud voltage para ${deviceId} (Gen2): ${voltageV}V`);
          return voltageV;
        }
      }

      // Gen 2+: voltage direto
      if (status.data?.voltage !== undefined && typeof status.data.voltage === 'number') {
        return status.data.voltage / 10;
      }

      // Gen 1: emeters array (em volts direto)
      if (status.data?.emeters?.[0]?.voltage !== undefined) {
        const voltage = status.data.emeters[0].voltage;
        if (typeof voltage === 'number') {
          this.logger.debug(`Shelly Cloud voltage para ${deviceId} (Gen1): ${voltage}V`);
          return voltage;
        }
      }

      // Gen 1: meter object
      if (status.data?.meter?.voltage !== undefined && typeof status.data.meter.voltage === 'number') {
        return status.data.meter.voltage;
      }

      return 0;
    } catch (error: any) {
      this.logger.warn(`Falha ao obter voltagem via Shelly Cloud para ${deviceId}: ${error?.message}`);
      return 0;
    }
  }

  /**
   * Obtém corrente via Shelly Cloud
   * Compatível com Gen 1, Gen 2 e Gen 3
   * @param deviceId ID do dispositivo Shelly
   * @returns corrente em A
   */
  async getCurrent(deviceId: string): Promise<number> {
    try {
      const status = await this.getDeviceStatus(deviceId);
      if (!status) return 0;

      // Gen 2+: switches array (em miliamperes, dividir por 1000)
      if (status.data?.switches?.[0]?.current !== undefined) {
        const current = status.data.switches[0].current;
        if (typeof current === 'number') {
          const currentA = current / 1000;
          this.logger.debug(`Shelly Cloud current para ${deviceId} (Gen2): ${currentA}A`);
          return currentA;
        }
      }

      // Gen 2+: current direto
      if (status.data?.current !== undefined && typeof status.data.current === 'number') {
        return status.data.current / 1000;
      }

      // Gen 1: emeters array (em amperes direto)
      if (status.data?.emeters?.[0]?.current !== undefined) {
        const current = status.data.emeters[0].current;
        if (typeof current === 'number') {
          this.logger.debug(`Shelly Cloud current para ${deviceId} (Gen1): ${current}A`);
          return current;
        }
      }

      // Gen 1: meter object
      if (status.data?.meter?.current !== undefined && typeof status.data.meter.current === 'number') {
        return status.data.meter.current;
      }

      return 0;
    } catch (error: any) {
      this.logger.warn(`Falha ao obter corrente via Shelly Cloud para ${deviceId}: ${error?.message}`);
      return 0;
    }
  }

  /**
   * Liga um dispositivo Shelly via Cloud
   * Compatível com Gen 1, Gen 2 e Gen 3
   * @param deviceId ID do dispositivo
   * @returns sucesso da operação
   */
  async turnOn(deviceId: string): Promise<boolean> {
    try {
      if (!this.authToken) {
        this.logger.warn('Não há AUTH_TOKEN configurado para Shelly Cloud');
        return false;
      }

      this.logger.log(`Ligando dispositivo Shelly ${deviceId} via Cloud...`);

      // Try Gen 2 command first (Switch.Set)
      let response = await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/device/command`,
          {
            id: deviceId,
            method: 'Switch.Set',
            params: { id: 0, on: true },
          },
          {
            headers: {
              'Authorization': `Bearer ${this.authToken}`,
            },
            timeout: this.timeout,
          },
        ),
      ).catch(() => null);

      // If Gen 2 fails, try Gen 1 command (Relay.Set)
      if (!response || response.data?.isok === false) {
        this.logger.debug(`Gen 2 command falhou para ${deviceId}, tentando Gen 1...`);
        response = await firstValueFrom(
          this.http.post(
            `${this.baseUrl}/device/command`,
            {
              id: deviceId,
              method: 'Relay.Set',
              params: { id: 0, on: true },
            },
            {
              headers: {
                'Authorization': `Bearer ${this.authToken}`,
              },
              timeout: this.timeout,
            },
          ),
        ).catch(() => null);
      }

      if (!response) {
        this.logger.error(`Timeout ao tentar ligar dispositivo ${deviceId}`);
        return false;
      }

      if (response.data?.isok === false) {
        this.logger.error(`Erro ao ligar dispositivo ${deviceId}:`, response.data.errors);
        return false;
      }

      this.logger.log(`Dispositivo ${deviceId} ligado com sucesso via Cloud`);
      return true;
    } catch (error: any) {
      this.logger.error(`Falha ao ligar dispositivo ${deviceId} via Cloud:`, error?.message);
      return false;
    }
  }

  /**
   * Desliga um dispositivo Shelly via Cloud
   * Compatível com Gen 1, Gen 2 e Gen 3
   * @param deviceId ID do dispositivo
   * @returns sucesso da operação
   */
  async turnOff(deviceId: string): Promise<boolean> {
    try {
      if (!this.authToken) {
        this.logger.warn('Não há AUTH_TOKEN configurado para Shelly Cloud');
        return false;
      }

      this.logger.log(`Desligando dispositivo Shelly ${deviceId} via Cloud...`);

      // Try Gen 2 command first (Switch.Set)
      let response = await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/device/command`,
          {
            id: deviceId,
            method: 'Switch.Set',
            params: { id: 0, on: false },
          },
          {
            headers: {
              'Authorization': `Bearer ${this.authToken}`,
            },
            timeout: this.timeout,
          },
        ),
      ).catch(() => null);

      // If Gen 2 fails, try Gen 1 command (Relay.Set)
      if (!response || response.data?.isok === false) {
        this.logger.debug(`Gen 2 command falhou para ${deviceId}, tentando Gen 1...`);
        response = await firstValueFrom(
          this.http.post(
            `${this.baseUrl}/device/command`,
            {
              id: deviceId,
              method: 'Relay.Set',
              params: { id: 0, on: false },
            },
            {
              headers: {
                'Authorization': `Bearer ${this.authToken}`,
              },
              timeout: this.timeout,
            },
          ),
        ).catch(() => null);
      }

      if (!response) {
        this.logger.error(`Timeout ao tentar desligar dispositivo ${deviceId}`);
        return false;
      }

      if (response.data?.isok === false) {
        this.logger.error(`Erro ao desligar dispositivo ${deviceId}:`, response.data.errors);
        return false;
      }

      this.logger.log(`Dispositivo ${deviceId} desligado com sucesso via Cloud`);
      return true;
    } catch (error: any) {
      this.logger.error(`Falha ao desligar dispositivo ${deviceId} via Cloud:`, error?.message);
      return false;
    }
  }
}
