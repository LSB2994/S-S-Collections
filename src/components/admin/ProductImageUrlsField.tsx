"use client";

import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  name: string;
  initialUrls?: string[];
};

type ImageRow = {
  url: string;
  uploading: boolean;
};

function ImagePreview({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="grid size-16 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground">
        <ImageIcon className="size-5" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="size-16 shrink-0 rounded-lg border bg-muted object-cover"
      onError={() => setFailed(true)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }
  const data = await res.json();
  return data.url;
}

export function ProductImageUrlsField({ name, initialUrls }: Props) {
  const [rows, setRows] = useState<ImageRow[]>(() => {
    const u = initialUrls?.filter((s) => s.trim().length > 0) ?? [];
    return u.map((url) => ({ url, uploading: false }));
  });
  const [dragOver, setDragOver] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArray.length === 0) return;

    const placeholders: ImageRow[] = fileArray.map(() => ({ url: "", uploading: true }));
    setRows((prev) => [...prev, ...placeholders]);

    const startIndex = rows.length;
    for (let i = 0; i < fileArray.length; i++) {
      try {
        const url = await uploadFile(fileArray[i]);
        setRows((prev) =>
          prev.map((r, j) => (j === startIndex + i ? { url, uploading: false } : r))
        );
      } catch {
        setRows((prev) => prev.filter((_, j) => j !== startIndex + i));
      }
    }
  }, [rows.length]);

  const remove = (i: number) => {
    setDeleteIndex(i);
  };

  const confirmRemove = () => {
    if (deleteIndex !== null) {
      setRows((r) => r.filter((_, j) => j !== deleteIndex));
      setDeleteIndex(null);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          {row.uploading ? (
            <div className="grid size-16 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <ImagePreview src={row.url} />
          )}
          <input type="hidden" name={name} value={row.url} />
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {row.uploading ? "Uploading…" : row.url.split("/").pop()}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => remove(i)}
            aria-label="Remove image"
            disabled={row.uploading}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      <div
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mb-2 size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drop images here or click to upload
        </p>
        <p className="text-xs text-muted-foreground/60">
          First image becomes the thumbnail.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {deleteIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={() => setDeleteIndex(null)}
        >
          <div
            className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Confirm Action</h3>
            <p className="mb-6 text-sm text-slate-500">
              Are you sure you want to delete this image?
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button type="button" variant="outline" onClick={() => setDeleteIndex(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmRemove}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
