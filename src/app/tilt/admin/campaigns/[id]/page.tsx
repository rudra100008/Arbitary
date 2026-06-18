"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Entry = {
  id: string;
  fullName: string;
  email: string;
  phonePlain: string;
  address: string;
  flagged: boolean;
  flagReason: string | null;
  outletName: string | null;
  createdAt: string;
};

export default function CampaignEntriesPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaignName, setCampaignName] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Campaign Entries | Tilt Your Music";

    const load = async () => {
      try {
        const [campaignRes, entriesRes] = await Promise.all([
          fetch("/api/tilt/admin/campaigns"),
          fetch(`/api/tilt/admin/campaigns/${campaignId}/entries`),
        ]);

        if (campaignRes.ok) {
          const data = await campaignRes.json();
          const campaign = (data.campaigns ?? []).find(
            (c: { id: string; name: string }) => c.id === campaignId,
          );
          if (campaign) setCampaignName(campaign.name);
        }

        if (entriesRes.ok) {
          const data = await entriesRes.json();
          setEntries(data.entries ?? []);
        } else {
          setError("Failed to load entries.");
        }
      } catch {
        setError("Network error.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [campaignId]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div>
      {/* Back link */}
      <Link
        href="/tilt/admin/campaigns"
        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-6 transition-colors"
        style={{ color: "rgba(200,230,60,0.5)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#c8e63c")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "rgba(200,230,60,0.5)")
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to campaigns
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">
          {campaignName || "Campaign Entries"}
        </h1>
        <p
          className="text-sm font-medium mt-1"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {isLoading ? "Loading…" : `${entries.length} entries`}
        </p>
      </div>

      {error ? (
        <div
          className="text-sm px-4 py-3 rounded-xl mb-4"
          style={{
            color: "#fca5a5",
            border: "1px solid rgba(239,68,68,0.35)",
            background: "rgba(239,68,68,0.08)",
          }}
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "2px solid rgba(200,230,60,0.15)",
              borderTop: "2px solid #c8e63c",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <p
            className="text-lg font-bold"
            style={{ color: "rgba(255,255,255,0.15)" }}
          >
            No entries yet
          </p>
          <p
            className="text-sm mt-2"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            No one has submitted an entry for this campaign yet.
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-2xl border"
          style={{ borderColor: "rgba(200,230,60,0.08)" }}
        >
          <table className="w-full text-left" style={{ minWidth: "800px" }}>
            <thead>
              <tr style={{ background: "rgba(200,230,60,0.03)" }}>
                <Th>#</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Outlet</Th>
                <Th>Flagged</Th>
                <Th>Submitted</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr
                  key={entry.id}
                  style={{
                    borderTop: "1px solid rgba(200,230,60,0.05)",
                    background: entry.flagged
                      ? "rgba(212,43,43,0.04)"
                      : undefined,
                  }}
                >
                  <Td>
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>
                      {idx + 1}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-semibold text-white">
                      {entry.fullName}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: "rgba(200,230,60,0.7)" }}>
                      {entry.email}
                    </span>
                  </Td>
                  <Td>{entry.phonePlain}</Td>
                  <Td>{entry.outletName ?? "—"}</Td>
                  <Td>
                    {entry.flagged ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: "#fca5a5" }}
                      >
                        <span
                          style={{
                            width: "5px",
                            height: "5px",
                            borderRadius: "50%",
                            background: "#fca5a5",
                            display: "inline-block",
                          }}
                        />
                        {entry.flagReason ?? "Flagged"}
                      </span>
                    ) : (
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                      >
                        Clean
                      </span>
                    )}
                  </Td>
                  <Td>{formatDate(entry.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em]"
      style={{ color: "rgba(200,230,60,0.4)" }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      className="px-5 py-4 text-sm font-medium"
      style={{ color: "rgba(255,255,255,0.6)" }}
    >
      {children}
    </td>
  );
}
