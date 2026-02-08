import type { TranscriptionSegment } from 'livekit-client';

export interface CombinedTranscription extends TranscriptionSegment {
  role: 'assistant' | 'user';
  receivedAtMediaTimestamp: number;
  receivedAt: number;
}
export type ThemeMode = 'dark' | 'light' | 'system';

/** Optional user data passed from the parent app (e.g. via embed URL params) and sent to the agent as job metadata */
export interface EmbedUserData {
  user_id?: string;
}

export interface AppConfig {
  sandboxId?: string;
  agentName?: string;
  /** User data to send with connection (e.g. from ?name=&email= on embed URL) */
  userData?: EmbedUserData;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;
}

export interface SandboxConfig {
  [key: string]:
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | null;
}

export type EmbedErrorDetails = { title: React.ReactNode; description: React.ReactNode };
