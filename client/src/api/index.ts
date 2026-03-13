import axios from 'axios';
import type {
  DashboardData,
  ClientProfileData,
  PreparerSettingsData,
  PublicPreparerData,
  PublicSignupResponse,
} from '../types';

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

export async function markClientDone(
  clientId: string
): Promise<{ success: boolean; reviewRequested: boolean; reviewMessage: string | null }> {
  const { data } = await http.post(`/clients/${clientId}/complete`);
  return data;
}

export async function getClientProfile(clientId: string): Promise<ClientProfileData> {
  const { data } = await http.get<ClientProfileData>(`/clients/${clientId}/profile`);
  return data;
}

export async function getPreparerSettings(preparerId: string): Promise<PreparerSettingsData> {
  const { data } = await http.get<PreparerSettingsData>(`/preparers/${preparerId}/settings`);
  return data;
}

export async function updatePreparerSettings(
  preparerId: string,
  payload: {
    businessName: string;
    brandThemeId: string;
    brandColor: string;
    brandTagline: string;
    brandLogoUrl: string;
    websiteUrl: string;
    instagramUrl: string;
    linkedinUrl: string;
    aiTone: 'friendly' | 'calm' | 'direct';
    aiClientNotes: string;
    aiCollectDocuments: boolean;
    aiCollectTaxSituation: boolean;
    aiCustomQuestions: string[];
    aiReviewRequestEnabled: boolean;
    aiReviewRequestMessage: string;
    autoFollowupEnabled: boolean;
    autoFollowupHours: number;
  }
): Promise<PreparerSettingsData> {
  const { data } = await http.put<PreparerSettingsData>(`/preparers/${preparerId}/settings`, payload);
  return data;
}

export async function sendMessage(clientId: string, body: string): Promise<void> {
  await http.post(`/clients/${clientId}/message`, { body });
}

export async function getPublicPreparer(preparerId: string): Promise<PublicPreparerData> {
  const { data } = await http.get<PublicPreparerData>(`/public/preparers/${preparerId}`);
  return data;
}

export async function submitPublicSignup(
  preparerId: string,
  payload: {
    name: string;
    mobile: string;
    taxYear?: number;
    website?: string;
  }
): Promise<PublicSignupResponse> {
  const { data } = await http.post<PublicSignupResponse>(
    `/public/preparers/${preparerId}/signup`,
    payload
  );
  return data;
}
