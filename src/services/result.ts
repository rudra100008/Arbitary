export type ServiceResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status: number; code?: string; details?: Record<string, string[]> };

export function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data };
}

export function fail(error: string, status: number = 400, code?: string): ServiceResult<never> {
  return { success: false, error, status, ...(code ? { code } : {}) };
}

export function failWithDetails(
  error: string,
  details: Record<string, string[]>,
  status: number = 400,
): ServiceResult<never> {
  return { success: false, error, details, status };
}