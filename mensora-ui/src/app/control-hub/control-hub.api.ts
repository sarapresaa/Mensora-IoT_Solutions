import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HubAutomationTarget, HubOverview } from './control-hub.types';
import { HubAutomation } from './control-hub.types';
import { HubAutomationTargetTimer } from './control-hub.types';

@Injectable({ providedIn: 'root' })
export class ControlHubApiService {
  private readonly baseUrl = 'http://localhost:3001/control';

  constructor(private readonly http: HttpClient) {}

  overview(): Observable<HubOverview> {
    return this.http.get<HubOverview>(`${this.baseUrl}/overview`, { withCredentials: true });
  }

  syncDeviceStates(): Observable<HubOverview> {
    return this.http.post<HubOverview>(`${this.baseUrl}/devices/sync-states`, {}, { withCredentials: true });
  }

  setSystem(payload: { active: boolean; mode?: string }): Observable<HubOverview> {
    return this.http.post<HubOverview>(`${this.baseUrl}/system`, payload, { withCredentials: true });
  }

  createDevice(payload: { device_name: string; device_description?: string; location?: string; scenary_id?: number; ip_address?: string; device_type?: string }): Observable<HubOverview> {
    return this.http.post<HubOverview>(`${this.baseUrl}/devices`, payload, { withCredentials: true });
  }

  removeDevice(deviceId: number): Observable<HubOverview> {
    return this.http.delete<HubOverview>(`${this.baseUrl}/devices/${deviceId}`, { withCredentials: true });
  }

  getAvailableDevices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/devices/available`, { withCredentials: true });
  }

  getDevicesByUser(userId: number): Observable<any[]> {
    return this.http.post<any[]>(`${this.baseUrl}/devices/all/${userId}`, {});
  }

  getScenaryByUser(userId: number): Observable<any[]> {
    return this.http.post<any[]>(`${this.baseUrl}/scenary/all/${userId}`, {});
  }

  getDevicesByScenaryId(scenaryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/scenary/devices/${scenaryId}`, {});
  }
  
  createAutomation(payload: {
    automation_name?: string;
    start_time?: string;
    end_time?: string;
    interval_value?: number;
    interval_unit?: 'seconds' | 'minutes' | 'hours';
    weekday?: string;
    IFTTT?: 'OFF' | 'ON';
    IFTTT_trigger?: number;
    IFTTT_action?: 'OFF' | 'ON';
    active?: boolean;
  }): Observable<HubAutomation> {
    return this.http.post<HubAutomation>(`${this.baseUrl}/automations`, payload);
  }

  createAutomationTarget(payload: {
    automation_id: number,
    target_type: 'device' | 'scenary';
    device_id?: number;
    scenary_id?: number;
  }): Observable<HubAutomationTarget> {
    return this.http.post<HubAutomationTarget>(`${this.baseUrl}/automation-targets`, payload);
  }

  updateAutomationState(id: number, active: boolean) {
  return this.http.patch(`${this.baseUrl}/automations/${id}/state`, { active });
  }

  removeAutomation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/automations/${id}`);
  }

  createAutomationTargetTimer(payload: {
    target_id: number;
    timer_id?: number;
    device_id?: number;
  }): Observable<HubAutomationTargetTimer> {
    return this.http.post<HubAutomationTargetTimer>(`${this.baseUrl}/automation-target-timer`, payload);
  }

  deleteAutomationTargetTime(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/automation-target-time/${id}`);
  }

  // cria cenario na db
  createScenario(payload: { scenary_name: string; scenary_description?: string; scenary_state?: 'active' | 'inactive' }): Observable<HubOverview> {
    return this.http.post<HubOverview>(`${this.baseUrl}/scenaries`, payload, { withCredentials: true });
  }

  // remove cenario da db
  removeScenario(scenaryId: number): Observable<HubOverview> {
    return this.http.delete<HubOverview>(`${this.baseUrl}/scenaries/${scenaryId}`, { withCredentials: true });
  }

  setScenarioState(scenaryId: number, scenary_state: 'active' | 'inactive'): Observable<HubOverview> {
    return this.http.patch<HubOverview>(`${this.baseUrl}/scenaries/${scenaryId}/state`, { scenary_state }, { withCredentials: true });
  }

  // adiciona dispositivo a um cenario
  addDeviceToScenario(deviceId: number, scenaryId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/scenaries/${scenaryId}/devices`, { device_id: deviceId }, { withCredentials: true });
  }

  // remove dispositivo de um cenario
  removeDeviceFromScenario(deviceId: number, scenaryId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/scenaries/${scenaryId}/devices/${deviceId}`, { withCredentials: true });
  }

  setDeviceState(deviceId: number, active: boolean) {
    return this.http.patch(`${this.baseUrl}/devices/${deviceId}/state`, { active }, { withCredentials: true });
  }

  updateDevice(deviceId: number, payload: { device_name?: string; device_description?: string; scenary_id?: number }) {
    return this.http.patch(`${this.baseUrl}/devices/${deviceId}`, payload, { withCredentials: true });
  }

  consumptionHistory(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/history`, { withCredentials: true });
  }

  // descoberta de dispositivos na rede
  getDiscoveredDevices(): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:3001/network/discover`, { withCredentials: true });
  }

  probeIp(ip: string) {
    return this.http.post(`http://localhost:3001/network/probe`, { ip }, { withCredentials: true });
  }

  // controlo shelly
  shellyOn(ip: string) {
    return this.http.post(`http://localhost:3001/shelly/on`, { ip }, { withCredentials: true });
  }

  shellyOff(ip: string) {
    return this.http.post(`http://localhost:3001/shelly/off`, { ip }, { withCredentials: true });
  }

  shellyTimerOnInterval(payload: { ip: string; toggleAfter: number }) {
    return this.http.post('http://localhost:3001/shelly/timer/onInterval', payload, { withCredentials: true });
  }

  shellyTimerOn(payload: { ip: string, hour: number, minute: number, days: number[]; enable?: boolean }) {
    return this.http.post(`http://localhost:3001/shelly/timer/on`, payload, { withCredentials: true });
  }

  shellyTimerOff(payload: { ip: string, hour: number, minute: number, days: number[]; enable?: boolean }) {
    return this.http.post(`http://localhost:3001/shelly/timer/off`, payload, { withCredentials: true });
  }

  shellyPing(ip: string) {
    return this.http.post(`http://localhost:3001/shelly/ping`, { ip }, { withCredentials: true });
  }

  // eco mode
  enableEcoMode(ip: string) {
    return this.http.get(`http://localhost:3001/shelly/eco/enable/${ip}`, { withCredentials: true });
  }

  disableEcoMode(ip: string) {
    return this.http.get(`http://localhost:3001/shelly/eco/disable/${ip}`, { withCredentials: true });
  }

  getEcoModeStatus(ip: string) {
    return this.http.get(`http://localhost:3001/shelly/eco/status/${ip}`, { withCredentials: true });
  }

  rebootShelly(ip: string) {
    return this.http.post(`http://localhost:3001/shelly/reboot`, { ip }, { withCredentials: true });
  }

  // obtém consumo de um dispositivo shelly
  getShellyConsumption(ip: string, deviceId: number) {
    return this.http.post(`http://localhost:3001/shelly/consumption`, { ip, device_id: deviceId }, { withCredentials: true });
  }
}
