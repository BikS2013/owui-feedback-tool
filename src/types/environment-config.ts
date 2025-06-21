export interface FeatureConfiguration {
  show_documents?: boolean;
  show_runs?: boolean;
  show_checkpoints?: boolean;
}

export interface EnvironmentConfiguration {
  environment: 'development' | 'staging' | 'production';
  version: string;
  timestamp: string;
  features: FeatureConfiguration;
}

export interface ConfigurationError {
  code: 'NETWORK_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'NOT_FOUND';
  message: string;
  details?: unknown;
}