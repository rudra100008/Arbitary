// C:\Office-Work\arbitary\arbitary-website\src\auth.ts

import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import FacebookProvider from "next-auth/providers/facebook";
import { ReferralService } from "@/src/services/referral.service";

export const authOptions: import("next-auth").NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            authorization: {
                params: {
                    scope: 'openid email profile',
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        }),
        FacebookProvider({
            clientId: process.env.FACEBOOK_LOGIN_APP_ID || "",
            clientSecret: process.env.FACEBOOK_LOGIN_APP_SECRET || "",
            authorization: {
                params: {
                    scope: "public_profile,email",
                }
            }
        }),
        CredentialsProvider({
            name: "credentials",

            credentials: {
                email: {
                    label: "Email",
                    type: "email",
                },

                password: {
                    label: "Password",
                    type: "password",
                },
            },

            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // Find user
                const dbUser = await db.query.usersTable.findFirst({
                    where: eq(usersTable.email, credentials.email),
                });

                if (!dbUser) {
                    return null;
                }

                // Google account check
                if (!dbUser.password) {
                    throw new Error(
                        "This email is linked to a Google account. Please sign in with Google.",
                    );
                }

                // Compare password
                const isValid = await bcrypt.compare(
                    credentials.password,
                    dbUser.password,
                );

                if (!isValid) {
                    return null;
                }

                // Update login time
                await db
                    .update(usersTable)
                    .set({
                        lastLoginAt: new Date(),
                    })
                    .where(eq(usersTable.email, credentials.email));

                return {
                    id: String(dbUser.id),
                    email: dbUser.email,
                    name: dbUser.name,
                    image: dbUser.image,
                };
            },
        }),
    ],

    pages: {
        signIn: "/login",
        error: "/login",
    },

    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google" || account?.provider === "facebook") {
                try {
                    const existingUser = await db.query.usersTable.findFirst({
                        where: eq(usersTable.email, user.email!),
                    });

                    if (existingUser) {
                        const updateData: Record<string, any> = {
                            name: user.name,
                            image: user.image,
                            lastLoginAt: new Date(),
                        };
                        if (account.provider === "google" && !existingUser.googleId) {
                            updateData.googleId = account.providerAccountId;
                        }
                        if (account.provider === "facebook") {
                            updateData.facebookId = account.providerAccountId;
                        }
                        await db
                            .update(usersTable)
                            .set(updateData)
                            .where(eq(usersTable.email, user.email!));
                    } else {
                        const [newUser] = await db.insert(usersTable).values({
                            email: user.email!,
                            name: user.name,
                            image: user.image,
                            googleId: account.provider === "google" ? account.providerAccountId : null,
                            facebookId: account.provider === "facebook" ? account.providerAccountId : null,
                            provider: account.provider,
                            role: "USER",
                            lastLoginAt: new Date(),
                        }).returning({ id: usersTable.id });

                        if (newUser) {
                            await ReferralService.assignReferralCode(newUser.id);
                        }
                    }
                } catch (error) {
                    console.error("Failed to save user:", error);
                    return false;
                }
            }

            return true;
        },

        // JWT Callback
        async jwt({ token, trigger, account, session: updateSession }) {
            if (account?.provider === "facebook") {
                token.facebookAccessToken = account.access_token;
                token.facebookId = account.providerAccountId;
            }

            if (account?.provider === "google") {
                token.googleAccessToken = account.access_token;
                token.googleRefreshToken = account.refresh_token;
                token.googleTokenExpiry = account.expires_at;
            }

            // Auto-refresh Google access token if expired
            const isExpired = token.googleTokenExpiry
                ? Date.now() > (token.googleTokenExpiry as number) * 1000
                : false;
            if (token.googleRefreshToken && isExpired) {
                try {
                    const response = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: process.env.GOOGLE_CLIENT_ID!,
                            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                            grant_type: 'refresh_token',
                            refresh_token: token.googleRefreshToken as string,
                        }),
                    });
                    const refreshed = await response.json();
                    if (refreshed.access_token) {
                        token.googleAccessToken = refreshed.access_token;
                        token.googleTokenExpiry = Math.floor(Date.now() / 1000) + refreshed.expires_in;
                    }
                } catch (err) {
                    console.error('Google token refresh failed:', err);
                }
            }

            // Only hit DB on signIn, explicit update, or first-time token
            if (trigger === "signIn" || trigger === "update" || !token.userId) {
                const dbUser = await db.query.usersTable.findFirst({
                    where: eq(usersTable.email, token.email!),
                });

                if (dbUser) {
                    token.userId = dbUser.id;
                    token.name = dbUser.name;
                    token.image = dbUser.image;
                    token.role = dbUser.role;
                    token.provider = dbUser.provider;
                    token.lastLoginAt = dbUser.lastLoginAt?.toISOString();
                    token.bio = dbUser.bio;
                    token.location = dbUser.location;
                    token.phoneNumber = dbUser.phoneNumber;
                    token.googleId = dbUser.googleId ?? undefined;
                    if (dbUser.facebookId) token.facebookId = dbUser.facebookId;
                }
            }

            return token;
        },

        // Session call
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.userId as number;
                session.user.name = token.name as string;
                session.user.image = token.image as string;
                session.user.role = token.role as string;
                session.user.email = token.email as string;
                session.user.lastLoginAt = token.lastLoginAt as string;
                session.user.provider = token.provider as string;
                session.user.bio = token.bio as string;
                session.user.location = token.location as string;
                session.user.phoneNumber = token.phoneNumber as string;
                session.user.googleId = token.googleId as string;
                session.facebookAccessToken = token.facebookAccessToken as string;
                session.facebookId = token.facebookId as string;
                session.googleAccessToken = token.googleAccessToken as string;
                session.googleTokenExpiry = token.googleTokenExpiry as number;
            }
            return session;
        },

        // Redirect Callback
        async redirect({ url, baseUrl }) {
            if (url.startsWith("/")) {
                return `${baseUrl}${url}`;
            }

            if (new URL(url).origin === baseUrl) {
                return url;
            }

            return baseUrl;
        },
    },

    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },

    secret: process.env.NEXTAUTH_SECRET,
};