"use client";

import { ImageIcon, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  name: string;
  initialUrls?: string[];
};

function ImagePreview({ src }: { src: string }) {
  const normalized = useMemo(() => src.trim(), [src]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [normalized]);

  if (!normalized || failed) {
    return (
      <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground">
        <ImageIcon className="size-4" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={normalized}
      alt=""
      className="size-10 shrink-0 rounded-lg border bg-muted object-cover"
      onError={() => setFailed(true)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

export function ProductImageUrlsField({ name, initialUrls }: Props) {
  const [rows, setRows] = useState<string[]>(() => {
    const u = initialUrls?.filter((s) => s.trim().length > 0) ?? [];
    return u.length ? u : [""];
  });

  const add = () => setRows((r) => [...r, ""]);
  const remove = (i: number) => setRows((r) => (r.length <= 1 ? [""] : r.filter((_, j) => j !== i)));
  const setAt = (i: number, v: string) => setRows((r) => r.map((x, j) => (j === i ? v : x)));

  return (
    <div className="space-y-2">
      {rows.map((value, i) => (
        <div key={i} className="flex gap-2">
          <ImagePreview src={value} />
          <Input
            name={name}
            value={value}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder="https://…"
            className="min-w-0 flex-1"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => remove(i)}
            aria-label="Remove image URL"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add} className="gap-1">
        <Plus className="size-4" />
        Add image URL
      </Button>
    </div>
  );
}
