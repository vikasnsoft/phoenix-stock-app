export interface ApiResponse<T> {
  readonly data: T;
  readonly error: null | { readonly message: string };
  readonly meta?: Record<string, unknown>;
}

export const createSuccessResponse = <T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> => {
  if (meta) {
    return { data, error: null, meta };
  }
  return { data, error: null };
};
