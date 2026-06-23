"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import EventTable from "../_components/event-table";
import EventFormModal from "../_components/event-form-modal";
import type {
  ContentSection,
  AccessType,
  TimelineItem,
} from "../_components/types";
import type { Event } from "@/src/types/db";

export default function AdminEvents() {
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [contentSections, setContentSections] = useState<ContentSection[]>([
    { id: Math.random().toString(), type: "content", content: "" },
  ]);
  const [accessTypes, setAccessTypes] = useState<AccessType[]>([
    { id: Math.random().toString(), title: "", price: "", pointCost: 0 },
  ]);
  const [timelines, setTimelines] = useState<TimelineItem[]>([
    { id: Math.random().toString(), time: "", description: "" },
  ]);
  const [heroImage, setHeroImage] = useState<{
    url: string;
    previewUrl?: string;
    file?: File;
  }>({ url: "" });
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("Tour");
  const [eventStatus, setEventStatus] = useState("Upcoming");
  const [eventPriority, setEventPriority] = useState("low");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [accentColor, setAccentColor] = useState("#FACC15");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Event[]>([]);

  const resetForm = () => {
    setFieldErrors({});
    setEditingEventId(null);
    setEventTitle("");
    setEventType("Tour");
    setEventStatus("Upcoming");
    setEventPriority("low");
    setEventDate("");
    setEventTime("");
    setAccentColor("#FACC15");
    setEventVenue("");
    setEventDescription("");
    setHeroImage({ url: "" });
    setYoutubeUrl("");
    setTimelines([{ id: Math.random().toString(), time: "", description: "" }]);
    setAccessTypes([
      { id: Math.random().toString(), title: "", price: "", pointCost: 0 },
    ]);
    setContentSections([
      { id: Math.random().toString(), type: "content", content: "" },
    ]);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/events?t=${Date.now()}`);
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  };

  const handleEditEvent = async (id: string) => {
    setLoadingEventId(id);
    try {
      const res = await fetch(`/api/events/${id}?t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        const ev = data.event;
        setEditingEventId(ev.id);
        setEventTitle(ev.title || "");
        setEventType(ev.eventType || "Tour");
        setEventStatus(ev.status || "Upcoming");
        setEventPriority(ev.priority || "low");
        let formattedDate = ev.eventDate || "";
        if (formattedDate && formattedDate.includes("T")) {
          formattedDate = formattedDate.split("T")[0];
        }
        setEventDate(formattedDate);
        setEventTime(ev.eventTime || "");
        setAccentColor(ev.accentColor || "#FACC15");
        setEventVenue(ev.venue || "");
        setEventDescription(ev.description || "");
        setYoutubeUrl(ev.youtubeUrl || "");
        setHeroImage({
          url: ev.heroImageUrl || "",
          previewUrl: ev.heroImageUrl || "",
        });
        if (ev.timelineItems && ev.timelineItems.length > 0)
          setTimelines(ev.timelineItems);
        if (ev.accessTypes && ev.accessTypes.length > 0)
          setAccessTypes(ev.accessTypes);
        if (ev.contentSections && ev.contentSections.length > 0)
          setContentSections(ev.contentSections);
        setIsCreatingEvent(true);
        toast.success("Event loaded successfully");
      } else {
        toast.error("Couldn't find that event. It may have been deleted.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Unable to load event details. Please try again.");
    } finally {
      setLoadingEventId(null);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    setLoadingEventId(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Event deleted successfully");
        fetchEvents();
      } else {
        toast.error(
          data.message ||
            "Something went wrong while deleting. Please try again.",
        );
      }
    } catch (e) {
      console.error(e);
      toast.error(
        "Unable to delete the event. Please check your connection and try again.",
      );
    } finally {
      setLoadingEventId(null);
    }
  };

  const handleFileUpload = (
    file: File,
    callback: (previewUrl: string, file: File) => void,
  ) => {
    if (file && file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      callback(previewUrl, file);
    }
  };

  const handleHeroImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file, (previewUrl, f) =>
        setHeroImage({ ...heroImage, previewUrl, file: f }),
      );
    }
  };

  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, (previewUrl, f) =>
        setHeroImage({ ...heroImage, previewUrl, file: f }),
      );
    }
  };

  // Upload image to Cloudinary via the existing /api/upload route.
  // Returns a real https://res.cloudinary.com/... URL — no base64 in DB.
  const uploadToCloudinary = async (
    file: File,
    folder: string = "event-heroes",
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", folder);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Image upload failed");
    }
    const data = await res.json();
    return data.url as string;
  };

  const triggerScrollToError = () => {
    setTimeout(() => {
      const el = document.querySelector(
        "input.border-red-500, select.border-red-500, textarea.border-red-500",
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const cleanseId = (id: string | number | undefined): number | undefined => {
    if (id === undefined) return undefined;
    if (typeof id === "number") return id > 0 ? id : undefined;
    const n = parseInt(id, 10);
    return isNaN(n) || n <= 0 ? undefined : n;
  };

  interface ApiResponse {
    success: boolean;
    message?: string;
    error?: string;
    details?: Record<string, string[]>;
  }

  const handleSaveEvent = async () => {
    setFieldErrors({});

    // — Client-side pre-validation —
    const localErrors: Record<string, string> = {};
    if (!eventTitle.trim()) localErrors.title = "Event title is required";
    if (!eventType.trim()) localErrors.eventType = "Event type is required";
    if (!eventDate.trim()) localErrors.date = "Event date is required";
    if (accessTypes.filter((a) => a.title.trim().length > 0).length === 0) {
      localErrors.accessTypes =
        "At least one access type with a title is required";
    }
    // A timeline entry with only one of time/description filled in would
    // otherwise be silently dropped before it reaches the server (it fails
    // the backend's "both required" rule either way) — catch it here so
    // the admin gets a clear, actionable message instead of a confusing
    // "Description not filled" error pointing at the wrong field.
    timelines.forEach((t) => {
      const hasTime = !!t.time?.trim();
      const hasDescription = !!t.description?.trim();
      if (hasTime && !hasDescription) {
        localErrors[`timelineItems.${t.id}.description`] =
          "Add a description, or clear the time, for this timeline entry";
      } else if (hasDescription && !hasTime) {
        localErrors[`timelineItems.${t.id}.time`] =
          "Add a time, or clear the description, for this timeline entry";
      }
    });
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      toast.error(
        Object.keys(localErrors).some((k) => k.startsWith("timelineItems."))
          ? "Timeline entries need both a time and a description — fill in the missing field or remove the entry."
          : "Please fill in all required fields.",
      );
      triggerScrollToError();
      return;
    }

    setIsSaving(true);
    try {
      let finalHeroUrl = heroImage.url;
      if (heroImage.file) {
        try {
          finalHeroUrl = await uploadToCloudinary(heroImage.file, "event-heroes");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Hero image upload failed");
          return;
        }
      }

      // — Snapshot and filter — use filtered arrays for both payload and index mapping —
      const unfilteredSections = [...contentSections];
      const filteredAccessTypes = accessTypes
        .filter((a) => a.title.trim().length > 0)
        .map((a) => ({
          id: cleanseId(a.id),
          title: a.title,
          price: a.price,
          pointCost: a.pointCost ?? 0,
        }));
      const filteredTimelines = timelines
        .filter((t) => t.time?.trim() && t.description?.trim())
        .map((t) => ({
          id: cleanseId(t.id),
          time: t.time,
          description: t.description,
        }));

      // — Process content sections (cleanse IDs, strip UI fields) —
      const processedSections = await Promise.all(
        unfilteredSections.map(async (section) => {
          const id = cleanseId(section.id);
          if (section.type === "media" && section.mediaItems) {
            const processedMediaItems = await Promise.all(
              section.mediaItems.map(async (item) => {
                let finalUrl = item.url;
                if (item.file) {
                  try {
                    finalUrl = await uploadToCloudinary(item.file, "event-heroes");
                  } catch {
                    // Keep existing URL if upload fails for this item
                    finalUrl = item.url;
                  }
                }
                return { id: cleanseId(item.id), url: finalUrl };
              }),
            );
            return {
              id,
              type: section.type,
              content: section.content,
              mediaItems: processedMediaItems,
            };
          }
          return { id, type: section.type, content: section.content };
        }),
      );

      const payload: Record<string, unknown> = {
        title: eventTitle,
        eventType,
        status: eventStatus,
        priority: eventPriority,
        date: eventDate,
        eventTime: eventTime.trim() || null,
        accentColor: accentColor.trim() || "#FACC15",
        venue: eventVenue,
        description: eventDescription,
        heroImageUrl: finalHeroUrl,
        youtubeUrl: youtubeUrl.trim() || null,
        contentSections: processedSections,
        accessTypes: filteredAccessTypes,
        timelineItems: filteredTimelines,
      };
      if (editingEventId) payload.id = editingEventId;

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // — Handle non-400 server errors —
      if (!response.ok && response.status !== 400) {
        const statusMessages: Record<number, string> = {
          401: "Your session has expired. Please log in and try again.",
          403: "You don't have permission to save events. Contact an administrator.",
          500: "Something went wrong on our end. Please try again in a few minutes.",
          503: "The service is temporarily unavailable. Please try again later.",
        };
        toast.error(
          statusMessages[response.status] ||
            `Unexpected error (${response.status}). Please try again.`,
        );
        return;
      }

      let data: ApiResponse;
      try {
        data = await response.json();
      } catch {
        toast.error("Invalid response format received from the server.");
        return;
      }

      if (data.success) {
        toast.success(
          editingEventId
            ? "Event updated successfully!"
            : "Event created successfully!",
        );
        setIsCreatingEvent(false);
        resetForm();
        fetchEvents();
      } else {
        if (data.details && typeof data.details === "object") {
          const errors: Record<string, string> = {};
          (Object.entries(data.details) as [string, string[]][]).forEach(
            ([field, messages]) => {
              if (!Array.isArray(messages) || messages.length === 0) return;
              const errorMessage = messages[0];
              // Match index-based paths like accessTypes.0.title or contentSections.0.mediaItems.0.url
              const match = field.match(
                /^(accessTypes|contentSections|timelineItems)\.(\d+)\.(.+)$/,
              );
              if (match) {
                const [, arrayName, indexStr, subField] = match;
                const index = parseInt(indexStr, 10);
                let itemId: string | number | undefined;
                if (arrayName === "accessTypes")
                  itemId = filteredAccessTypes[index]?.id;
                if (arrayName === "contentSections")
                  itemId = unfilteredSections[index]?.id;
                if (arrayName === "timelineItems")
                  itemId = filteredTimelines[index]?.id;
                if (itemId !== undefined) {
                  // Check for nested media items
                  const nestedMediaMatch = subField.match(
                    /^mediaItems\.(\d+)\.(.+)$/,
                  );
                  if (nestedMediaMatch && arrayName === "contentSections") {
                    const mediaIndex = parseInt(nestedMediaMatch[1], 10);
                    const mediaField = nestedMediaMatch[2];
                    const section = unfilteredSections[index];
                    const mediaItem = section?.mediaItems?.[mediaIndex];
                    if (mediaItem) {
                      errors[
                        `${arrayName}.${itemId}.mediaItems.${mediaItem.id}.${mediaField}`
                      ] = errorMessage;
                    } else {
                      errors[field] = errorMessage;
                    }
                  } else {
                    errors[`${arrayName}.${itemId}.${subField}`] = errorMessage;
                  }
                } else {
                  errors[field] = errorMessage;
                }
              } else {
                errors[field] = errorMessage;
              }
            },
          );
          setFieldErrors(errors);
          toast.error(
            "Please correct the highlighted validation errors in the form.",
          );
          triggerScrollToError();
        } else {
          toast.error(
            data.message ||
              data.error ||
              "Something went wrong while saving. Please try again.",
          );
        }
      }
    } catch {
      toast.error(
        "Unable to reach the server. Please check your internet connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <EventTable
        events={events}
        loadingEventId={loadingEventId}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        onCreate={() => {
          resetForm();
          setIsCreatingEvent(true);
        }}
      />

      <EventFormModal
        isOpen={isCreatingEvent}
        isSaving={isSaving}
        editingEventId={editingEventId}
        fieldErrors={fieldErrors}
        onClose={() => {
          setIsCreatingEvent(false);
          resetForm();
        }}
        onSave={handleSaveEvent}
        setFieldErrors={setFieldErrors}
        eventTitle={eventTitle}
        setEventTitle={setEventTitle}
        eventType={eventType}
        setEventType={setEventType}
        eventStatus={eventStatus}
        setEventStatus={setEventStatus}
        eventPriority={eventPriority}
        setEventPriority={setEventPriority}
        eventDate={eventDate}
        setEventDate={setEventDate}
        eventTime={eventTime}
        setEventTime={setEventTime}
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        eventVenue={eventVenue}
        setEventVenue={setEventVenue}
        eventDescription={eventDescription}
        setEventDescription={setEventDescription}
        heroImage={heroImage}
        setHeroImage={setHeroImage}
        youtubeUrl={youtubeUrl}
        setYoutubeUrl={setYoutubeUrl}
        contentSections={contentSections}
        setContentSections={setContentSections}
        accessTypes={accessTypes}
        setAccessTypes={setAccessTypes}
        timelines={timelines}
        setTimelines={setTimelines}
        handleHeroImageDrop={handleHeroImageDrop}
        handleHeroImageChange={handleHeroImageChange}
      />
    </>
  );
}
