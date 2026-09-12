"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Swappable image component.
 * - When `src` is provided, renders the real image with a graceful fallback to
 *   the generated placeholder if it fails to load (so layouts never break).
 * - When no `src`, renders CSS art: an accent gradient + abstracted kumiko
 *   lattice, evoking wood/water. Replace `src` later with CMS photos.
 */
export function Placeholder({
  src,
  alt,
  accent = "210 85% 45%",
  label,
  className = "",
  priority = false,
}: {
  src?: string;
  alt: string;
  accent?: string;
  label?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${accent} / 0.92), hsl(${accent} / 0.55))`,
      }}
      aria-hidden={showImage ? undefined : true}
    >
      {showImage ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
          onError={() => setFailed(true)}
          priority={priority}
        />
      ) : (
        <>
          {/* abstracted kumiko lattice */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0 1px, transparent 1px 20px), repeating-linear-gradient(-45deg, rgba(255,255,255,.5) 0 1px, transparent 1px 20px)",
            }}
          />
          {/* water sheen */}
          <div
            className="absolute -inset-x-10 bottom-[-20%] h-2/3 opacity-40 blur-2xl"
            style={{ background: "radial-gradient(closest-side, rgba(255,255,255,.6), transparent)" }}
          />
          {label ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {label}
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
