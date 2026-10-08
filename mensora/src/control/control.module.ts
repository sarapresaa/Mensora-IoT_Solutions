import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../entities/device.entity';
import { Scenary } from '../entities/scenary.entity';
import { ScenaryDevice } from '../entities/scenary_device.entity';
import { Automation } from '../entities/automation.entity';
import { ConsumptionHistory } from '../entities/consumption_history.entity';
import { ControlService } from './control.service';
import { ControlController } from './control.controller';
import { ShellyModule } from '../shelly/shelly.module';
import { NetworkModule } from '../network/network.module';
import { Automation_Target } from 'src/entities/automation_target.entity';
import { Automation_Target_Timer } from 'src/entities/automation_target_time.entity';
import { SyncConsumptionService } from './sync-consumption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Device,
      Scenary,
      ScenaryDevice,
      Automation,
      Automation_Target,
      Automation_Target_Timer,
      ConsumptionHistory,
    ]),
    ShellyModule,
    NetworkModule,
  ],
  providers: [ControlService, SyncConsumptionService],
  controllers: [ControlController],
  exports: [ControlService, SyncConsumptionService],
})
export class ControlModule {}
