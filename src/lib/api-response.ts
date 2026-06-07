import { NextResponse } from "next/server";
import type { ServiceResult } from "@/src/services/result";

export function toNextResponse<T>(result: ServiceResult<T>, successStatus = 200): NextResponse {
  if (result.success) {
    return NextResponse.json(result.data, { status: successStatus });
  }
  return NextResponse.json(
    { error: result.error, details: result.details },
    { status: result.status },
  );
}
