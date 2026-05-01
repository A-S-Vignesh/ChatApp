import React, { useState } from "react";

interface AvatarProps {
  src?: string;
  alt: string;
  isOnline?: boolean;
  size?: "sm" | "md";
}

const Avatar: React.FC<AvatarProps> = ({ src, alt, isOnline, size = "md" }) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = size === "md" ? "w-12 h-12 text-lg" : "w-8 h-8 text-sm";
  const onlineIndicatorSize =
    size === "md" ? "w-3.5 h-3.5 border-2" : "w-2.5 h-2.5 border";

  const initials = alt
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const showImage = src && !imgError;

  return (
    <div className={`relative shrink-0 ${sizeClasses}`}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="rounded-full w-full h-full object-cover"
          onError={() => setImgError(true)}
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
