"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import UserSubmissions from "@/src/components/layout/user-submissions";
import ProfileDropdown from "@/src/components/ui/profile-dropdown";
import ManageTasks from "@/src/components/layout/manage-task/manage-task";
import AdminSidebar from "./_components/admin-sidebar";
import OverviewTab from "./_components/overview-tab";
import EventTable from "./_components/event-table";
import EventFormModal from "./_components/event-form-modal";
import type { ContentSection, AccessType, TimelineItem } from "./_components/types";
import type { Event } from "@/src/types/db";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("Overview");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const [contentSections, setContentSections] = useState<ContentSection[]>([
    { id: Math.random().toString(), type: "content", content: "" },
  ]);
  const [accessTypes, setAccessTypes] = useState<AccessType[]>([
    { id: Math.random().toString(), title: "", price: "" },
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
  const [eventDate, setEventDate] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFieldErrors({});
    setEditingEventId(null);
    setEventTitle("");
    setEventType("Tour");
    setEventStatus("Upcoming");
    setEventDate("");
    setEventVenue("");
    setEventDescription("");
    setHeroImage({ url: "" });
    setTimelines([{ id: Math.random().toString(), time: "", description: "" }]);
    setAccessTypes([{ id: Math.random().toString(), title: "", price: "" }]);
    setContentSections([
      { id: Math.random().toString(), type: "content", content: "" },
    ]);
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
        let formattedDate = ev.eventDate || "";
        if (formattedDate && formattedDate.includes("T")) {
          formattedDate = formattedDate.split("T")[0];
        }
        setEventDate(formattedDate);
        setEventVenue(ev.venue || "");
        setEventDescription(ev.description || "");
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
        toast.error("Event not found");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch event details");
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
        toast.error(data.message || "Failed to delete event");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete event");
    } finally {
      setLoadingEventId(null);
    }
  };

  const stats = [
    { label: "Total Events", value: "12", growth: "+2 this month" },
    { label: "Project Views", value: "1.2k", growth: "+15% from last week" },
    { label: "Contact Leads", value: "48", growth: "8 pending" },
  ];

  const menuItems = [
    { label: "Overview" },
    { label: "Manage Events" },
    { label: "Manage Tasks" },
    { label: "User Submissions" },
    { label: "Our Work" },
    { label: "Team Members" },
    { label: "Settings" },
  ];

  const [events, setEvents] = useState<Event[]>([]);

  React.useEffect(() => {
    if (activeTab === "Manage Events") {
      fetchEvents();
    }
  }, [activeTab]);

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

  const compressImage = (
    file: File,
    maxWidth = 1200,
    quality = 0.7,
  ): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
      };
    });
  };

  const handleSaveEvent = async () => {
    if (!eventTitle) {
      setFieldErrors({ title: "Please enter a Main Title" });
      toast.error("Please enter a Main Title");
      return;
    }
    setFieldErrors({});
    setIsSaving(true);
    try {
      let finalHeroUrl = heroImage.url;
      if (heroImage.file) finalHeroUrl = await compressImage(heroImage.file);

      const processedSections = await Promise.all(
        contentSections.map(async (section) => {
          if (section.type === "media" && section.mediaItems) {
            const processedMediaItems = await Promise.all(
              section.mediaItems.map(async (item) => {
                let finalUrl = item.url;
                if (item.file) finalUrl = await compressImage(item.file);
                return { url: finalUrl };
              }),
            );
            return { ...section, mediaItems: processedMediaItems };
          }
          return section;
        }),
      );

      const filteredAccessTypes = accessTypes.filter((a) => a.title || a.price);
      const filteredTimelines = timelines.filter(
        (t) => t.time || t.description,
      );

      const payload: Record<string, unknown> = {
        title: eventTitle,
        eventType,
        status: eventStatus,
        date: eventDate,
        venue: eventVenue,
        description: eventDescription,
        heroImageUrl: finalHeroUrl,
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

      const data = await response.json();
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
          Object.entries(data.details).forEach(
            ([field, messages]: [string, any]) => {
              if (Array.isArray(messages) && messages.length > 0) {
                errors[field] = messages[0];
              }
            },
          );
          setFieldErrors(errors);
          const errorFields = Object.keys(errors);
          toast.error(`Validation errors in: ${errorFields.join(", ")}`);
        } else {
          toast.error(
            "Failed to save event: " +
              (data.message || data.error || "Unknown error"),
          );
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    document.title = `${activeTab} | Arbitary Admin`;
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans selection:bg-[#FACC15] selection:text-black">
      <AdminSidebar
        menuItems={menuItems}
        activeTab={activeTab}
        isCreatingEvent={isCreatingEvent}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsCreatingEvent(false);
        }}
      />

      <main className="flex-1 ml-72 p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FACC15]/5 rounded-full blur-[120px] -z-10" />

        <header className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">
              {activeTab}
            </h1>
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
              Arbitary Agency / Control Panel
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center shadow-sm hover:shadow-md transition-all">
              🔔
            </button>
            <div className="flex items-center justify-center">
              <ProfileDropdown redirectUrl="/admin/login" />
            </div>
          </div>
        </header>

        {activeTab === "Overview" && (
          <OverviewTab
            stats={stats}
            events={events}
            onViewAllEvents={() => setActiveTab("Manage Events")}
          />
        )}
        {activeTab === "Manage Events" && (
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
        )}
        {activeTab === "Manage Tasks" && (
          <div>
            <ManageTasks />
          </div>
        )}
        {activeTab === "User Submissions" && (
          <div>
            <UserSubmissions />
          </div>
        )}
        {activeTab !== "Overview" &&
          activeTab !== "Manage Events" &&
          activeTab !== "Manage Tasks" &&
          activeTab !== "User Submissions" && (
            <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[3rem] border border-black/5 border-dashed shadow-sm">
              <p className="text-zinc-300 font-black uppercase tracking-[0.3em]">
                {activeTab} coming soon
              </p>
            </div>
          )}

        {isCreatingEvent && (
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
            eventDate={eventDate}
            setEventDate={setEventDate}
            eventVenue={eventVenue}
            setEventVenue={setEventVenue}
            eventDescription={eventDescription}
            setEventDescription={setEventDescription}
            heroImage={heroImage}
            setHeroImage={setHeroImage}
            contentSections={contentSections}
            setContentSections={setContentSections}
            accessTypes={accessTypes}
            setAccessTypes={setAccessTypes}
            timelines={timelines}
            setTimelines={setTimelines}
            handleHeroImageDrop={handleHeroImageDrop}
            handleHeroImageChange={handleHeroImageChange}
          />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
