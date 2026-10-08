import { Test, TestingModule } from '@nestjs/testing';
import { ControlService } from './control.service';

describe('ControlService', () => {
    let service: ControlService;
    let deviceRepo: any;
    let scenaryRepo: any;
    let scenaryDeviceRepo: any;
    let automationRepo: any;
    let targetRepo: any;
    let targetRepoTimer: any;
    let historyRepo: any;
    let shellyService: any;
    let shellyCloudService: any;
    let discoverService: any;
    let syncConsumptionService: any;

    beforeEach(async () => {
        deviceRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
            create: jest.fn(),
        };

        scenaryRepo = {
            find: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
        };

        scenaryDeviceRepo = {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };

        automationRepo = {
            findOneBy: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
        };

        targetRepo = {};
        targetRepoTimer = {};

        historyRepo = {
            find: jest.fn(),
        };

        shellyService = {
            getStatus: jest.fn(),
            turnOn: jest.fn(),
            turnOff: jest.fn(),
        };

        shellyCloudService = {
            getStatus: jest.fn(),
        };

        discoverService = {
            probeIp: jest.fn(),
        };

        syncConsumptionService = {
            addDevicePolling: jest.fn(),
            removeDevicePolling: jest.fn(),
        };

        historyRepo.find.mockResolvedValue([]);
        scenaryRepo.find.mockResolvedValue([]);
        deviceRepo.find.mockResolvedValue([]);
        automationRepo.find.mockResolvedValue([]);

        service = new ControlService(
            deviceRepo,
            scenaryRepo,
            scenaryDeviceRepo,
            automationRepo,
            targetRepo,
            targetRepoTimer,
            historyRepo,
            shellyService,
            shellyCloudService,
            discoverService,
            syncConsumptionService,
        );

        jest.spyOn(console, 'log').mockImplementation(() => {});

    });

    it('should return system overview with active system', async () => {
        scenaryRepo.find.mockResolvedValue([]);
        deviceRepo.find.mockResolvedValue([{ device_state: true }]);
        automationRepo.find = jest.fn().mockResolvedValue([]);
        historyRepo.find.mockResolvedValue([]);

        const result = await service.overview();

        expect(result.systemActive).toBe(true);
    });

    it('should return devices not associated with any scenary', async () => {
    scenaryDeviceRepo.createQueryBuilder.mockReturnValue({
        select: () => ({
        distinct: () => ({
            getRawMany: jest.fn().mockResolvedValue([{ deviceId: 1 }]),
        }),
        }),
    });

    deviceRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ device_id: 2 }]),
    });

    const result = await service.getAvailableDevices();

    expect(result).toHaveLength(1);
    });

    it('should return all devices belonging to a user', async () => {
    deviceRepo.find.mockResolvedValue([{ device_name: 'Lamp' }]);

    const result = await service.getAllDevicesByUser(1);

    expect(result[0].device_name).toBe('Lamp');
    });

    it('should activate all scenaries and devices', async () => {
        scenaryRepo.find.mockResolvedValue([{ scenary_id: 1, scenaryDevices: [] }]);
        deviceRepo.find.mockResolvedValue([{ device_id: 1, device_type: null }]);
        historyRepo.find.mockResolvedValue([]);
        automationRepo.find.mockResolvedValue([]);

        await service.setSystemState({ active: true });

        expect(scenaryRepo.update).toHaveBeenCalled();
        expect(deviceRepo.update).toHaveBeenCalled();
    });

    it('should update device state when device exists', async () => {
        const device = { device_id: 1, device_state: false };

        deviceRepo.findOne.mockResolvedValue(device);
        deviceRepo.save.mockResolvedValue({ ...device, device_state: true });

        scenaryRepo.find.mockResolvedValue([]);
        historyRepo.find.mockResolvedValue([]);
        automationRepo.find.mockResolvedValue([]);

        const result = await service.updateDeviceState(1, true);

        expect(result.device_state).toBe(true);
    });

    it('should throw an error when device does not exist', async () => {
    deviceRepo.findOne.mockResolvedValue(null);

    await expect(service.updateDeviceState(1, true)).rejects.toThrow();
    });

    it('should create a new device', async () => {
        deviceRepo.create.mockReturnValue({ device_name: 'Lamp' });
        deviceRepo.save.mockResolvedValue({ device_id: 1 });

        await service.createDevice({ device_name: 'Lamp' } as any);

        expect(deviceRepo.save).toHaveBeenCalled();
        expect(syncConsumptionService.addDevicePolling).toHaveBeenCalled();
    });

    it('should remove a device', async () => {
        deviceRepo.delete.mockResolvedValue(true);

        await service.removeDevice(1);

        expect(deviceRepo.delete).toHaveBeenCalledWith(1);
        expect(syncConsumptionService.removeDevicePolling).toHaveBeenCalled();
    });

    it('should update automation state', async () => {
        const automation = { automation_id: 1, active: false };

        automationRepo.findOneBy.mockResolvedValue(automation);
        automationRepo.save.mockResolvedValue({ ...automation, active: true });

        const result = await service.updateAutomationState(1, true);

        expect(result.active).toBe(true);
    });

    it('should return a device when it exists', async () => {
        deviceRepo.findOne.mockResolvedValue({ device_id: 1 });

        const result = await service.getDeviceById(1);

        expect(result.device_id).toBe(1);
    });

    it('should throw an error when device is not found', async () => {
        deviceRepo.findOne.mockResolvedValue(null);

        await expect(service.getDeviceById(99)).rejects.toThrow();
    });

});
