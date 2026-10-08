export interface DeviceZone {
  device_id?: number;
  name: string;
  ip_address?: number;
  status: string;
  state: 'on' | 'off';
  current_consumption?: number;
  total_consumption?: number;
  total_operating_time?: number;
  voltage?: number;
  current?: number;
}
