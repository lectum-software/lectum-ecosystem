// Tipos compartilhados da camada de API (callers/req).

export type Pagination<T> = {
  data: T[];
  page: number;
  pages: number;
  count: number;
};

export type IndexFilters = {
  page?: number;
  limit?: number;
  search?: string;
  orderKey?: string;
  orderValue?: "asc" | "desc";
  startDate?: string;
  endDate?: string;
};

export type CallerCallback<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
};

export type IUseCallerProps<T> = {
  filters?: IndexFilters;
  enabledIndex?: boolean;
  callbacks?: {
    index?: CallerCallback<T>;
    update?: CallerCallback<T>;
    clean?: CallerCallback<T>;
  };
};
