export interface Scenario {
  id?: number;
  name: string;
  devices: string;
  state: 'active' | 'waiting' | 'inactive';
  stateClass?: string;
}
