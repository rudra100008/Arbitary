"use client";

import { useState } from "react";

export type ImageAnalysis = {
  phash: string | null;
  exifFlags: Record<string, unknown> | null;
  isDuplicateImage: boolean;
  duplicateImageUserTaskId: number | null;
};

export function useScreenshotUpload(
  onUploadComplete: (url: string, imageAnalysis: ImageAnalysis | null) => void
) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Upload failed");
      }
      const data = await res.json();
      onUploadComplete(data.url, data.imageAnalysis ?? null);
      setSelectedFile(null);
      setPreviewUrl("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload screenshot");
    } finally {
      setIsUploading(false);
    }
  };

  return { selectedFile, previewUrl, isUploading, handleFileSelect, handleSubmit };
}