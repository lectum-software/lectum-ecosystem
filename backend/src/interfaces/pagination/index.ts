export interface PaginationResponse<T> {
  data: T[];
  page: number;
  pages: number;
  count: number;
}
