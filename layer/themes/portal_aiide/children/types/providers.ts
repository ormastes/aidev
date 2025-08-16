export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  [key: string]: any;
}

export interface ProviderCapabilities {
  streaming: boolean;
  contextWindow: number;
  maxTokens: number;
  models: string[];
}

export interface ProviderStatus {
  available: boolean;
  message?: string;
  lastChecked: Date;
}
