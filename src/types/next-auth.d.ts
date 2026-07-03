// src/types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: number;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            provider?: string | null;
            lastLoginAt?: Date | string;
            phoneNumber?: string | null;
            bio?: string | null;
            location?: string | null;
            instagramUsername?: string | null;
            googleId?: string | null;
            facebookId?: string;
            facebookAccessToken?: string;
            googleImage?: string | null;
            facebookImage?: string | null;
            dateOfBirth?: string | null;
        } & DefaultSession["user"];
    }

}

declare module "next-auth/jwt" {
    interface JWT {
        userId?: number;
        role?: string;
        provider?: string | null;
        lastLoginAt?: Date | string;
        facebookAccessToken?: string;
        facebookId?: string;
        googleId?: string;
        googleAccessToken?: string;
        googleRefreshToken?: string;
        googleTokenExpiry?: number;
        instagramUsername?: string | null;
        googleImage?: string | null;
        facebookImage?: string | null;
        dateOfBirth?: string | null;
    }
}