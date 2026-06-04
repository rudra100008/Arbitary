export interface MediaItem {
  id: string;
  url: string;
  previewUrl?: string;
  file?: File;
}

export interface ContentSection {
  id: string;
  type: "content" | "media";
  content?: string;
  mediaItems?: MediaItem[];
}

export interface AccessType {
  id: string;
  title: string;
  price: string;
}

export interface TimelineItem {
  id: string;
  time: string;
  description: string;
}
