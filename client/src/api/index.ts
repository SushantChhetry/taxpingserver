import axios from 'axios';
import type { DashboardData } from '../types';

const http = axios.create({ baseURL: '/api' });

export async function getDashboard(preparerId: string): Promise<DashboardData> {
  const { data } = await http.get<DashboardData>(`/dashboard/${preparerId}`);
  return data;
}

export async function createClient(
  preparerId: string,
  name: string,
  mobile: string,
  taxYear: number
): Promise<{ clientId: string }> {
  const { data } = await http.post('/clients', { preparerId, name, mobile, taxYear });
  return data;
}

export async function sendRequest(clientId: string): Promise<void> {
  await http.post(`/clients/${clientId}/request`);
}

export async function sendReminder(clientId: string): Promise<void> {
  await http.post(`/clients/${clientId}/followup`);
}
