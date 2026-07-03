import { getServerSession } from "next-auth";
import { authOptions } from "@/src/auth";
import { ServiceResult, fail, ok } from "./result";
import { isEligibleAge } from "@/src/lib/age";

export interface SessionUser {
  id: number;
  email: string;
  role: string;
  name?: string | null;
  image?: string | null;
  facebookId?: string;
  dateOfBirth?: string | null;
}

export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = session.user;
  return {
    id: Number(user.id),
    email: user.email ?? "",
    role: user.role ?? "USER",
    name: user.name,
    image: user.image,
    facebookId: user.facebookId,
    dateOfBirth: user.dateOfBirth ?? null,
  };
}

export async function requireUser(): Promise<ServiceResult<SessionUser>> {
  const user = await getOptionalUser();
  if (!user) return fail("Unauthorized", 401);
  return ok(user);
}

export async function requireAdmin(): Promise<ServiceResult<SessionUser>> {
  const user = await getOptionalUser();
  if (!user) return fail("Unauthorized", 401);
  const role = user.role.toLowerCase();
  if (role !== "admin" && role !== "super_admin") {
    return fail("Forbidden: Admins only", 403);
  }
  return ok(user);
}

/**
 * Like requireUser(), but additionally enforces the 21+ age gate for
 * promotional participation. Checks the session's dateOfBirth (already
 * loaded via the JWT — no extra DB hit). Missing/invalid birthdays are
 * always treated as ineligible, never assumed eligible.
 */
export async function requireEligibleParticipant(): Promise<ServiceResult<SessionUser>> {
  const user = await getOptionalUser();
  if (!user) return fail("Unauthorized", 401);
  if (!isEligibleAge(user.dateOfBirth)) {
    return fail("You must be 21 or older to participate in this promotion", 403);
  }
  return ok(user);
}
