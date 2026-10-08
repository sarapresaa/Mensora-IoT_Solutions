import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Bonjour from 'bonjour-service';
import { Client as SsdpClient } from 'node-ssdp';
import axios from 'axios';
import * as net from 'net';

@Injectable()
export class DiscoverIotService implements OnModuleInit, OnModuleDestroy {
  private bonjour = new Bonjour();
  private ssdp: SsdpClient | null = null;
  private browser;
  private discovered: Array<any> = [];

  onModuleInit() {
    this.browser = this.bonjour.find();

    this.browser.on('up', (service) => {
      // guarda servico descoberto (remove duplicados por endereco)
      try {
        const addr = service.addresses && service.addresses[0];
        const existing = this.discovered.find(
          (s) => (s.addresses && s.addresses[0]) === addr,
        );
        if (!existing) this.discovered.push(service);
      } catch (e) {}
      console.log('[mDNS UP]', service);
    });

    this.browser.on('down', (service) => {
      // remove servico da lista de descobertos
      try {
        const addr = service.addresses && service.addresses[0];
        this.discovered = this.discovered.filter(
          (s) => (s.addresses && s.addresses[0]) !== addr,
        );
      } catch (e) {}
      console.log('[mDNS DOWN]', service);
    });

    // iniciar SSDP/UPnP discovery
    try {
      this.ssdp = new SsdpClient();
      this.ssdp.on('response', (headers: any, statusCode: any, rinfo: any) => {
        try {
          const ip = rinfo && rinfo.address;
          const location =
            headers &&
            (headers.LOCATION || headers.Location || headers.location);
          const usn = headers && (headers.USN || headers.Udn || headers.usn);
          const st = headers && (headers.ST || headers.NT || headers.st);
          const existing = this.discovered.find((s) => {
            // dedupe by ip or location or usn
            if (!s) return false;
            const sIp = s.addresses && s.addresses[0];
            if (sIp && sIp === ip) return true;
            if (s.location && location && s.location === location) return true;
            if (s.usn && usn && s.usn === usn) return true;
            return false;
          });
          if (!existing) {
            const item = {
              type: 'ssdp',
              addresses: ip ? [ip] : [],
              location,
              usn,
              st,
              raw: headers,
            };
            this.discovered.push(item);
            console.log('[SSDP]', item);
          }
        } catch (e) {}
      });

      // busca ativa inicial
      this.ssdp.search('ssdp:all');

      // repetir procura ocasionalmente
      setInterval(() => {
        try {
          this.ssdp?.search('ssdp:all');
        } catch (e) {}
      }, 30_000);
    } catch (e) {
      console.warn('SSDP init failed', e);
    }
  }

  getDiscovered() {
    return this.discovered;
  }

  async probeIp(ip: string) {
    const ports = [
      80, 443, 8080, 8081, 6668, 6667, 9999, 23, 554, 1883, 8883, 502, 3000,
      3001,
    ];
    const openPorts: number[] = [];
    const hints: string[] = [];

    const httpPaths = [
      '/',
      '/rpc',
      '/rpc/Shelly.GetStatus',
      '/upnp/control',
      '/api',
      '/describe',
      '/info',
      '/status',
      '/settings',
      '/zeroconf',
      '/cm',
      '/cm?',
    ];

    const tryConnect = (port: number, timeout = 1500) =>
      new Promise<boolean>((resolve) => {
        const s = new net.Socket();
        let done = false;
        s.setTimeout(timeout);
        s.on('connect', () => {
          done = true;
          s.destroy();
          resolve(true);
        });
        s.on('timeout', () => {
          if (!done) {
            done = true;
            s.destroy();
            resolve(false);
          }
        });
        s.on('error', () => {
          if (!done) {
            done = true;
            s.destroy();
            resolve(false);
          }
        });
        s.connect(port, ip);
      });

    for (const port of ports) {
      try {
        const ok = await tryConnect(port);
        if (ok) openPorts.push(port);
      } catch (e) {}
    }

    // Probe HTTP endpoints for hints (try multiple common paths)
    const httpPorts = openPorts.filter((p) =>
      [80, 8080, 8081, 443, 3000, 3001].includes(p),
    );
    for (const port of httpPorts) {
      const proto = port === 443 ? 'https' : 'http';
      for (const path of httpPaths) {
        try {
          const url = `${proto}://${ip}:${port}${path}`;

          const res = await axios.get(url, {
            timeout: 2500,
            validateStatus: () => true,
          });
          const body = (res.data || '').toString().toLowerCase();
          const headers = JSON.stringify(res.headers || {}).toLowerCase();
          if (res.status >= 400 && res.status < 600) {
            // some Shelly endpoints return 400 for /rpc; treat as reachable
            if (body.includes('shelly') || headers.includes('shelly'))
              hints.push('shelly');
          }
          if (body.includes('shelly') || headers.includes('shelly'))
            hints.push('shelly');
          if (
            body.includes('esp8266') ||
            body.includes('esp32') ||
            headers.includes('esp')
          )
            hints.push('esp');
          if (body.includes('tasmota') || headers.includes('tasmota'))
            hints.push('tasmota');
          if (body.includes('mqtt') || headers.includes('mqtt'))
            hints.push('mqtt');
          if (body.includes('ewelink') || headers.includes('ewelink'))
            hints.push('ewelink');
          if (
            body.includes('homeassistant') ||
            headers.includes('homeassistant')
          )
            hints.push('homeassistant');
          if (body.includes('rtsp') || headers.includes('rtsp'))
            hints.push('rtsp');
        } catch (e) {
          // ignore per-path errors
        }
      }
    }

    if (openPorts.includes(1883) || openPorts.includes(8883))
      hints.push('mqtt');
    if (openPorts.includes(23)) hints.push('telnet');
    if (openPorts.includes(554)) hints.push('rtsp');

    return { ip, openPorts, hints: Array.from(new Set(hints)) };
  }

  onModuleDestroy() {
    this.browser?.stop();
    this.bonjour?.destroy();
  }
}
