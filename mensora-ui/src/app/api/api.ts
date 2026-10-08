import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../user/user.model';

@Injectable({
  providedIn: 'root',
})
export class Api {

  constructor(private httpClient: HttpClient) { }

  API_SERVER = "http://192.168.1.126:3001";

  public readUsers() {
    return this.httpClient.get<User[]>(`${this.API_SERVER}/user`);
  }

  public createUser(user: User) {
    return this.httpClient.post<User>(`${this.API_SERVER}/user/create`, user);
  }

  public updateUser(user: User) {
    return this.httpClient.put<User>(`${this.API_SERVER}/user/${user.user_id}/update`, user);
  }

  public updateMe(userId: number, data: { username?: string; user_password?: string ; preferred_language?: string;}) {
    return this.httpClient.put(
      `${this.API_SERVER}/user/me/${userId}`,
      data,
      { withCredentials: true }
    );
  }

  public deleteUser(id: number) {
    return this.httpClient.delete(`${this.API_SERVER}/user/${id}/delete`);
  }

  public registerUser(user: { username: string; user_email: string; user_password: string }) {
    return this.httpClient.post(`${this.API_SERVER}/user/register`, user);
  }

  public login(user: { user_email: string; user_password: string }) {
    return this.httpClient.post(`${this.API_SERVER}/auth/login`, user, { withCredentials: true });
  }

  public logout() {
    return this.httpClient.post(`${this.API_SERVER}/auth/logout`, {}, { withCredentials: true });
  }

  public me() {
    return this.httpClient.get(`${this.API_SERVER}/auth/me`, { withCredentials: true });
  }

  // Control Overview (auth required)
  public getOverview() {
    return this.httpClient.get(`${this.API_SERVER}/control/overview`, { withCredentials: true });
  }

  // Consumption History (aggregates, raw entries)
  public getConsumptionHistory(params?: { period?: '24h' | '7d' | '30d' | '365d'; limit?: number }) {
    const period = params?.period;
    const limit = params?.limit;
    const query = new URLSearchParams();
    if (period) query.set('period', period);
    if (typeof limit === 'number') query.set('limit', String(limit));
    const qs = query.toString();
    const url = `${this.API_SERVER}/control/history${qs ? `?${qs}` : ''}`;
    return this.httpClient.get<any[]>(url, { withCredentials: true });
  }

  // Sync consumption status (current readings from polling)
  public getSyncConsumptionStatus() {
    return this.httpClient.get(`${this.API_SERVER}/control/sync-consumption/status`, { withCredentials: true });
  }

}
