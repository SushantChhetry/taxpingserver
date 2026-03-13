export interface Message {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  media_url: string | null;
  drive_file_id: string | null;
  created_at: string;
}

export interface ClientProfileData {
  client: {
    id: string;
    name: string;
    mobile: string;
    tax_year: number;
    drive_folder_id: string | null;
  };
  conversation: {
    id: string;
    status: 'active' | 'complete';
    docs_collected: string[];
    docs_pending: string[];
  } | null;
  messages: Message[];
}

export interface Client {
  id: string;
  name: string;
  mobile: string;
  status: 'not_started' | 'in_progress' | 'complete';
  docsCollected: number;
  docsPending: string[];
  lastReplyAt: string | null;
  driveFolderId: string | null;
  taxYear?: number;
}

export interface DashboardData {
  preparer: {
    id: string;
    name: string;
    email: string;
    businessName: string;
    branding: {
      themeId: string | null;
      color: string | null;
    };
  };
  clients: Client[];
  stats: { total: number; waiting: number; complete: number; issues: number };
}

export interface BrandProfile {
  themeId: string | null;
  color: string | null;
  tagline: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
}

export interface AiAssistantProfile {
  tone: 'friendly' | 'calm' | 'direct';
  clientNotes: string | null;
  collectDocuments: boolean;
  collectTaxSituation: boolean;
  customQuestions: string[];
  reviewRequestEnabled: boolean;
  reviewRequestMessage: string | null;
}

export interface PreparerSettingsData {
  preparer: {
    id: string;
    name: string;
    email: string;
    businessName: string;
    autoFollowupEnabled: boolean;
    autoFollowupHours: number;
    twilioNumber: string | null;
    driveConnected: boolean;
    aiAssistant: AiAssistantProfile;
    branding: BrandProfile;
  };
}

export interface PublicPreparerData {
  preparer: {
    id: string;
    businessName: string;
    twilioNumber: string | null;
    taxYear: number;
    branding: BrandProfile;
  };
}

export interface PublicSignupResponse {
  success: boolean;
  clientId?: string;
  conversationId?: string;
  reusedClient?: boolean;
}
