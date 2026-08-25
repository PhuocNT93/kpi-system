export interface ApiError {
  code: string;
  field: string | null;
  details: Array<{ field: string; code: string; message: string }>;
}

export interface PageMeta {
  number: number;
  size: number;
  total_items: number;
  total_pages: number;
}

export interface ApiMeta {
  request_id: string;
  timestamp: string;
  error?: ApiError;
  page?: PageMeta;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta: ApiMeta;
}
