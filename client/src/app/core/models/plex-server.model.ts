export interface PlexServer {
  id: string;
  name: string;
  host: string;
  externalUrl?: string;
  version?: string;
  platform?: string;
  isConnected: boolean;
  lastSyncAt?: string;
}

export interface PlexServerResponse {
  server: PlexServer | null;
}

export interface ConnectServerRequest {
  host: string;
  token: string;
  externalUrl?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  name?: string;
  version?: string;
  error?: string;
}

export interface AutoSyncSettings {
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt: string | null;
  serverConfigured: boolean;
}
