import { Test, TestingModule } from '@nestjs/testing';
import { ShellyService } from './shelly.service';
import { HttpService } from '@nestjs/axios';
import { throwError, of } from 'rxjs';

describe('ShellyService', () => {
  let service: ShellyService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShellyService,
        {
          provide: HttpService,
          useValue: { 
            post: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ShellyService>(ShellyService);
    httpService = module.get<HttpService>(HttpService);

    jest.spyOn(console, 'log').mockImplementation(() => {});

  });

  it('should turn on a device', async () => {
    (httpService.post as jest.Mock).mockReturnValue(of({ data: { result: 'ok' } }));

    await service.turnOn('192.168.1.50');

    expect(httpService.post).toHaveBeenCalledWith(
      'http://192.168.1.50/rpc',
      expect.objectContaining({ method: 'Switch.Set', params: { id: 0, on: true } }),
      expect.any(Object),
    );
  });

  it('should turn off a device', async () => {
    (httpService.post as jest.Mock).mockReturnValue(of({ data: { result: 'ok' } }));

    await service.turnOff('192.168.1.50');

    expect(httpService.post).toHaveBeenCalledWith(
      'http://192.168.1.50/rpc',
      expect.objectContaining({ method: 'Switch.Set', params: { id: 0, on: false } }),
      expect.any(Object),
    );
  });

  it('should return power consumption correctly', async () => {
    (httpService.post as jest.Mock).mockReturnValue(of({ data: { result: { apower: 42 } } }));

    const power = await service.getPowerConsumption('192.168.1.50');
    expect(power).toBe(42);
  });

  it('should create a timer successfully', async () => {
    const mockResponse = { data: { id: 123 } };
    (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));

    const ip = '192.168.1.50';
    const hour = 14;
    const minute = 30;
    const days = [1, 3, 5];
    const onValue = true;

    const result = await service.createTimer(ip, hour, minute, days, onValue);

    expect(httpService.post).toHaveBeenCalledWith(
      `http://${ip}/rpc/Schedule.Create`,
      expect.objectContaining({
        enable: true,
        timespec: expect.any(String),
        calls: [
          { method: 'Switch.Set', params: { id: 0, on: onValue } },
        ],
      }),
      expect.any(Object)
    );

    expect(result).toEqual(mockResponse.data);
  });


  it('should get device status', async () => {
    (httpService.post as jest.Mock).mockReturnValue(
      of({ data: { result: { output: true } } })
    );

    const status = await service.getStatus('192.168.1.50');
    expect(status).toBe(true);
  });

  it('should handle ping failure gracefully', async () => {
    (httpService.get as jest.Mock).mockReturnValue(
      throwError(() => new Error('Network error'))
    );

    const result = await service.ping('192.168.1.50');
    expect(result).toBe(false);
  });
});
