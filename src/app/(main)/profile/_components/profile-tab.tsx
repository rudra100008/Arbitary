"use client";

import SectionHeader from "./section-header";
import InfoField from "./info-field";

interface ProfileFormState {
  name: string;
  phone: string;
  bio: string;
  location: string;
}

interface ProfileTabProps {
  user:
    | {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: string;
        lastLoginAt?: Date | string;
        bio?: string;
        location?: string;
        phoneNumber?: string;
      }
    | undefined;
  isSaving: boolean;
  isEditing: boolean;
  form: ProfileFormState;
  onFormChange: (updater: (prev: ProfileFormState) => ProfileFormState) => void;
  onEditToggle: () => void;
  onDiscard: () => void;
  saveError?: string | null;
}

/**
 * Content for the "Profile" tab — personal details form and bio card.
 */
export default function ProfileTab({
  user,
  isEditing,
  form,
  onFormChange,
  isSaving,
  onEditToggle,
  onDiscard,
  saveError,
}: ProfileTabProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <SectionHeader
          label="Profile"
          title="Personal Details"
          actions={
            <button
              onClick={onEditToggle}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
                          uppercase tracking-wider transition-all duration-200
                          hover:scale-[1.03] active:scale-[0.97]
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                          ${
                            isEditing
                              ? "bg-[#FACC15] text-black hover:bg-[#eab308]"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving....
                </>
              ) : isEditing ? (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Save
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  Edit Profile
                </>
              )}
            </button>
          }
        />

        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full name */}
          <InfoField
            label="Full Name"
            value={user?.name || "—"}
            editing={isEditing}
            inputValue={form.name}
            onChange={(v) => onFormChange((f) => ({ ...f, name: v }))}
            placeholder="Your full name"
          />
          {/* Email — never editable */}
          <InfoField
            label="Email Address"
            value={user?.email || "—"}
            editing={false}
          />
          {/* Phone */}
          <InfoField
            label="Phone Number"
            value={form.phone || "Not set"}
            editing={isEditing}
            inputValue={form.phone}
            onChange={(v) => onFormChange((f) => ({ ...f, phone: v }))}
            placeholder="+1 (555) 000-0000"
          />
          {/* Location */}
          <InfoField
            label="Location"
            value={form.location || "Not set"}
            editing={isEditing}
            inputValue={form.location}
            onChange={(v) => onFormChange((f) => ({ ...f, location: v }))}
            placeholder="City, Country"
          />
          {/* Member since */}
          <InfoField
            label="Member Since"
            value={
              user?.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"
            }
            editing={false}
          />
          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Role
            </p>
            <span
              className="inline-flex w-fit items-center px-2.5 py-1 rounded-lg
                             bg-slate-900 text-[#FACC15] text-xs font-bold uppercase tracking-wider"
            >
              {user?.role || "User"}
            </span>
          </div>
        </div>
      </div>

      {/* Bio card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
          Bio
        </p>
        {isEditing ? (
          <div className="relative">
            <textarea
              value={form.bio}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, bio: e.target.value }))
              }
              placeholder="Write a short bio about yourself..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm
                         text-gray-900 placeholder:text-gray-400 resize-none
                         focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/8
                         transition-all"
            />
            <span className="absolute bottom-2 right-3 text-[10px] font-medium text-gray-400">
              {form.bio.length}/200
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500 leading-relaxed">
            {form.bio || "No bio added yet. Click Edit Profile to add one."}
          </p>
        )}
      </div>

      {/* Inline error */}
      {saveError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {saveError}
        </div>
      )}

      {/* Discard button */}
      {isEditing && (
        <button
          onClick={onDiscard}
          className="self-start text-xs font-semibold text-gray-400 hover:text-gray-700
                     transition-colors underline underline-offset-2"
        >
          Discard changes
        </button>
      )}
    </div>
  );
}
