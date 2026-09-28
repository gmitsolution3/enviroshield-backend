export type TPaginationOptions = {
  page?: string;
  limit?: string;
};

export type TPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  meta?: TPaginationMeta;
  data?: T;
};
