export interface CrawlSourceSystemRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  authentication_type: string;
  allowed_domains: string[];
  credential_schema: Record<string, unknown>;
  configuration_schema: Record<string, unknown>;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface CreateCrawlSourceSystemPayload {
  code: string;
  name: string;
  description?: string | null;
  type?: string;
  authentication_type?: string;
  allowed_domains?: string[];
  credential_schema?: Record<string, unknown>;
  configuration_schema?: Record<string, unknown>;
  enabled?: boolean;
}

export interface UpdateCrawlSourceSystemPayload {
  name?: string;
  description?: string | null;
  type?: string;
  authentication_type?: string;
  allowed_domains?: string[];
  credential_schema?: Record<string, unknown>;
  configuration_schema?: Record<string, unknown>;
  enabled?: boolean;
}
