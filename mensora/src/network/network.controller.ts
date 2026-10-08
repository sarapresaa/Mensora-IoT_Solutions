import { Controller, Get, Post, Body } from '@nestjs/common';
import { DiscoverIotService } from 'src/discover_iot/discover_iot.service';

@Controller('network')
export class NetworkController {
  constructor(private readonly discover: DiscoverIotService) {}

  @Get('discover')
  getDiscovered() {
    return this.discover.getDiscovered();
  }

  @Post('probe')
  async probeIp(@Body('ip') ip: string) {
    if (!ip) return { error: 'ip required' };
    try {
      return await this.discover.probeIp(ip);
    } catch (e) {
      return { error: 'probe_failed' };
    }
  }
}
