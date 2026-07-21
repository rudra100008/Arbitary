"use client";

import { useEffect, useState } from "react";
import RecordsCatalog from "./RecordsCatalog";
import { mapRecordToSong } from "./vinylSvg";
import type { Song } from "./vinylSvg";

export default function RecordsPage() {
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    document.title = "Records | Arbitrary";
    fetch("/api/records")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSongs(d.records.map(mapRecordToSong));
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <RecordsCatalog songs={songs} />
    </div>
  );
}
