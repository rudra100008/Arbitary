"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSubmissionSSE() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let es = esRef.current;
    if (!es) {
      es = new EventSource("/api/user/tasks/subscribe");
      esRef.current = es;
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "status_change") {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            const taskTypes = new Set<string>();
            for (const change of data.changes ?? []) {
              if (change.taskType) taskTypes.add(change.taskType.toLowerCase());
            }
            if (taskTypes.size === 0) taskTypes.add("daily");
            for (const tt of taskTypes) {
              queryClient.invalidateQueries({ queryKey: ["user-tasks", tt], exact: true });
            }
            queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
            queryClient.invalidateQueries({ queryKey: ["user-points"] });
          }, 300);
        }
      } catch {
        // ignore parse errors (heartbeat comments, etc.)
      }
    };

    es.onerror = () => {
      // SSE will auto-reconnect; no action needed
    };

    return () => {
      es.close();
      esRef.current = null;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [queryClient]);

  return null;
}
