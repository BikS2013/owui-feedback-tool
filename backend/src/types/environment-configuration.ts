export interface EnvironmentConfiguration {
  environment: 'development' | 'staging' | 'production';
  version: string;
  timestamp: string;
  features: {
    show_documents?: boolean;
    show_runs?: boolean;
    show_checkpoints?: boolean;
  };
}