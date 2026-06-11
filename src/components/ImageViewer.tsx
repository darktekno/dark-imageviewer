"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ViewerImage {
  id: string;
  filename: string;
  width?: number;
  height?: number;
  size?: number;
  created_at?: string;
  stored_path?: string;
}

interface ImageViewerProps {
  images: ViewerImage[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  slideshow?: boolean;
  slideshowInterval?: number;
  onSlideshowEnd?: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function ImageViewer({
  images, currentIndex, onClose, onIndexChange,
  slideshow = false, slideshowInterval = 3000, onSlideshowEnd,
}: ImageViewerProps) {
  const [index, setIndex] = useState(currentIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [ambientColor, setAmbientColor] = useState("rgba(0,0,0,0)");
  const [loaded, setLoaded] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchDist, setTouchDist] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = images[index];
  const totalImages = images.length;

  // Sync index from parent
  useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);

  const goTo = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= totalImages) return;
    setTransitioning(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setLoaded(false);
    setAmbientColor("rgba(0,0,0,0)");
    setTimeout(() => setTransitioning(false), 50);
    setIndex(newIndex);
    onIndexChange?.(newIndex);
  }, [totalImages, onIndexChange]);

  const goNext = useCallback(() => {
    if (index < totalImages - 1) goTo(index + 1);
  }, [index, totalImages, goTo]);

  const goPrev = useCallback(() => {
    if (index > 0) goTo(index - 1);
  }, [index, goTo]);

  // Slideshow
  useEffect(() => {
    if (!slideshow) return;
    slideTimerRef.current = setInterval(() => {
      if (index >= totalImages - 1) {
        clearInterval(slideTimerRef.current!);
        onSlideshowEnd?.();
        return;
      }
      goNext();
    }, slideshowInterval);
    return () => { if (slideTimerRef.current) clearInterval(slideTimerRef.current); };
  }, [slideshow, slideshowInterval, index, totalImages, goNext, onSlideshowEnd]);

  // Preload adjacent images
  useEffect(() => {
    const preloadIndices = [index - 1, index + 1].filter((i) => i >= 0 && i < totalImages);
    preloadIndices.forEach((i) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = `/api/images/${images[i].id}`;
      document.head.appendChild(link);
      setTimeout(() => document.head.removeChild(link), 5000);
    });
  }, [index, images, totalImages]);

  // Fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Track image container size
  useEffect(() => {
    const el = imageContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clamp position when scale or container size changes
  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0 || naturalSize.width === 0 || naturalSize.height === 0) return;
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
      return;
    }
    const containerAspect = containerSize.width / containerSize.height;
    const imgAspect = naturalSize.width / naturalSize.height;
    let displayWidth: number, displayHeight: number;
    if (imgAspect > containerAspect) {
      displayWidth = containerSize.width;
      displayHeight = containerSize.width / imgAspect;
    } else {
      displayHeight = containerSize.height;
      displayWidth = containerSize.height * imgAspect;
    }
    const effectiveW = rotation % 180 === 0 ? displayWidth : displayHeight;
    const effectiveH = rotation % 180 === 0 ? displayHeight : displayWidth;
    const scaledW = effectiveW * scale;
    const scaledH = effectiveH * scale;
    const maxX = Math.max(0, (scaledW - containerSize.width) / 2);
    const maxY = Math.max(0, (scaledH - containerSize.height) / 2);
    setPosition((prev) => ({
      x: Math.max(-maxX, Math.min(maxX, prev.x)),
      y: Math.max(-maxY, Math.min(maxY, prev.y)),
    }));
  }, [scale, containerSize, naturalSize, rotation]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        onClose();
      }
    }
    if (e.key === "ArrowRight" || e.key === " ") goNext();
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === "Home") goTo(0);
    if (e.key === "End") goTo(totalImages - 1);
    if (e.key === "f" || e.key === "F") toggleFullscreen();
    if (e.key === "r" || e.key === "R") setRotation((r) => (r + 90) % 360);
    if (e.key === "i" || e.key === "I") setShowInfo((s) => !s);
    if (e.key === "=" || e.key === "+") setScale((s) => Math.min(s * 1.5, 10));
    if (e.key === "-") setScale((s) => Math.max(s / 1.5, 0.1));
    if (e.key === "0") { setScale(1); setPosition({ x: 0, y: 0 }); }
  }, [onClose, goNext, goPrev, goTo, totalImages, toggleFullscreen]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const clampPosition = useCallback((pos: { x: number; y: number }) => {
    const cs = containerSize;
    const ns = naturalSize;
    if (cs.width === 0 || cs.height === 0 || ns.width === 0 || ns.height === 0) return pos;
    if (scale <= 1) return { x: 0, y: 0 };
    const containerAspect = cs.width / cs.height;
    const imgAspect = ns.width / ns.height;
    let displayWidth: number, displayHeight: number;
    if (imgAspect > containerAspect) {
      displayWidth = cs.width;
      displayHeight = cs.width / imgAspect;
    } else {
      displayHeight = cs.height;
      displayWidth = cs.height * imgAspect;
    }
    const effectiveW = rotation % 180 === 0 ? displayWidth : displayHeight;
    const effectiveH = rotation % 180 === 0 ? displayHeight : displayWidth;
    const scaledW = effectiveW * scale;
    const scaledH = effectiveH * scale;
    const maxX = Math.max(0, (scaledW - cs.width) / 2);
    const maxY = Math.max(0, (scaledH - cs.height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, pos.x)),
      y: Math.max(-maxY, Math.min(maxY, pos.y)),
    };
  }, [containerSize, naturalSize, scale, rotation]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.max(0.1, Math.min(s * delta, 10)));
  }, []);

  // Mouse drag pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newPos = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
      setPosition(clampPosition(newPos));
    }
  }, [isDragging, scale, dragStart, clampPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double click to reset zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
      setPosition(clampPosition({ x: (window.innerWidth / 2 - e.clientX) * 2, y: (window.innerHeight / 2 - e.clientY) * 2 }));
    }
  }, [scale, clampPosition]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setTouchDist(Math.sqrt(dx * dx + dy * dy));
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStart && scale <= 1) {
      const dx = e.touches[0].clientX - touchStart.x;
      if (Math.abs(dx) > 50) {
        if (dx > 0) goPrev();
        else goNext();
        setTouchStart(null);
      }
    } else if (e.touches.length === 2 && touchDist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = scale * (dist / touchDist);
      setScale(Math.max(0.1, Math.min(newScale, 10)));
      setTouchDist(dist);
    }
  }, [touchStart, touchDist, scale, goNext, goPrev]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setTouchDist(null);
  }, []);

  // Sample dominant color from loaded image for ambient effect
  const handleImgLoad = useCallback(() => {
    setLoaded(true);
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      setAmbientColor(`rgba(${r},${g},${b},0.15)`);
    } catch {}
  }, []);

  if (!current) return null;

  const src = `/api/images/${current.id}`;
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center select-none"
      style={{
        background: `radial-gradient(ellipse at center, ${ambientColor}, rgba(0,0,0,0.95) 70%)`,
        transition: "background 0.6s ease",
      }}
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="relative w-full h-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-white/60 font-mono shrink-0">
              {index + 1} / {totalImages}
            </span>
            <span className="text-sm text-white/80 font-mono truncate">
              {current.filename}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo((s) => !s)}
              className={`px-2 py-1 text-[10px] font-gaming border rounded transition-all
                ${showInfo
                  ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan"
                  : "border-white/20 text-white/60 hover:border-neon-cyan/50 hover:text-neon-cyan"
                }`}
              title="Toggle info [I]"
            >
              INFO
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-2 py-1 text-[10px] font-gaming border border-white/20 text-white/60 rounded
                hover:border-neon-cyan/50 hover:text-neon-cyan transition-all"
              title="Fullscreen [F]"
            >
              {isFullscreen ? "EXIT FS" : "FULL"}
            </button>
            <button
              onClick={onClose}
              className="shrink-0 px-3 py-1 text-xs font-gaming border border-neon-cyan/50 text-neon-cyan rounded
                hover:bg-neon-cyan/10 hover:border-neon-cyan transition-all"
            >
              ESC [X]
            </button>
          </div>
        </div>

        {/* Info overlay */}
        {showInfo && current && (
          <div className="absolute top-14 left-4 z-20 bg-dark/90 backdrop-blur-md border border-white/10 rounded-lg px-4 py-3 text-xs font-mono space-y-1.5 min-w-[200px] animate-fade-in">
            <p className="text-neon-cyan font-gaming text-[10px] tracking-wider mb-2">IMAGE INFO</p>
            <div className="space-y-1 text-gray-400">
              <p><span className="text-gray-500">Name:</span> <span className="text-white">{current.filename}</span></p>
              {(current.width && current.height) ? (
                <p><span className="text-gray-500">Dimensions:</span> <span className="text-white">{current.width} x {current.height}</span></p>
              ) : null}
              {current.size ? (
                <p><span className="text-gray-500">Size:</span> <span className="text-white">{formatSize(current.size)}</span></p>
              ) : null}
              {current.created_at ? (
                <p><span className="text-gray-500">Added:</span> <span className="text-white">{formatDate(current.created_at)}</span></p>
              ) : null}
              {current.stored_path ? (
                <p className="mt-2 text-[10px]">
                  <span className="text-gray-500">Path:</span>
                  <br />
                  <span className="text-gray-400 break-all">{current.stored_path}</span>
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* Prev button */}
        {hasPrev && (
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center
              bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-full
              text-white/40 hover:text-neon-cyan transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Next button */}
        {hasNext && (
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center
              bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-full
              text-white/40 hover:text-neon-cyan transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Image container */}
        <div
          ref={imageContainerRef}
          className="relative rounded-lg overflow-hidden border border-white/10 shadow-2xl bg-dark/90"
          style={{
            maxWidth: "90vw",
            maxHeight: "80vh",
            boxShadow: ambientColor !== "rgba(0,0,0,0)" ? `0 0 60px ${ambientColor}, 0 0 120px ${ambientColor}` : undefined,
            transition: "box-shadow 0.6s ease",
          }}
        >
          <img
            ref={imgRef}
            key={current.id}
            src={src}
            alt={current.filename}
            className={`max-w-[90vw] max-h-[80vh] w-auto h-auto object-contain
              ${transitioning ? "opacity-0" : "opacity-100"}
              transition-opacity duration-300`}
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: scale > 1 ? "grabbing" : "grab",
            }}
            draggable={false}
            onLoad={handleImgLoad}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {/* Zoom indicator */}
        {scale !== 1 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-dark/80 backdrop-blur-sm
            border border-white/10 rounded-full px-3 py-1 text-xs font-mono text-neon-cyan"
          >
            {Math.round(scale * 100)}%
          </div>
        )}

        {/* Bottom bar */}
        <div className="absolute bottom-4 flex gap-3 z-10">
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="px-3 py-1 text-xs font-gaming border border-white/20 text-white/60 rounded
              hover:border-neon-cyan/50 hover:text-neon-cyan transition-all"
          >
            ROTATE
          </button>
          <button
            onClick={() => router.push(`/dashboard/edit/${current.id}?filename=${encodeURIComponent(current.filename)}`)}
            className="px-3 py-1 text-xs font-gaming border border-neon-green/50 text-neon-green rounded
              hover:bg-neon-green/10 hover:border-neon-green transition-all"
          >
            EDIT
          </button>
          <a
            href={src}
            download={current.filename}
            className="px-3 py-1 text-xs font-gaming border border-neon-green/50 text-neon-green rounded
              hover:bg-neon-green/10 hover:border-neon-green transition-all"
          >
            DOWNLOAD
          </a>
          <div className="flex gap-1">
            {[50, 100, 150, 200].map((pct) => (
              <button
                key={pct}
                onClick={() => setScale(pct / 100)}
                className={`px-2 py-1 text-[10px] font-mono border rounded transition-all
                  ${Math.abs(scale - pct / 100) < 0.01
                    ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan"
                    : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/70"
                  }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
