"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface FilterState {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
  invert: number;
  hueRotate: number;
}

interface CropState {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

const PRESET_FILTERS: Record<string, Partial<FilterState>> = {
  Normal: {},
  Grayscale: { grayscale: 100, saturation: 0 },
  Sepia: { sepia: 80 },
  Invert: { invert: 100 },
  Warm: { hueRotate: 30, saturation: 120 },
  Cool: { hueRotate: 200, saturation: 110 },
  Vintage: { sepia: 50, contrast: 80, brightness: 110, saturation: 60 },
  Dramatic: { contrast: 150, saturation: 130, brightness: 90 },
};

export default function EditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const filename = searchParams.get("filename") || "image";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    brightness: 100, contrast: 100, saturation: 100,
    blur: 0, grayscale: 0, sepia: 0, invert: 0, hueRotate: 0,
  });
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [activePreset, setActivePreset] = useState("Normal");
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const filterStyle = [
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `saturate(${filters.saturation}%)`,
    `blur(${filters.blur}px)`,
    `grayscale(${filters.grayscale}%)`,
    `sepia(${filters.sepia}%)`,
    `invert(${filters.invert}%)`,
    `hue-rotate(${filters.hueRotate}deg)`,
  ].join(" ");

  const transformStyle = [
    `rotate(${rotation}deg)`,
    flipH ? "scaleX(-1)" : "",
    flipV ? "scaleY(-1)" : "",
  ].filter(Boolean).join(" ");

  const updateFilter = useCallback((key: keyof FilterState, value: number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setActivePreset("");
  }, []);

  const applyPreset = useCallback((name: string) => {
    const preset = PRESET_FILTERS[name];
    if (preset) {
      setFilters((prev) => ({ ...prev, ...preset }));
      setActivePreset(name);
    }
  }, []);

  const resetAll = useCallback(() => {
    setFilters({ brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0, sepia: 0, invert: 0, hueRotate: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setActivePreset("Normal");
  }, []);

  const handleDownload = useCallback(async () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    setSaving(true);
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (rotation % 180 !== 0) [w, h] = [h, w];
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.filter = filterStyle;
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);
      const link = document.createElement("a");
      link.download = filename.replace(/\.[^.]+$/, "") + "_edited.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setSaving(false);
    }
  }, [filterStyle, rotation, flipH, flipV, filename]);

  const imgUrl = `/api/images/${id}`;

  const Slider = ({ label, value, min, max, step, onChange, unit }: {
    label: string; value: number; min: number; max: number; step?: number;
    onChange: (v: number) => void; unit?: string;
  }) => {
    const pct = ((value - min) / (max - min)) * 100;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{label}</span>
          <span className="text-[10px] font-mono text-neon-cyan/80 font-medium">{value}{unit || ""}</span>
        </div>
        <div className="relative h-6 flex items-center">
          <input
            type="range"
            min={min} max={max} step={step || 1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full appearance-none bg-transparent outline-none z-10 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-dark [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-neon-cyan [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,245,255,0.4),0_0_20px_rgba(0,245,255,0.15)]
              [&::-webkit-slider-thumb]:hover:shadow-[0_0_12px_rgba(0,245,255,0.6),0_0_30px_rgba(0,245,255,0.25)]
              [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:duration-200
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-dark [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-neon-cyan [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(0,245,255,0.4)]
              [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-dark-200
              [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-neon-cyan/60"
          />
          <div className="absolute left-0 h-1.5 rounded-full bg-dark-200 w-full pointer-events-none" />
          <div
            className="absolute left-0 h-1.5 rounded-full bg-gradient-to-r from-neon-cyan/80 to-neon-cyan pointer-events-none transition-[width] duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-hex flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-dark/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-3 py-1 text-[10px] font-gaming border border-white/20 text-gray-400 rounded
              hover:border-neon-cyan/50 hover:text-neon-cyan transition-all"
          >
            ← BACK
          </Link>
          <span className="text-sm font-mono text-white/80 truncate max-w-[300px]">{filename}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            className="px-3 py-1.5 text-[10px] font-gaming border border-white/20 text-gray-400 rounded
              hover:border-neon-magenta/50 hover:text-neon-magenta transition-all"
          >
            RESET
          </button>
          <button
            onClick={handleDownload}
            disabled={saving || !imageLoaded}
            className="px-4 py-1.5 text-[10px] font-gaming border border-neon-cyan/50 text-neon-cyan rounded
              hover:bg-neon-cyan/10 hover:border-neon-cyan transition-all disabled:opacity-30"
          >
            {saving ? "SAVING..." : "↓ DOWNLOAD"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-[50vh] lg:min-h-0">
          <div className="relative max-w-full max-h-full rounded-lg overflow-hidden border border-white/10 bg-dark/90 shadow-2xl">
            <canvas ref={canvasRef} className="hidden" />
            <img
              ref={imgRef}
              src={imgUrl}
              alt={filename}
              onLoad={() => setImageLoaded(true)}
              className="max-w-[90vw] max-h-[70vh] w-auto h-auto object-contain transition-all duration-150"
              style={{ filter: filterStyle, transform: transformStyle }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-dark/95 overflow-y-auto max-h-[50vh] lg:max-h-none">
          <div className="p-4 space-y-6">
            {/* Transform */}
            <section>
              <h3 className="text-[10px] font-gaming text-gray-500 tracking-widest mb-3">TRANSFORM</h3>
              <div className="space-y-3">
                <Slider label="Rotation" value={rotation} min={0} max={360} onChange={setRotation} unit="°" />
                <div className="flex gap-2">
                  <button
                    onClick={() => setFlipH((f) => !f)}
                    className={`flex-1 px-3 py-2 text-[10px] font-gaming border rounded transition-all
                      ${flipH ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan" : "border-white/10 text-gray-400 hover:border-white/30"}`}
                  >
                    ↔ FLIP H
                  </button>
                  <button
                    onClick={() => setFlipV((f) => !f)}
                    className={`flex-1 px-3 py-2 text-[10px] font-gaming border rounded transition-all
                      ${flipV ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan" : "border-white/10 text-gray-400 hover:border-white/30"}`}
                  >
                    ↕ FLIP V
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="flex-1 px-3 py-2 text-[10px] font-gaming border border-white/10 text-gray-400 rounded
                      hover:border-neon-cyan/50 hover:text-neon-cyan transition-all"
                  >
                    ↻ 90°
                  </button>
                </div>
              </div>
            </section>

            {/* Adjust */}
            <section>
              <h3 className="text-[10px] font-gaming text-gray-500 tracking-widest mb-3">ADJUST</h3>
              <div className="space-y-3">
                <Slider label="Brightness" value={filters.brightness} min={0} max={200} onChange={(v) => updateFilter("brightness", v)} unit="%" />
                <Slider label="Contrast" value={filters.contrast} min={0} max={200} onChange={(v) => updateFilter("contrast", v)} unit="%" />
                <Slider label="Saturation" value={filters.saturation} min={0} max={200} onChange={(v) => updateFilter("saturation", v)} unit="%" />
                <Slider label="Blur" value={filters.blur} min={0} max={10} step={0.5} onChange={(v) => updateFilter("blur", v)} unit="px" />
              </div>
            </section>

            {/* Presets */}
            <section>
              <h3 className="text-[10px] font-gaming text-gray-500 tracking-widest mb-3">PRESETS</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.keys(PRESET_FILTERS).map((name) => (
                  <button
                    key={name}
                    onClick={() => applyPreset(name)}
                    className={`px-2 py-1.5 text-[9px] font-mono border rounded transition-all text-center
                      ${activePreset === name
                        ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan"
                        : "border-white/10 text-gray-400 hover:border-white/30 hover:text-gray-200"
                      }`}
                  >
                    {name.toUpperCase()}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
