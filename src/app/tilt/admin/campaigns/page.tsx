"use client";

import { useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  outletId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

function toLocalInputValue(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getCampaignStatus(campaign: Campaign) {
  const now = new Date();
  const starts = new Date(campaign.startsAt);
  const ends = new Date(campaign.endsAt);

  if (starts <= now && now <= ends) {
    return "Active";
  }

  if (now < starts) {
    return "Upcoming";
  }

  return "Ended";
}

export default function TiltAdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [createName, setCreateName] = useState("");
  const [createStartsAt, setCreateStartsAt] = useState("");
  const [createEndsAt, setCreateEndsAt] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [rowError, setRowError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadCampaigns = async () => {
    setIsLoading(true);
    setListError("");

    try {
      const res = await fetch("/api/tilt/admin/campaigns");
      const json = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        setListError(
          typeof json.error === "string"
            ? json.error
            : "Failed to load campaigns.",
        );
        return;
      }

      setCampaigns(
        Array.isArray(json.campaigns) ? (json.campaigns as Campaign[]) : [],
      );
    } catch {
      setListError("Network error while loading campaigns.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Campaigns | Tilt Admin";

    fetch("/api/tilt/admin/campaigns")
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;

        if (!res.ok) {
          setListError(
            typeof json.error === "string"
              ? json.error
              : "Failed to load campaigns.",
          );
          return;
        }

        setCampaigns(
          Array.isArray(json.campaigns) ? (json.campaigns as Campaign[]) : [],
        );
      })
      .catch(() => {
        setListError("Network error while loading campaigns.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const activeCount = useMemo(
    () =>
      campaigns.filter((campaign) => getCampaignStatus(campaign) === "Active")
        .length,
    [campaigns],
  );

  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError("");

    const starts = new Date(createStartsAt);
    const ends = new Date(createEndsAt);

    if (!createName.trim()) {
      setCreateError("Campaign name is required.");
      return;
    }

    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      setCreateError("Start and end date/time are required.");
      return;
    }

    if (starts >= ends) {
      setCreateError("Start must be before end.");
      return;
    }

    setIsCreating(true);

    try {
      const res = await fetch("/api/tilt/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          starts_at: createStartsAt,
          ends_at: createEndsAt,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        setCreateError(
          typeof json.error === "string"
            ? json.error
            : "Failed to create campaign.",
        );
        return;
      }

      setCreateName("");
      setCreateStartsAt("");
      setCreateEndsAt("");
      await loadCampaigns();
    } catch {
      setCreateError("Network error while creating campaign.");
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setEditName(campaign.name);
    setEditEndsAt(toLocalInputValue(campaign.endsAt));
    setRowError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditEndsAt("");
    setRowError("");
  };

  const handleSave = async (campaign: Campaign) => {
    setRowError("");

    const starts = new Date(campaign.startsAt);
    const ends = new Date(editEndsAt);

    if (!editName.trim()) {
      setRowError("Campaign name cannot be empty.");
      return;
    }

    if (Number.isNaN(ends.getTime())) {
      setRowError("Valid end date/time is required.");
      return;
    }

    if (starts >= ends) {
      setRowError("End date must be after campaign start.");
      return;
    }

    setPendingId(campaign.id);

    try {
      const res = await fetch(`/api/tilt/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          ends_at: editEndsAt,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        setRowError(
          typeof json.error === "string"
            ? json.error
            : "Failed to update campaign.",
        );
        return;
      }

      cancelEditing();
      await loadCampaigns();
    } catch {
      setRowError("Network error while updating campaign.");
    } finally {
      setPendingId(null);
    }
  };

  const handleEndNow = async (campaign: Campaign) => {
    setRowError("");
    setPendingId(campaign.id);

    try {
      const res = await fetch(
        `/api/tilt/admin/campaigns/${campaign.id}/end-now`,
        {
          method: "POST",
        },
      );

      const json = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        setRowError(
          typeof json.error === "string"
            ? json.error
            : "Failed to end campaign now.",
        );
        return;
      }

      await loadCampaigns();
    } catch {
      setRowError("Network error while ending campaign.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">
          Campaigns
        </h1>
        <p
          className="text-sm font-medium mt-1"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {isLoading
            ? "Loading…"
            : `${campaigns.length} total • ${activeCount} active`}
        </p>
      </div>

      <div
        className="rounded-2xl border p-6 mb-8"
        style={{
          borderColor: "rgba(200,230,60,0.1)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white mb-4">
          Create campaign
        </h2>

        <form
          onSubmit={handleCreateCampaign}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
        >
          <Field label="Name">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="tilt-input"
              placeholder="Tilt Lottery June"
              required
            />
          </Field>

          <Field label="Start date/time">
            <input
              type="datetime-local"
              value={createStartsAt}
              onChange={(e) => setCreateStartsAt(e.target.value)}
              className="tilt-input"
              required
            />
          </Field>

          <Field label="End date/time">
            <input
              type="datetime-local"
              value={createEndsAt}
              onChange={(e) => setCreateEndsAt(e.target.value)}
              className="tilt-input"
              required
            />
          </Field>

          <div className="md:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#c8e63c", color: "#0e1f10" }}
            >
              {isCreating ? "Creating…" : "Create Campaign"}
            </button>

            {createError ? (
              <p className="text-xs" style={{ color: "#fca5a5" }}>
                {createError}
              </p>
            ) : null}
          </div>
        </form>
      </div>

      {listError ? (
        <div className="mb-4 text-sm" style={{ color: "#fca5a5" }}>
          {listError}
        </div>
      ) : null}

      <div
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: "rgba(200,230,60,0.08)" }}
      >
        <table className="w-full text-left">
          <thead>
            <tr style={{ background: "rgba(200,230,60,0.03)" }}>
              <Th>Name</Th>
              <Th>Starts</Th>
              <Th>Ends</Th>
              <Th>Created</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              const isEditing = editingId === campaign.id;
              const status = getCampaignStatus(campaign);
              const isBusy = pendingId === campaign.id;

              return (
                <tr
                  key={campaign.id}
                  style={{ borderTop: "1px solid rgba(200,230,60,0.05)" }}
                >
                  <Td>
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="tilt-input"
                      />
                    ) : (
                      <span className="font-semibold text-white">
                        {campaign.name}
                      </span>
                    )}
                  </Td>
                  <Td>{formatDateTime(campaign.startsAt)}</Td>
                  <Td>
                    {isEditing ? (
                      <input
                        type="datetime-local"
                        value={editEndsAt}
                        onChange={(e) => setEditEndsAt(e.target.value)}
                        className="tilt-input"
                      />
                    ) : (
                      formatDateTime(campaign.endsAt)
                    )}
                  </Td>
                  <Td>{formatDateTime(campaign.createdAt)}</Td>
                  <Td>
                    <StatusBadge status={status} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleSave(campaign)}
                            disabled={isBusy}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
                            style={{ background: "#c8e63c", color: "#0e1f10" }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                            style={{
                              background: "rgba(255,255,255,0.08)",
                              color: "#fff",
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(campaign)}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                          style={{
                            background: "rgba(255,255,255,0.08)",
                            color: "#fff",
                          }}
                        >
                          Edit
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void handleEndNow(campaign)}
                        disabled={isBusy}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
                        style={{
                          background: "rgba(212,43,43,0.16)",
                          border: "1px solid rgba(212,43,43,0.35)",
                          color: "#fca5a5",
                        }}
                      >
                        End now
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}

            {!isLoading && campaigns.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-sm"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  No campaigns yet. Create your first campaign above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {rowError ? (
        <p className="text-xs mt-3" style={{ color: "#fca5a5" }}>
          {rowError}
        </p>
      ) : null}

      <style>{`
        .tilt-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(200,230,60,0.15);
          border-radius: 10px;
          color: #fff;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .tilt-input:focus {
          border-color: rgba(200,230,60,0.5);
          background: rgba(200,230,60,0.06);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block mb-2 text-[10px] font-black uppercase tracking-[0.18em]"
        style={{ color: "rgba(200,230,60,0.55)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styleByStatus: Record<string, React.CSSProperties> = {
    Active: {
      background: "rgba(34,197,94,0.14)",
      border: "1px solid rgba(34,197,94,0.35)",
      color: "#86efac",
    },
    Upcoming: {
      background: "rgba(245,158,11,0.14)",
      border: "1px solid rgba(245,158,11,0.35)",
      color: "#fcd34d",
    },
    Ended: {
      background: "rgba(148,163,184,0.14)",
      border: "1px solid rgba(148,163,184,0.35)",
      color: "#cbd5e1",
    },
  };

  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider"
      style={styleByStatus[status] ?? styleByStatus.Ended}
    >
      {status}
    </span>
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
      style={{ color: "rgba(255,255,255,0.7)" }}
    >
      {children}
    </td>
  );
}
