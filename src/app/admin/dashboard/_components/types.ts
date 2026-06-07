export interface MediaItem {
  id: string | number;
  url: string;
  previewUrl?: string;
  file?: File;
}

export interface ContentSection {
  id: string | number;
  type: "content" | "media";
  content?: string;
  mediaItems?: MediaItem[];
}

export interface AccessType {
  id: string | number;
  title: string;
  price: string;
  pointCost: number;
}

export interface TimelineItem {
  id: string | number;
  time: string;
  description: string;
}
