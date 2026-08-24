export interface ApiError {
  code: string;
  field: string | null;
  details: Array<{ field: string; code: string; message: string }>;
}

export interface ApiMeta {
  request_id: string;
  timestamp: string;
  error?: ApiError;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta: ApiMeta;
}
