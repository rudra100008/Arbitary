"use client";

import { ChevronDown } from "lucide-react";
import type { ContentSection, AccessType, TimelineItem } from "./types";
import ContentSectionEditor from "./content-section-editor";
import AccessTypeEditor from "./access-type-editor";
import TimelineEditor from "./timeline-editor";

interface HeroImage {
  url: string;
  previewUrl?: string;
  file?: File;
}

interface EventFormModalProps {
  isOpen: boolean;
  isSaving: boolean;
  editingEventId: number | null;
  fieldErrors: Record<string, string>;
  onClose: () => void;
  onSave: () => void;
  setFieldErrors: (e: Record<string, string>) => void;

  eventTitle: string;
  setEventTitle: (v: string) => void;
  eventType: string;
  setEventType: (v: string) => void;
  eventStatus: string;
  setEventStatus: (v: string) => void;
  eventDate: string;
  setEventDate: (v: string) => void;
  eventVenue: string;
  setEventVenue: (v: string) => void;
  eventDescription: string;
  setEventDescription: (v: string) => void;

  heroImage: HeroImage;
  setHeroImage: (v: HeroImage) => void;

  contentSections: ContentSection[];
  setContentSections: (v: ContentSection[]) => void;
  accessTypes: AccessType[];
  setAccessTypes: (v: AccessType[]) => void;
  timelines: TimelineItem[];
  setTimelines: (v: TimelineItem[]) => void;

  handleHeroImageDrop: (e: React.DragEvent) => void;
  handleHeroImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const clearFieldError = (
  fieldErrors: Record<string, string>,
  setFieldErrors: (e: Record<string, string>) => void,
  key: string,
) => {
  if (fieldErrors[key]) {
    const next = { ...fieldErrors };
    delete next[key];
    setFieldErrors(next);
  }
};

const EventFormModal = ({
  isOpen,
  isSaving,
  editingEventId,
  fieldErrors,
  onClose,
  onSave,
  setFieldErrors,
  eventTitle,
  setEventTitle,
  eventType,
  setEventType,
  eventStatus,
  setEventStatus,
  eventDate,
  setEventDate,
  eventVenue,
  setEventVenue,
  eventDescription,
  setEventDescription,
  heroImage,
  setHeroImage,
  contentSections,
  setContentSections,
  accessTypes,
  setAccessTypes,
  timelines,
  setTimelines,
  handleHeroImageDrop,
  handleHeroImageChange,
}: EventFormModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-zinc-100 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col animate-modal-up">
        <div className="p-8 border-b border-black/5 bg-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter">
              {editingEventId ? "📝 Edit Experience" : "✨ Create New Event"}
            </h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
              {editingEventId
                ? "Modify existing experience details and media"
                : "Build a new unique experience for the Arbitary database"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-zinc-50 hover:bg-black hover:text-white transition-all flex items-center justify-center font-black z-[110]"
          >
            ✕
          </button>
        </div>

        {Object.keys(fieldErrors).length > 0 && (
          <div className="px-8 py-4 bg-red-50 border-b border-red-200 flex items-start gap-3">
            <div className="text-xl mt-0.5">⚠️</div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-red-600 mb-2">
                Validation Errors Found
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(fieldErrors).map(([field, error]) => (
                  <div
                    key={field}
                    className="text-[11px] bg-white border border-red-200 rounded-lg px-3 py-1 text-red-600 font-bold"
                  >
                    <strong>{field}:</strong> {error}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
            <div className="lg:col-span-2 space-y-12">
              <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 space-y-8 shadow-sm">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                    Main Title
                  </label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => {
                      setEventTitle(e.target.value);
                      if (fieldErrors.title)
                        setFieldErrors({ ...fieldErrors, title: "" });
                    }}
                    placeholder="e.g. Digital Renaissance Expo"
                    className={`w-full px-6 py-4 bg-zinc-50 border rounded-2xl focus:outline-none font-bold text-sm shadow-inner transition-colors ${
                      fieldErrors.title
                        ? "border-red-500 focus:border-red-500"
                        : "border-black/5 focus:border-[#FACC15]"
                    }`}
                  />
                  {fieldErrors.title && (
                    <p className="text-xs text-red-600 font-bold ml-2">
                      ❌ {fieldErrors.title}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <SelectField
                    label="Event Type"
                    value={eventType}
                    options={["Tour", "Concert", "Exhibition"]}
                    hasError={!!fieldErrors.eventType}
                    onChange={(v) => {
                      setEventType(v);
                      if (fieldErrors.eventType)
                        setFieldErrors({ ...fieldErrors, eventType: "" });
                    }}
                  />
                  <SelectField
                    label="Event Status"
                    value={eventStatus}
                    options={["Upcoming", "Success"]}
                    hasError={!!fieldErrors.status}
                    onChange={(v) => {
                      setEventStatus(v);
                      if (fieldErrors.status)
                        setFieldErrors({ ...fieldErrors, status: "" });
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <TextField
                    label="Event Date"
                    type="date"
                    value={eventDate}
                    error={fieldErrors.date}
                    onChange={(v) => {
                      setEventDate(v);
                      if (fieldErrors.date)
                        setFieldErrors({ ...fieldErrors, date: "" });
                    }}
                  />
                  <TextField
                    label="Venue"
                    value={eventVenue}
                    placeholder="e.g. Kathmandu"
                    error={fieldErrors.venue}
                    onChange={(v) => {
                      setEventVenue(v);
                      if (fieldErrors.venue)
                        setFieldErrors({ ...fieldErrors, venue: "" });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                    Short Description
                  </label>
                  <textarea
                    value={eventDescription}
                    onChange={(e) => {
                      setEventDescription(e.target.value);
                      if (fieldErrors.description)
                        setFieldErrors({ ...fieldErrors, description: "" });
                    }}
                    placeholder="Brief summary of the experience for the events list page..."
                    className={`w-full px-6 py-4 bg-zinc-50 border rounded-2xl focus:outline-none font-bold text-sm h-24 resize-none transition-colors ${
                      fieldErrors.description
                        ? "border-red-500 focus:border-red-500"
                        : "border-black/5 focus:border-[#FACC15]"
                    }`}
                  />
                  {fieldErrors.description && (
                    <p className="text-xs text-red-600 font-bold ml-2">
                      ❌ {fieldErrors.description}
                    </p>
                  )}
                </div>
              </div>

              <ContentSectionEditor
                sections={contentSections}
                onAdd={() =>
                  setContentSections([
                    ...contentSections,
                    { id: Math.random().toString(), type: "content", content: "" },
                  ])
                }
                onRemove={(id) =>
                  setContentSections(contentSections.filter((s) => s.id !== id))
                }
                onUpdateType={(id, type) =>
                  setContentSections(
                    contentSections.map((s) =>
                      s.id === id
                        ? {
                            ...s,
                            type,
                            mediaItems:
                              type === "media"
                                ? [{ id: Math.random().toString(), url: "" }]
                                : undefined,
                          }
                        : s,
                    ),
                  )
                }
                onAddMedia={(sectionId) =>
                  setContentSections(
                    contentSections.map((s) =>
                      s.id === sectionId && s.mediaItems
                        ? {
                            ...s,
                            mediaItems: [
                              ...s.mediaItems,
                              { id: Math.random().toString(), url: "" },
                            ],
                          }
                        : s,
                    ),
                  )
                }
                onRemoveMedia={(sectionId, itemId) =>
                  setContentSections(
                    contentSections.map((s) =>
                      s.id === sectionId && s.mediaItems
                        ? {
                            ...s,
                            mediaItems: s.mediaItems.filter(
                              (item) => item.id !== itemId,
                            ),
                          }
                        : s,
                    ),
                  )
                }
                onUpdateMediaFile={(sectionId, itemId, file) => {
                  const previewUrl = URL.createObjectURL(file);
                  setContentSections(
                    contentSections.map((s) =>
                      s.id === sectionId && s.mediaItems
                        ? {
                            ...s,
                            mediaItems: s.mediaItems.map((item) =>
                              item.id === itemId
                                ? { ...item, file, previewUrl }
                                : item,
                            ),
                          }
                        : s,
                    ),
                  );
                }}
                onUpdateMediaUrl={(sectionId, itemId, url) =>
                  setContentSections(
                    contentSections.map((s) =>
                      s.id === sectionId && s.mediaItems
                        ? {
                            ...s,
                            mediaItems: s.mediaItems.map((item) =>
                              item.id === itemId
                                ? { ...item, url, previewUrl: url }
                                : item,
                            ),
                          }
                        : s,
                    ),
                  )
                }
                onUpdateContent={(id, content) =>
                  setContentSections(
                    contentSections.map((s) =>
                      s.id === id ? { ...s, content } : s,
                    ),
                  )
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AccessTypeEditor
                  types={accessTypes}
                  fieldErrors={fieldErrors}
                  onAdd={() =>
                    setAccessTypes([
                      ...accessTypes,
                      { id: Math.random().toString(), title: "", price: "" },
                    ])
                  }
                  onRemove={(id) =>
                    setAccessTypes(accessTypes.filter((a) => a.id !== id))
                  }
                  onUpdate={(id, field, value) =>
                    setAccessTypes(
                      accessTypes.map((a) =>
                        a.id === id ? { ...a, [field]: value } : a,
                      ),
                    )
                  }
                  onClearError={(key) =>
                    clearFieldError(fieldErrors, setFieldErrors, key)
                  }
                />
                <TimelineEditor
                  timelines={timelines}
                  fieldErrors={fieldErrors}
                  onAdd={() =>
                    setTimelines([
                      ...timelines,
                      { id: Math.random().toString(), time: "", description: "" },
                    ])
                  }
                  onRemove={(id) =>
                    setTimelines(timelines.filter((t) => t.id !== id))
                  }
                  onUpdate={(id, field, value) =>
                    setTimelines(
                      timelines.map((t) =>
                        t.id === id ? { ...t, [field]: value } : t,
                      ),
                    )
                  }
                  onClearError={(key) =>
                    clearFieldError(fieldErrors, setFieldErrors, key)
                  }
                />
              </div>
            </div>

            <div className="space-y-8 h-fit lg:sticky lg:top-0">
              <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 space-y-8 shadow-sm">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                  Hero Cover Asset
                </label>
                <div
                  className="aspect-[3/4] rounded-[2rem] border-2 border-dashed border-black/5 flex flex-col items-center justify-center p-12 text-center hover:bg-zinc-50 transition-all cursor-pointer group bg-zinc-50/50 relative overflow-hidden"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleHeroImageDrop}
                  onClick={() =>
                    document.getElementById("hero-upload")?.click()
                  }
                >
                  {heroImage.previewUrl || heroImage.url ? (
                    <img
                      src={heroImage.previewUrl || heroImage.url}
                      alt="Hero Cover Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <span className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-500">
                        🖼️
                      </span>
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight">
                        Drop Main Event Cover Image
                      </p>
                      <p className="text-[9px] text-zinc-300 mt-4 font-bold uppercase">
                        Optimized for vertical aspect
                      </p>
                    </>
                  )}
                  <input
                    id="hero-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleHeroImageChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                    Direct Image URL
                  </label>
                  <input
                    type="text"
                    value={heroImage.url}
                    onChange={(e) => {
                      setHeroImage({
                        ...heroImage,
                        url: e.target.value,
                        previewUrl: e.target.value,
                      });
                      if (fieldErrors.heroImageUrl)
                        setFieldErrors({ ...fieldErrors, heroImageUrl: "" });
                    }}
                    placeholder="https://..."
                    className={`w-full px-6 py-4 bg-zinc-50 border rounded-2xl focus:outline-none font-medium text-xs transition-colors ${
                      fieldErrors.heroImageUrl
                        ? "border-red-500 focus:border-red-500"
                        : "border-black/5 focus:border-[#FACC15]"
                    }`}
                  />
                  {fieldErrors.heroImageUrl && (
                    <p className="text-xs text-red-600 font-bold ml-2">
                      ❌ {fieldErrors.heroImageUrl}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center pt-8 border-t border-black/5 mt-8 pb-12">
            <button
              onClick={onSave}
              disabled={isSaving}
              className={`px-20 py-6 bg-[#FACC15] text-black font-black uppercase tracking-[0.2em] rounded-3xl transition-all duration-500 shadow-2xl shadow-[#FACC15]/30 text-base ${
                isSaving
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-black hover:text-[#FACC15]"
              }`}
            >
              {isSaving
                ? "Saving..."
                : editingEventId
                  ? "Update Experience"
                  : "Save Experience"}
            </button>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .animate-modal-up {
          animation: modalUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        @keyframes modalUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `,
        }}
      />
    </div>
  );
};

// --- Reusable sub-components for form fields ---

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  hasError: boolean;
  onChange: (value: string) => void;
}

const SelectField = ({ label, value, options, hasError, onChange }: SelectFieldProps) => (
  <div className="space-y-2 relative">
    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
      {label}
    </label>
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-6 py-4 bg-zinc-50 border rounded-2xl focus:outline-none font-bold text-sm appearance-none cursor-pointer group-hover:bg-zinc-100 transition-colors ${
          hasError
            ? "border-red-500 focus:border-red-500"
            : "border-black/5 focus:border-[#FACC15]"
        }`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[#FACC15]">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  </div>
);

interface TextFieldProps {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}

const TextField = ({
  label,
  value,
  type = "text",
  placeholder,
  error,
  onChange,
}: TextFieldProps) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-6 py-4 bg-zinc-50 border rounded-2xl focus:outline-none font-bold text-sm transition-colors ${
        error
          ? "border-red-500 focus:border-red-500"
          : "border-black/5 focus:border-[#FACC15]"
      }`}
    />
    {error && (
      <p className="text-xs text-red-600 font-bold ml-2">❌ {error}</p>
    )}
  </div>
);

export default EventFormModal;
