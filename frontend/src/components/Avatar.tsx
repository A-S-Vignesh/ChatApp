import React, { useState, useEffect } from "react";
import { getCachedImage, getCachedImageSync } from "../lib/imageCache";

interface AvatarProps {
  src?: string;
  alt: string;
  isOnline?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, alt, isOnline, size = "md", className = "" }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() =>
    src ? getCachedImageSync(src) : null
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!src) { setResolvedSrc(null); return; }

    const cached = getCachedImageSync(src);
    if (cached) { setResolvedSrc(cached); return; }

    let cancelled = false;
    getCachedImage(src).then((url) => {
      if (cancelled) return;
      if (url) setResolvedSrc(url);
      else setFailed(true);
    });
    return () => { cancelled = true; };
  }, [src]);

  const sizeClasses =
    size === "lg" ? "w-24 h-24 text-3xl" :
    size === "md" ? "w-12 h-12 text-lg" :
    "w-8 h-8 text-sm";

  const onlineIndicatorSize =
    size === "lg" ? "w-5 h-5 border-[3px]" :
    size === "md" ? "w-3.5 h-3.5 border-2" :
    "w-2.5 h-2.5 border";

  const initials = alt
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const showImage = resolvedSrc && !failed;

  return (
    <div className={`relative shrink-0 rounded-full ${sizeClasses} ${className}`}>
      {showImage ? (
        <img
          src={resolvedSrc}
          alt={alt}
          className="rounded-full w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold select-none">
          {initials}
        </div>
      )}

      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 block ${onlineIndicatorSize} bg-green-500 rounded-full border-white dark:border-slate-800`}
        />
      )}
    </div>
  );
};

export default Avatar;
