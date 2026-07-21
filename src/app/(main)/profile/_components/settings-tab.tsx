"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import SectionHeader from "./section-header";
import { usePlatformFlags } from "@/src/hooks/use-platform-flags";
import Image from "next/image";

interface SettingsTabProps {
  userEmail?: string | null;
  provider?: string | null;
  googleId?: string | null;
  googleNeedsReconnect?: boolean;
  facebookId?: string;
  instagramUsername?: string | null;
  googleImage?: string | null;
  facebookImage?: string | null;
  image?: string | null;
  onUpdateSession?: () => void;
}

export default function SettingsTab({
  userEmail,
  provider,
  googleId,
  googleNeedsReconnect,
  facebookId,
  instagramUsername,
  googleImage,
  facebookImage,
  image,
  onUpdateSession,
}: SettingsTabProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [igUsername, setIgUsername] = useState(instagramUsername || "");
  const [isSavingIg, setIsSavingIg] = useState(false);
  const [switchingAvatar, setSwitchingAvatar] = useState<
    "google" | "facebook" | null
  >(null);
  const { flags } = usePlatformFlags();

  const handleSwitchAvatar = async (source: "google" | "facebook") => {
    setSwitchingAvatar(source);
    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to switch avatar");
      }
      toast.success("Profile picture updated!");
      onUpdateSession?.();
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : null) ||
          "Failed to switch avatar",
      );
    } finally {
      setSwitchingAvatar(null);
    }
  };

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      return data;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    },
    onError: (error: Error) => {
      setPasswordError(error.message);
    },
  });

  const handleChangePassword = () => {
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }
    changePasswordMutation.mutate();
  };
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <SectionHeader label="Account" title="Settings" />

        <div className="px-6 pb-6">
          {/* ── Avatar Switcher ────────────────────────────────────────────── */}
          {(googleImage || facebookImage) && googleImage !== facebookImage && (
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
                Profile Picture
              </p>
              <div className="flex gap-3">
                {googleImage && (
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={() => handleSwitchAvatar("google")}
                      disabled={!!switchingAvatar}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60
                                 ${image === googleImage ? "border-emerald-400 ring-2 ring-emerald-200" : "border-gray-200 hover:border-emerald-400"}`}
                      title="Use Google profile photo"
                    >
                      <Image
                        src={googleImage}
                        alt="Google avatar"
                        fill
                        className="object-cover"
                      />
                      {switchingAvatar === "google" && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </button>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                      Google
                    </span>
                  </div>
                )}
                {facebookImage && (
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={() => handleSwitchAvatar("facebook")}
                      disabled={!!switchingAvatar}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60
                                 ${image === facebookImage ? "border-emerald-400 ring-2 ring-emerald-200" : "border-gray-200 hover:border-[#1877F2]"}`}
                      title="Use Facebook profile photo"
                    >
                      <Image
                        src={facebookImage}
                        alt="Facebook avatar"
                        fill
                        className="object-cover"
                      />
                      {switchingAvatar === "facebook" && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </button>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                      Facebook
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Click a photo to set it as your active profile picture.
              </p>
            </div>
          )}

          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
            Connected Accounts
          </p>
          <div className="flex flex-col gap-2">
            {/* Google */}
            <div
              className="flex items-center justify-between px-4 py-3
                            bg-gray-50 border border-gray-100 rounded-xl
                            transition-all duration-200 hover:bg-white hover:border-gray-200 hover:shadow-sm hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200
                                flex items-center justify-center shadow-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Google</p>
                  <p className="text-xs text-gray-400">
                    {googleId ? (googleNeedsReconnect ? "Reconnect required" : userEmail) : "Not connected"}
                  </p>
                </div>
              </div>
              {googleId ? (
                <div className="flex items-center gap-2">
                  {googleNeedsReconnect ? (
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider
                                 bg-amber-50 text-amber-600 border border-amber-100"
                    >
                      Action Needed
                    </span>
                  ) : (
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider
                                 bg-emerald-50 text-emerald-600 border border-emerald-100"
                    >
                      Connected
                    </span>
                  )}
                  <button
                    onClick={() =>
                      signIn("google", { callbackUrl: window.location.href })
                    }
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider
                               bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200
                               transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Reconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() =>
                    signIn("google", { callbackUrl: window.location.href })
                  }
                  className="text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider
                             bg-blue-600 text-white hover:bg-blue-700
                             transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Link
                </button>
              )}
            </div>

            {/* Facebook */}
            <div
              className="flex items-center justify-between px-4 py-3
                            bg-gray-50 border border-gray-100 rounded-xl
                            transition-all duration-200 hover:bg-white hover:border-gray-200 hover:shadow-sm hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Facebook
                  </p>
                  <p className="text-xs text-gray-400">
                    {facebookId
                      ? "Connected"
                      : flags.facebook
                        ? "Not connected"
                        : "Temporarily unavailable"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {facebookId ? (
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider
                          bg-emerald-50 text-emerald-600 border border-emerald-100`}
                  >
                    Connected
                  </span>
                ) : flags.facebook ? (
                  <button
                    onClick={() =>
                      signIn("facebook", { callbackUrl: window.location.href })
                    }
                    className="text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider
                                 bg-[#1877F2] text-white hover:bg-blue-700
                                 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Link
                  </button>
                ) : (
                  <span
                    title="Facebook linking is temporarily unavailable"
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider
                                 bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  >
                    Unavailable
                  </span>
                )}
              </div>{" "}
            </div>

            {/* Instagram */}
            <div
              className="flex items-center justify-between px-4 py-3
                            bg-gray-50 border border-gray-100 rounded-xl
                            transition-all duration-200 hover:bg-white hover:border-gray-200 hover:shadow-sm hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Instagram Username
                  </p>
                  {instagramUsername ? (
                    <p className="text-xs text-emerald-600 font-medium">
                      @{instagramUsername}
                    </p>
                  ) : flags.instagram ? (
                    <p className="text-xs text-gray-400">Not linked</p>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Temporarily unavailable
                    </p>
                  )}
                </div>
              </div>
              {flags.instagram || instagramUsername ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={igUsername}
                    onChange={(e) =>
                      setIgUsername(e.target.value.replace(/^@/, "").trim())
                    }
                    placeholder="your_username"
                    disabled={!flags.instagram}
                    className="w-28 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white
                             focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400/30
                             text-gray-900 placeholder:text-gray-400 transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={async () => {
                      if (!igUsername || !flags.instagram) return;
                      setIsSavingIg(true);
                      try {
                        const res = await fetch("/api/user/profile", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            instagramUsername: igUsername,
                          }),
                        });
                        if (!res.ok) {
                          const d = await res.json();
                          throw new Error(d.error || "Failed to save");
                        }
                        toast.success("Instagram username saved!");
                        onUpdateSession?.();
                      } catch (err: unknown) {
                        toast.error(
                          (err instanceof Error ? err.message : null) ||
                            "Failed to save",
                        );
                      } finally {
                        setIsSavingIg(false);
                      }
                    }}
                    disabled={isSavingIg || !igUsername || !flags.instagram}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider
                             bg-gradient-to-r from-pink-500 to-purple-600 text-white
                             hover:scale-105 active:scale-95 transition-all duration-200
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSavingIg ? "..." : "Save"}
                  </button>
                </div>
              ) : (
                <span
                  title="Instagram linking is temporarily unavailable"
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider
                             bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                >
                  Unavailable
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account management */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
          Account Management
        </p>
        <div className="flex flex-col gap-2">
          {/* Password */}
          {provider === "credentials" && (
            <div className="flex flex-col px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Password
                  </p>
                  <p className="text-xs text-gray-400">
                    Change your account password
                  </p>
                </div>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="text-xs font-bold text-gray-600 bg-white border border-gray-200
                               hover:bg-slate-900 hover:text-white hover:border-slate-900
                               px-3.5 py-1.5 rounded-lg transition-all duration-200
                               active:scale-95"
                >
                  {showPasswordForm ? "Cancel" : "Change"}
                </button>
              </div>

              {showPasswordForm && (
                <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                  <div>
                    <input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setPasswordError("");
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                                   focus:outline-none focus:border-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="New password (min 8 characters)"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError("");
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                                   focus:outline-none focus:border-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError("");
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                                   focus:outline-none focus:border-slate-900 bg-white"
                    />
                  </div>

                  {passwordError && (
                    <p className="text-xs text-red-500 font-medium">
                      {passwordError}
                    </p>
                  )}

                  <button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="w-full py-2 rounded-lg bg-slate-900 text-white text-xs font-bold
                                 hover:bg-slate-800 transition-all duration-200
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changePasswordMutation.isPending
                      ? "Saving..."
                      : "Save Password"}
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Space for more settings */}
          <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-200 rounded-xl text-gray-400">
            <p className="text-xs font-medium">More settings coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
