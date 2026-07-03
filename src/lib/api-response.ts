import { NextResponse } from "next/server";
import type { ServiceResult } from "@/src/services/result";

export function toNextResponse<T>(result: ServiceResult<T>, successStatus = 200): NextResponse {
  if (result.success) {
    return NextResponse.json(result.data, { status: successStatus });
  }
  return NextResponse.json(
    {
      success: false,
      error: result.error,
      message: result.error,
      ...(result.code ? { code: result.code } : {}),
      ...(result.details ? { details: result.details } : {}),
    },
    { status: result.status },
  );
}