"use client";

import { useState } from "react";

interface ImageCardProps {
  id: string;
  filename: string;
  storedPath: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onView: (id: string) => void;
}

export default function ImageCard({ id, filename, storedPath, selected, onSelect, onView }: ImageCardProps) {
  const [loaded, setLoaded] = useState(false);
  const imgUrl = `/api/images/${id}`;

  return (
    <div
      className={`group relative w-full aspect-[4/3] rounded-lg overflow-hidden cursor-pointer transition-all duration-300
        ${selected
          ? "card-rgb-selected scale-[1.02]"
          : "border border-white/10 hover:border-neon-cyan/30 hover:scale-[1.02]"
        }
      `}
      onClick={() => onSelect(id)}
      onDoubleClick={() => onView(id)}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-dark-200 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
        </div>
      )}

      <img
        src={imgUrl}
        alt={filename}
        className={`w-full h-full object-cover transition-all duration-500 ${loaded ? "opacity-100" : "opacity-0"}
          group-hover:scale-110 group-hover:brightness-110`}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        draggable={false}
        loading="lazy"
      />

      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-dark/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="text-xs text-white/80 truncate font-medium">{filename}</p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onView(id); }}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full
          bg-dark/80 border border-white/20 text-white/70 opacity-0 group-hover:opacity-100
          hover:bg-neon-cyan/20 hover:border-neon-cyan hover:text-neon-cyan
          transition-all duration-200"
        title="View full size"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </button>

      {selected && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-neon-cyan flex items-center justify-center animate-fade-in">
          <svg className="w-3 h-3 text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
