import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShellyService } from './shelly.service';
import { ShellyCloudService } from './shelly-cloud.service';
import { ShellyController } from './shelly.controller';

@Module({
  imports: [HttpModule],
  providers: [ShellyService, ShellyCloudService],
  controllers: [ShellyController],
  exports: [ShellyService, ShellyCloudService],
})
export class ShellyModule {}
