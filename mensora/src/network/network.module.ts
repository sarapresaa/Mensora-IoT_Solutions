import { Module } from '@nestjs/common';
import { DiscoverIotService } from 'src/discover_iot/discover_iot.service';
import { NetworkController } from './network.controller';

@Module({
  providers: [DiscoverIotService],
  controllers: [NetworkController],
  exports: [DiscoverIotService],
})
export class NetworkModule {}
