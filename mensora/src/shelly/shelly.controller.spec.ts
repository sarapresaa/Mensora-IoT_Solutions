import { Test, TestingModule } from '@nestjs/testing';
import { ShellyController } from './shelly.controller';
import { ShellyService } from './shelly.service';
import { ShellyCloudService } from './shelly-cloud.service';

describe('ShellyController', () => {
  let controller: ShellyController;
  let shellyService: jest.Mocked<ShellyService>;
  let shellyCloudService: jest.Mocked<ShellyCloudService>;

  beforeEach(async () => {
    shellyService = {
      turnOn: jest.fn(),
      turnOff: jest.fn(),
      ping: jest.fn(),
      createTimer: jest.fn(),
      createTimerInterval: jest.fn(),
      listTimers: jest.fn(),
      deleteTimer: jest.fn(),
      discoverDevicesLAN: jest.fn(),
      getPowerConsumption: jest.fn(),
      getTotalConsumption: jest.fn(),
      getVoltage: jest.fn(),
      getCurrent: jest.fn(),
    } as unknown as jest.Mocked<ShellyService>;

    shellyCloudService = {
      getPowerConsumption: jest.fn(),
      getTotalConsumption: jest.fn(),
      getVoltage: jest.fn(),
      getCurrent: jest.fn(),
      getDeviceList: jest.fn(),
      turnOn: jest.fn(),
      turnOff: jest.fn(),
    } as unknown as jest.Mocked<ShellyCloudService>;

    controller = new ShellyController(shellyService, shellyCloudService);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should turn on a Shelly device', async () => {
    shellyService.turnOn.mockResolvedValue(undefined);
    const ip = '192.168.1.50';

    const result = await controller.turnOn(ip);

    expect(shellyService.turnOn).toHaveBeenCalledWith(ip);
    expect(result).toEqual({ message: `Shelly relay at ${ip} turned ON` });
  });

  it('should get consumption via LAN', async () => {
    const ip = '192.168.1.50';
    const device_id = 1;

    shellyService.getPowerConsumption.mockResolvedValue(10);
    shellyService.getTotalConsumption.mockResolvedValue(100);
    shellyService.getVoltage.mockResolvedValue(220);
    shellyService.getCurrent.mockResolvedValue(0.5);

    const result = await controller.getConsumption({ ip, device_id });

    expect(result).toEqual({
      device_id,
      ip,
      power: 10,
      energy: 100,
      voltage: 220,
      current: 0.5,
    });
  });

  it('should fallback to cloud if LAN fails', async () => {
    const ip = '192.168.1.50';
    const device_id = 1;

    shellyService.getPowerConsumption.mockRejectedValue(new Error('LAN fail'));
    shellyCloudService.getPowerConsumption.mockResolvedValue(10);
    shellyCloudService.getTotalConsumption.mockResolvedValue(100);
    shellyCloudService.getVoltage.mockResolvedValue(220);
    shellyCloudService.getCurrent.mockResolvedValue(0.5);

    const result = await controller.getConsumption({ ip, device_id });

    expect(result).toEqual({
      device_id,
      ip,
      power: 10,
      energy: 100,
      voltage: 220,
      current: 0.5,
      source: 'cloud',
    });
  });
});
