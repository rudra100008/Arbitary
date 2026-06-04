import { getServerSession } from "next-auth";
import { authOptions } from "@/src/auth";
import { ServiceResult, fail, ok } from "./result";

export interface SessionUser {
  id: number;
  email: string;
  role: string;
  name?: string | null;
  image?: string | null;
  facebookId?: string;
}

export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = session.user as any;
  return {
    id: Number(user.id),
    email: user.email ?? "",
    role: user.role ?? "user",
    name: user.name,
    image: user.image,
    facebookId: user.facebookId,
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
  if (user.role !== "admin") return fail("Forbidden: Admins only", 403);
  return ok(user);
}
