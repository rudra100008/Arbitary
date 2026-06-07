export type ServiceResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status: number; details?: Record<string, string[]> };

export function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data };
}

export function fail(error: string, status: number = 400): ServiceResult<never> {
  return { success: false, error, status };
}

export function failWithDetails(
  error: string,
  details: Record<string, string[]>,
  status: number = 400,
): ServiceResult<never> {
  return { success: false, error, details, status };
}
