// C:\Office-Work\arbitary\arbitary-website\src\auth.ts

import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import FacebookProvider from "next-auth/providers/facebook";
import { ReferralService } from "@/src/services/referral.service";
import { encryptToken, decryptToken } from "@/src/lib/token-crypto";
import { cookies } from "next/headers";
import { FeatureFlagService } from "@/src/services/feature-flag.service";

export const authOptions: import("next-auth").NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            authorization: {
                params: {
                    scope: 'openid email profile https://www.googleapis.com/auth/youtube.force-ssl',
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
                try {
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

                    // Google account check - use generic message to prevent enumeration
                    if (!dbUser.password) {
                        return null;
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
                } catch (error) {
                    console.error("authorize error:", error);
                    return null;
                }
            },
        }),
    ],

    pages: {
        signIn: "/login",
        error: "/login",
    },

    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            if (account?.provider === "facebook") {
                const facebookEnabled = await FeatureFlagService.isPlatformEnabled("facebook");
                if (!facebookEnabled) {
                    console.warn("Rejected Facebook sign-in attempt: Facebook integration is currently disabled");
                    return "/login?error=FACEBOOK_DISABLED";
                }
            }
            if (account?.provider === "google") {
                try {
                    const existingByGoogleId = await db.query.usersTable.findFirst({
                        where: eq(usersTable.googleId, account.providerAccountId),
                    });
                    if (existingByGoogleId && existingByGoogleId.email !== user.email) {
                        console.warn(
                            `Google ID ${account.providerAccountId} already linked to ${existingByGoogleId.email}, ` +
                            `rejecting sign-in attempt from ${user.email}`
                        );
                        return false;
                    }
                } catch (error) {
                    console.error("Google signIn check failed:", error);
                    return false;
                }
            }
            if (account?.provider === "google" || account?.provider === "facebook") {
                try {
                    const existingUser = await db.query.usersTable.findFirst({
                        where: eq(usersTable.email, user.email!),
                    });

                    if (existingUser) {
                        const updateData: Record<string, string | boolean | Date | null | undefined> = {
                            name: user.name,
                            lastLoginAt: new Date(),
                            isVerified: true,
                        };
                        // Only set the active avatar if the user doesn't already have one
                        if (!existingUser.image) {
                            updateData.image = user.image;
                        }
                        if (account.provider === "google") {
                            if (!existingUser.googleId) {
                                updateData.googleId = account.providerAccountId;
                            }
                            if (account.refresh_token) {
                                updateData.googleRefreshToken = encryptToken(account.refresh_token);
                            }
                            // Always keep the stored Google avatar fresh
                            updateData.googleImage = user.image;
                        }
                        if (account.provider === "facebook") {
                            updateData.facebookId = account.providerAccountId;
                            // Always keep the stored Facebook avatar fresh
                            updateData.facebookImage = user.image;
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
                            googleRefreshToken: account.provider === "google" && account.refresh_token ? encryptToken(account.refresh_token) : null,
                            facebookId: account.provider === "facebook" ? account.providerAccountId : null,
                            googleImage: account.provider === "google" ? user.image : null,
                            facebookImage: account.provider === "facebook" ? user.image : null,
                            provider: account.provider,
                            role: "USER",
                            lastLoginAt: new Date(),
                            isVerified: true,
                        }).returning({ id: usersTable.id });

                        if (newUser) {
                            await ReferralService.assignReferralCode(newUser.id);

                            // Read the referral code from the httpOnly cookie set by
                            // POST /api/auth/pre-oauth just before the OAuth redirect.
                            // Using a cookie (not callbackUrl) keeps the ref code out of
                            // the URL and prevents injection into non-signup login flows.
                            const cookieStore = await cookies();
                            const refParam = cookieStore.get("pending_ref_code")?.value ?? null;
                            if (refParam) {
                                // Clear it immediately — one-time use
                                cookieStore.delete("pending_ref_code");
                                await ReferralService.bindReferralCode(newUser.id, refParam).catch(
                                    (err) => console.error("Failed to bind referral code on OAuth signup:", err),
                                );
                            }
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
                if (account.refresh_token) {
                    token.googleRefreshToken = account.refresh_token;
                }
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
                            scope: 'openid email profile https://www.googleapis.com/auth/youtube.force-ssl',
                        }),
                    });
                    const refreshed = await response.json();
                    if (refreshed.access_token) {
                        token.googleAccessToken = refreshed.access_token;
                        token.googleTokenExpiry = Math.floor(Date.now() / 1000) + refreshed.expires_in;
                        if (refreshed.refresh_token && token.userId) {
                            await db.update(usersTable)
                                .set({ googleRefreshToken: encryptToken(refreshed.refresh_token) })
                                .where(eq(usersTable.id, token.userId as number))
                                .catch(err => console.error('Failed to persist rotated Google refresh token:', err));
                        }
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
                    token.dateOfBirth = dbUser.dateOfBirth ? dbUser.dateOfBirth.toISOString() : null;
                    if (dbUser.googleRefreshToken && !token.googleRefreshToken) {
                        const decrypted = decryptToken(dbUser.googleRefreshToken);
                        if (decrypted) {
                            token.googleRefreshToken = decrypted;
                            token.googleTokenExpiry = 0;
                        }
                    }
                    if (dbUser.facebookId) token.facebookId = dbUser.facebookId;
                    if (dbUser.instagramUsername) token.instagramUsername = dbUser.instagramUsername;
                    token.googleImage = dbUser.googleImage ?? undefined;
                    token.facebookImage = dbUser.facebookImage ?? undefined;
                } else if (trigger === "signIn") {
                    console.warn("JWT signIn: DB user not found for email", token.email);
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
                session.user.instagramUsername = token.instagramUsername as string | undefined;
                session.user.facebookId = token.facebookId as string;
                session.user.facebookAccessToken = token.facebookAccessToken as string | undefined;
                session.user.googleImage = token.googleImage as string | undefined;
                session.user.facebookImage = token.facebookImage as string | undefined;
                session.user.dateOfBirth = (token.dateOfBirth as string | null | undefined) ?? null;
            }
            return session;
        },

        // Redirect Callback
        async redirect({ url, baseUrl }) {
            if (url.startsWith("/")) {
                const resolved = new URL(url, baseUrl);
                if (resolved.origin !== baseUrl) return baseUrl;
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