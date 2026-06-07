"use client";

import { ChevronDown } from "lucide-react";
import type { ContentSection } from "./types";

interface ContentSectionEditorProps {
  sections: ContentSection[];
  fieldErrors: Record<string, string>;
  onAdd: () => void;
  onRemove: (id: string | number) => void;
  onUpdateType: (id: string | number, type: "content" | "media") => void;
  onAddMedia: (sectionId: string | number) => void;
  onRemoveMedia: (sectionId: string | number, itemId: string | number) => void;
  onUpdateMediaFile: (sectionId: string | number, itemId: string | number, file: File) => void;
  onUpdateMediaUrl: (sectionId: string | number, itemId: string | number, url: string) => void;
  onUpdateContent: (id: string | number, content: string) => void;
  onClearError: (field: string) => void;
}

const ContentSectionEditor = ({
  sections,
  fieldErrors,
  onAdd,
  onRemove,
  onUpdateType,
  onAddMedia,
  onRemoveMedia,
  onUpdateMediaFile,
  onUpdateMediaUrl,
  onUpdateContent,
  onClearError,
}: ContentSectionEditorProps) => (
  <div className="space-y-8">
    <div className="flex justify-between items-center px-4">
      <h4 className="text-sm font-black uppercase tracking-widest">
        Content & Media Layout
      </h4>
      <button
        onClick={onAdd}
        className="text-[10px] font-black text-[#FACC15] bg-black px-6 py-3 rounded-full hover:scale-105 transition-all shadow-xl shadow-black/20"
      >
        + Add New Section
      </button>
    </div>

    {sections.map((section) => (
      <div
        key={section.id}
        className="bg-white p-10 rounded-[2.5rem] border border-black/5 space-y-8 relative group shadow-sm hover:shadow-md transition-shadow"
      >
        <button
          onClick={() => onRemove(section.id)}
          className="absolute top-6 right-6 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-black bg-zinc-50/80 backdrop-blur-sm w-10 h-10 rounded-xl flex items-center justify-center z-20 border border-black/5"
          title="Remove Section"
        >
          ✕
        </button>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-48 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
              Section Type
            </label>
            <div className="relative">
              <select
                value={section.type}
                onChange={(e) => {
                  onUpdateType(
                    section.id,
                    e.target.value as "content" | "media",
                  );
                  const key = `contentSections.${section.id}.type`;
                  if (fieldErrors[key]) onClearError(key);
                }}
                className={`w-full px-4 py-4 bg-zinc-50 border rounded-2xl focus:outline-none font-bold text-xs appearance-none cursor-pointer ${
                  fieldErrors[`contentSections.${section.id}.type`]
                    ? "border-red-500 focus:border-red-500"
                    : "border-black/5 focus:border-[#FACC15]"
                }`}
              >
                <option value="content">Content Block</option>
                <option value="media">Media Collection</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-300">
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>

          <div className="flex-1">
            {section.type === "content" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                  Description Content
                </label>
                <textarea
                  value={section.content || ""}
                  onChange={(e) =>
                    onUpdateContent(section.id, e.target.value)
                  }
                  placeholder="Write content details here..."
                  className="w-full px-8 py-6 bg-zinc-50 border border-black/5 rounded-[2rem] focus:outline-none focus:border-[#FACC15] font-medium text-sm min-h-[160px]"
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {section.mediaItems?.map((item) => (
                    <div
                      key={item.id}
                      className="relative bg-zinc-50 border border-black/5 rounded-[2rem] p-6 space-y-4 animate-fade-in group/media"
                    >
                      <button
                        onClick={() =>
                          onRemoveMedia(section.id, item.id)
                        }
                        className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md shadow-sm border border-black/5 text-zinc-400 hover:bg-red-500 hover:text-white hover:border-red-500 opacity-0 group-hover/media:opacity-100 transition-all duration-300 flex items-center justify-center z-20 font-black"
                        title="Delete Asset"
                      >
                        ✕
                      </button>

                      <div
                        className="border-2 border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center p-8 hover:bg-white transition-all cursor-pointer relative overflow-hidden group/upload"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file)
                            onUpdateMediaFile(
                              section.id,
                              item.id,
                              file,
                            );
                        }}
                        onClick={() =>
                          document
                            .getElementById(`file-upload-${item.id}`)
                            ?.click()
                        }
                      >
                        {item.previewUrl || item.url ? (
                          <img
                            src={item.previewUrl || item.url}
                            alt="Preview"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            <span className="text-2xl mb-2 opacity-50 group-hover/upload:scale-110 transition-transform">
                              🖼️
                            </span>
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">
                              Click or Drag Image
                            </p>
                          </>
                        )}
                        <input
                          id={`file-upload-${item.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              onUpdateMediaFile(
                                section.id,
                                item.id,
                                file,
                              );
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-300 ml-2">
                          Asset URL
                        </label>
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) => {
                            onUpdateMediaUrl(
                              section.id,
                              item.id,
                              e.target.value,
                            );
                            const key = `contentSections.${section.id}.mediaItems.${item.id}.url`;
                            if (fieldErrors[key]) onClearError(key);
                          }}
                          placeholder="https://..."
                          className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none font-medium text-xs shadow-sm ${
                            fieldErrors[`contentSections.${section.id}.mediaItems.${item.id}.url`]
                              ? "border-red-500 focus:border-red-500"
                              : "border-black/5 focus:border-[#FACC15]"
                          }`}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => onAddMedia(section.id)}
                    className="flex flex-col items-center justify-center border-2 border-dashed border-black/5 rounded-[2rem] p-10 hover:bg-[#FACC15]/5 hover:border-[#FACC15]/30 transition-all group/add"
                  >
                    <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center mb-4 group-hover/add:bg-[#FACC15] transition-colors">
                      <span className="text-xl group-hover/add:text-black transition-colors">
                        +
                      </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover/add:text-black">
                      Add Media Asset
                    </p>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default ContentSectionEditor;
