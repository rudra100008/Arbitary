//C:\Office-Work\arbitary\arbitary-website\src\app\api\auth\[...nextauth]\route.ts
import NextAuth from "next-auth";
// We need to use the auth configuration directly since it's NextAuth v4
import { authOptions } from "@/src/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };