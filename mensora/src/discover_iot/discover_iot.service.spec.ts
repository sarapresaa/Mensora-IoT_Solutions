import { Test, TestingModule } from '@nestjs/testing';
import { DiscoverIotService } from './discover_iot.service';

jest.mock('node-ssdp', () => ({
  Client: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    search: jest.fn(),
    stop: jest.fn(),
  })),
}));

const mdnsOnMock = jest.fn();
const mdnsStopMock = jest.fn();

jest.mock('bonjour-service', () => {
  return jest.fn().mockImplementation(() => ({
    find: jest.fn(() => ({
      on: mdnsOnMock,
      stop: mdnsStopMock,
    })),
    destroy: jest.fn(),
  }));
});

describe('DiscoverIotService — mDNS', () => {

  beforeEach(async () => {
    jest.useFakeTimers();

    const module = await Test.createTestingModule({
      providers: [DiscoverIotService],
    }).compile();

    service = module.get(DiscoverIotService);

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.clearAllTimers();
    jest.useRealTimers();
  });


  let service: DiscoverIotService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscoverIotService],
    }).compile();

    service = module.get<DiscoverIotService>(DiscoverIotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should start mDNS discovery on module init', () => {
    service.onModuleInit();

    expect(mdnsOnMock).toHaveBeenCalledWith('up', expect.any(Function));
    expect(mdnsOnMock).toHaveBeenCalledWith('down', expect.any(Function));
  });

  it('should add a service on mDNS up event', () => {
    service.onModuleInit();

    const upHandler = mdnsOnMock.mock.calls.find(
      ([event]) => event === 'up',
    )[1];

    const mdnsService = {
      name: 'Test Device',
      addresses: ['192.168.1.100'],
      port: 80,
    };

    upHandler(mdnsService);

    const discovered = service.getDiscovered();
    expect(discovered.length).toBe(1);
    expect(discovered[0].addresses[0]).toBe('192.168.1.100');
  });

  it('should ignore duplicate mDNS services by address', () => {
    service.onModuleInit();

    const upHandler = mdnsOnMock.mock.calls.find(
      ([event]) => event === 'up',
    )[1];

    const service1 = { addresses: ['192.168.1.101'] };
    const service2 = { addresses: ['192.168.1.101'] };

    upHandler(service1);
    upHandler(service2);

    expect(service.getDiscovered().length).toBe(1);
  });

  it('should remove a service on mDNS down event', () => {
    service.onModuleInit();

    const upHandler = mdnsOnMock.mock.calls.find(([event]) => event === 'up',)[1];

    const downHandler = mdnsOnMock.mock.calls.find(([event]) => event === 'down',)[1];

    const mdnsService = { addresses: ['192.168.1.102'] };

    upHandler(mdnsService);
    expect(service.getDiscovered().length).toBe(1);

    downHandler(mdnsService);
    expect(service.getDiscovered().length).toBe(0);
  });

  it('should stop mDNS browser and destroy bonjour on destroy', () => {
    service.onModuleInit();
    service.onModuleDestroy();

    expect(mdnsStopMock).toHaveBeenCalled();
  });
});
