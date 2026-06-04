"use client";

import type { Event } from "@/src/types/db";

interface EventTableProps {
  events: Event[];
  loadingEventId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onCreate: () => void;
}

const EventTable = ({
  events,
  loadingEventId,
  onEdit,
  onDelete,
  onCreate,
}: EventTableProps) => (
  <div className="animate-fade-in space-y-8">
    <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] border border-black/5 shadow-sm">
      <div>
        <h3 className="text-2xl font-black uppercase tracking-tighter">
          📅 Events Database
        </h3>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
          Manage {events.length} experience{events.length !== 1 ? "s" : ""} total
        </p>
      </div>
      <button
        onClick={onCreate}
        className="px-8 py-4 bg-[#FACC15] text-black font-black uppercase tracking-widest rounded-2xl hover:bg-black hover:text-white transition-all shadow-lg shadow-[#FACC15]/20 text-xs"
      >
        + Add New Event
      </button>
    </div>

    {events.length === 0 ? (
      <div className="bg-white rounded-[2.5rem] border border-black/5 p-16 text-center">
        <p className="text-xl font-bold text-zinc-400 uppercase tracking-wide">
          No events created yet
        </p>
        <p className="text-sm text-zinc-300 mt-2">
          Click &quot;Add New Event&quot; to create your first experience
        </p>
      </div>
    ) : (
      <div className="bg-white rounded-[2.5rem] border border-black/5 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-black/5">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Event Title
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Date
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Category
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Venue
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Status
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {events.map((event: Event) => (
              <tr
                key={event.id}
                className="hover:bg-zinc-50/50 transition-colors group"
              >
                <td className="px-8 py-6">
                  <p className="font-bold text-sm uppercase tracking-tight">
                    {event.title}
                  </p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    {event.eventDate
                      ? new Date(event.eventDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "No Date"}
                  </p>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[9px] font-black uppercase tracking-widest border border-black/5 px-3 py-1 rounded-full bg-zinc-50">
                    {event.eventType}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    {event.venue || "—"}
                  </p>
                </td>
                <td className="px-8 py-6">
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      event.status === "Success"
                        ? "bg-green-50 text-green-600"
                        : "bg-[#FACC15]/10 text-black"
                    }`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => onEdit(String(event.id))}
                      disabled={loadingEventId === String(event.id)}
                      className={`px-4 py-2 rounded-lg transition-all text-xs font-black whitespace-nowrap ${
                        loadingEventId === String(event.id)
                          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                      }`}
                    >
                      {loadingEventId === String(event.id)
                        ? "..."
                        : "✏️ Edit"}
                    </button>
                    <button
                      onClick={() =>
                        onDelete(String(event.id), event.title)
                      }
                      disabled={loadingEventId === String(event.id)}
                      className={`px-4 py-2 rounded-lg transition-all text-xs font-black whitespace-nowrap ${
                        loadingEventId === String(event.id)
                          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                      }`}
                    >
                      {loadingEventId === String(event.id)
                        ? "..."
                        : "🗑️ Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default EventTable;
