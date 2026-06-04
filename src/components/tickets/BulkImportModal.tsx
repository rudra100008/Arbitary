"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import Papa from "papaparse";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Prevent the browser from opening dropped files globally while the modal is open
  useEffect(() => {
    if (!isOpen) return;

    const preventDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("dragover", preventDrop);
    window.addEventListener("drop", preventDrop);

    return () => {
      window.removeEventListener("dragover", preventDrop);
      window.removeEventListener("drop", preventDrop);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "json") {
      toast.error("Only .csv and .json files are supported");
      return;
    }

    setFile(f);

    if (ext === "csv") {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        preview: 5,
        complete: (results) => {
          setPreview(results.data as Record<string, string>[]);
        },
      });
    } else if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const arr = Array.isArray(data) ? data : data.tasks || [];
          setPreview(arr.slice(0, 5));
        } catch {
          toast.error("Invalid JSON file");
        }
      };
      reader.readAsText(f);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let tasks: Record<string, unknown>[] = [];

      if (ext === "csv") {
        const text = await file.text();
        const { data } = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
        tasks = data as Record<string, unknown>[];
      } else if (ext === "json") {
        const text = await file.text();
        const data = JSON.parse(text);
        tasks = Array.isArray(data) ? data : data.tasks || [];
      }

      if (tasks.length === 0) {
        toast.error("No tasks found in file");
        setUploading(false);
        return;
      }

      if (tasks.length > 200) {
        toast.error("Maximum 200 tasks per batch");
        setUploading(false);
        return;
      }

      const res = await fetch("/api/admin/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Upload failed");
        setUploading(false);
        return;
      }

      toast.success(`${result.count} tasks created successfully!`);
      setFile(null);
      setPreview([]);
      onClose();
    } catch (error) {
      console.error("Bulk import error:", error);
      toast.error("Failed to import tasks");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl border border-black/5 w-full max-w-lg mx-4 p-6 modal-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-900">Import Tasks</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-[#FACC15] bg-yellow-50/50"
              : "border-zinc-200 hover:border-[#FACC15]"
          }`}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {file ? (
            <div>
              <p className="font-semibold text-slate-900">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1">
                {isDragging ? "Drop your file here" : "Upload CSV or JSON"}
              </p>
              <p className="text-xs text-gray-500">Drag & drop a file or click to browse</p>
            </div>
          )}
        </div>

        {preview.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Preview ({preview.length} rows)
            </p>
            <div className="bg-zinc-50 rounded-xl p-3 overflow-x-auto max-h-48">
              <pre className="text-xs text-zinc-600">{JSON.stringify(preview, null, 2)}</pre>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 font-bold text-sm rounded-2xl hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 py-2.5 bg-[#FACC15] text-black font-black text-sm rounded-2xl hover:bg-black hover:text-[#FACC15] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : `Import ${preview.length > 0 ? `(${file ? 'up to ' : ''}` : ""}Tasks`}
          </button>
        </div>
      </div>
    </div>
  );
}
