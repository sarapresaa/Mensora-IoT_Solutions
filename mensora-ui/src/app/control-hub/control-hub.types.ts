export interface HubDevice {
  device_id: number;
  device_name: string;
  device_description?: string;
  location?: string;
  device_state: boolean;
  ip_address?: string;
  device_type?: string;
  current_consumption?: number;
  total_operating_time?: number;
  total_consumption?: number;
}

export interface HubScenario {
  id: number;
  name: string;
  description?: string;
  state: 'active' | 'inactive';
  devices?: HubDevice[];
}

export interface HubAutomation {
  automation_id: number;
  automation_name?: string;
  start_time?: string;
  end_time?: string;
  interval_value?: number;
  interval_unit?: 'seconds' | 'minutes' | 'hours';
  weekday?: number;
  IFTTT?: 'OFF' | 'ON';
  IFTTT_trigger?: number;
  IFTTT_action?: 'OFF' | 'ON';
  active: boolean;
  device?: HubDevice;
}

export interface HubAutomationTarget {
  target_id: number,
  automation_id: number;
  target_type: 'device' | 'scenary';
  device_id?: number;
  scenary_id?: number;
}

export interface HubAutomationTargetTimer {
  att_id: number;
  target_id: number;
  timer_id?: number;
  device_id?: number;
}


export interface ScenarioDevice {
  device_id: number;
  device_name: string;
  device_state: boolean;
  device_type: string;
  ip_address: string;
}

export interface ScenarioDetail {
  id: number;
  name: string;
  state: 'active' | 'inactive';
  devices: ScenarioDevice[];
}

export interface HubConsumptionSummary {
  total: number;
  dailyAverage: number;
  weeklyDistribution: { day: string; value: number }[];
}

export interface HubOverview {
  systemActive: boolean;
  scenaries: HubScenario[];
  devices: HubDevice[];
  automations: HubAutomation[];
  consumption: HubConsumptionSummary;
}
