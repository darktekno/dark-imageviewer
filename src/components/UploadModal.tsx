"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface DirData {
  type: "drives" | "directory" | "file";
  path?: string;
  parent?: string | null;
  name?: string;
  folders?: string[];
  images?: string[];
  items?: string[];
}

interface UploadModalProps {
  username: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RECENT_PATHS_KEY = "darkview_recent_paths";

function getRecentPaths(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_PATHS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentPath(p: string) {
  try {
    const paths = getRecentPaths().filter((x) => x !== p);
    paths.unshift(p);
    localStorage.setItem(RECENT_PATHS_KEY, JSON.stringify(paths.slice(0, 5)));
  } catch {}
}

export default function UploadModal({ username, onClose, onSuccess }: UploadModalProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [dirData, setDirData] = useState<DirData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualPath, setManualPath] = useState("");
  const [recursive, setRecursive] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ folderName: string; count: number } | null>(null);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && !scanning) onClose();
  }, [onClose, scanning]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setRecentPaths(getRecentPaths());
  }, []);

  const loadDir = useCallback(async (path: string) => {
    setLoading(true);
    setError("");
    setSuccess(null);
    const params = path ? `?path=${encodeURIComponent(path)}` : "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`/api/browse${params}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        setDirData(data);
        setCurrentPath(data.path || "");
        setManualPath(data.path || "");
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to read directory" }));
        setError(err.error || "Cannot access this directory");
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Request timed out. The directory may be too large.");
      } else {
        setError("Connection error. Check server status.");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDir("");
  }, [loadDir]);

  const navigateTo = (name: string) => {
    const base = currentPath.replace(/\\+$/, "");
    const child = name.replace(/^\\+/, "");
    loadDir(base + "\\" + child);
  };

  const navigateToParent = () => {
    if (dirData?.parent) loadDir(dirData.parent);
  };

  const navigateToBreadcrumb = (targetPath: string) => {
    loadDir(targetPath);
  };

  const handleManualNav = () => {
    if (manualPath.trim()) loadDir(manualPath.trim());
  };

  const handleScan = async () => {
    if (!currentPath || scanning) return;
    setError("");
    setSuccess(null);
    setScanning(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, dirPath: currentPath, recursive }),
        signal: abortRef.current.signal,
      });

      if (res.ok) {
        const data = await res.json();
        addRecentPath(currentPath);
        setRecentPaths(getRecentPaths());
        setSuccess({ folderName: data.folderName, count: data.imageCount });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const err = await res.json();
        setError(err.error || "Scan failed");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Scan cancelled");
      } else {
        setError("Scan failed. Check console.");
      }
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  };

  const cancelScan = () => {
    abortRef.current?.abort();
  };

  // Build breadcrumb segments from the current path
  const breadcrumbs = (() => {
    if (!currentPath) return [];
    const sep = currentPath.includes("\\") ? "\\" : "/";
    const parts = currentPath.split(sep);
    const segments: { label: string; path: string }[] = [];
    let accumulated = "";
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i]) {
        if (i === 0) {
          accumulated = parts[0] + sep;
          segments.push({ label: parts[0] || "/", path: accumulated });
        }
        continue;
      }
      accumulated = accumulated ? accumulated + parts[i] + sep : parts[i] + sep;
      segments.push({ label: parts[i], path: accumulated.replace(/\\$/, "") });
    }
    return segments;
  })();

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={scanning ? undefined : onClose}
    >
      <div
        className="bg-dark-200 border border-white/10 rounded-xl w-full max-w-xl mx-4 animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="p-6 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-gaming text-lg font-bold rgb-text">SCAN DIRECTORY</h2>
            <button
              onClick={onClose}
              disabled={scanning}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Path input */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualNav()}
              placeholder="Type a path or browse below..."
              className="flex-1 px-3 py-2 bg-dark rounded border border-white/10 text-sm text-white
                focus:border-neon-cyan focus:outline-none font-mono placeholder:text-gray-600"
            />
            <button
              onClick={handleManualNav}
              disabled={!manualPath.trim()}
              className="px-3 py-2 text-xs font-gaming border border-neon-cyan/50 text-neon-cyan rounded
                hover:bg-neon-cyan/10 transition-all disabled:opacity-30"
            >
              GO
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 overflow-y-auto" style={{ maxHeight: "45vh" }}>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : dirData?.type === "drives" ? (
            <div className="space-y-1 pb-4">
              <p className="text-xs font-gaming text-gray-500 mb-2">DRIVES</p>
              {dirData.items?.map((drive) => (
                <button
                  key={drive}
                  onClick={() => loadDir(drive)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-sm text-gray-300
                    hover:bg-white/5 transition-all font-mono"
                >
                  <svg className="w-4 h-4 text-neon-cyan shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {drive}
                </button>
              ))}

              {/* Recent paths */}
              {recentPaths.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-gaming text-gray-600 mb-2">RECENT PATHS</p>
                  {recentPaths.map((p) => (
                    <button
                      key={p}
                      onClick={() => loadDir(p)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-left text-xs text-gray-500
                        hover:bg-white/5 hover:text-gray-300 transition-all font-mono"
                    >
                      <svg className="w-3 h-3 text-neon-cyan/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="truncate">{p}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : dirData?.type === "directory" ? (
            <div className="pb-4">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {dirData.parent && (
                  <button onClick={navigateToParent} className="text-neon-cyan hover:text-neon-cyan/80 transition-colors shrink-0" title="Go up">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                )}
                <nav className="flex items-center gap-1 min-w-0 flex-wrap">
                  {breadcrumbs.map((seg, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-gray-600 text-xs">/</span>}
                      {i === breadcrumbs.length - 1 ? (
                        <span className="text-xs text-gray-300 font-mono truncate max-w-[200px]">{seg.label}</span>
                      ) : (
                        <button
                          onClick={() => navigateToBreadcrumb(seg.path)}
                          className="text-xs text-gray-500 hover:text-neon-cyan font-mono truncate max-w-[120px] transition-colors"
                        >
                          {seg.label}
                        </button>
                      )}
                    </span>
                  ))}
                </nav>
              </div>

              {/* Folders */}
              {dirData.folders && dirData.folders.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-gaming text-gray-600 mb-1">
                    FOLDERS ({dirData.folders.length})
                  </p>
                  {dirData.folders.map((folder) => (
                    <button
                      key={folder}
                      onClick={() => navigateTo(folder)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-left text-sm text-gray-300
                        hover:bg-white/5 hover:text-neon-cyan transition-all font-mono group"
                    >
                      <svg className="w-4 h-4 text-neon-cyan/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="truncate flex-1">{folder}</span>
                      <svg className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {/* Images preview */}
              {dirData.images && dirData.images.length > 0 && (
                <div>
                  <p className="text-[10px] font-gaming text-gray-600 mb-1">
                    IMAGES IN THIS FOLDER ({dirData.images.length})
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {dirData.images.slice(0, 12).map((img) => (
                      <div
                        key={img}
                        className="w-10 h-10 rounded bg-dark border border-white/5 overflow-hidden shrink-0"
                        title={img}
                      >
                        <div className="w-full h-full bg-dark-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                    ))}
                    {dirData.images.length > 12 && (
                      <div className="w-10 h-10 rounded bg-dark-100 border border-white/5 flex items-center justify-center shrink-0">
                        <span className="text-[10px] text-gray-500 font-mono">+{dirData.images.length - 12}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(!dirData.folders || dirData.folders.length === 0) &&
                (!dirData.images || dirData.images.length === 0) && (
                <p className="text-xs text-gray-600 font-mono text-center py-6">{">"} Empty directory</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-600 font-mono text-center py-6">{">"} Cannot read directory</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-3 space-y-3">
          {/* Folder stats (from browse data, no extra API call) */}
              {dirData?.type === "directory" && !scanning && !success && (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recursive}
                      onChange={(e) => setRecursive(e.target.checked)}
                      className="w-3.5 h-3.5 accent-neon-cyan"
                    />
                    <span className="text-[10px] font-gaming text-gray-500">RECURSIVE</span>
                  </label>
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="text-neon-cyan">{dirData.images?.length || 0} images</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-500">{dirData.folders?.length || 0} folder{(dirData.folders?.length || 0) !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-neon-magenta/10 border border-neon-magenta/30 rounded text-xs font-mono text-neon-magenta animate-fade-in">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="px-3 py-2 bg-neon-green/10 border border-neon-green/30 rounded text-xs font-mono text-neon-green animate-fade-in flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Imported {success.count} images to "{success.folderName}"
            </div>
          )}

          {/* Progress bar during scan */}
          {scanning && (
            <div className="mb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-neon-cyan animate-pulse">
                  Scanning directory...
                </span>
                {dirData?.images && (
                  <span className="text-[10px] font-mono text-gray-500">
                    {dirData.images.length} images in this folder
                  </span>
                )}
              </div>
              <div className="h-1 bg-dark rounded-full overflow-hidden">
                <div className="h-full rounded-full rgb-gradient" style={{
                  width: "100%",
                  animation: "gradientShift 1s ease infinite",
                  backgroundSize: "200% 100%",
                }} />
              </div>
            </div>
          )}

          {/* Scan / Cancel button */}
          {success ? (
            <div className="w-full py-2.5 font-gaming font-bold text-sm rounded bg-neon-green/10 border border-neon-green/30 text-neon-green text-center">
              ✓ COMPLETE
            </div>
          ) : scanning ? (
            <button
              onClick={cancelScan}
              className="w-full py-2.5 font-gaming font-bold text-sm rounded border border-neon-magenta/50 text-neon-magenta
                hover:bg-neon-magenta/10 transition-all active:scale-[0.98]"
            >
              CANCEL SCAN
            </button>
          ) : (
            <button
              onClick={handleScan}
              disabled={!currentPath || loading || dirData?.type !== "directory"}
              className="w-full py-2.5 font-gaming font-bold text-sm rounded rgb-gradient text-dark
                disabled:opacity-30 disabled:cursor-not-allowed
                hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all duration-300 active:scale-[0.98]"
            >
              {dirData?.type === "directory"
                ? `SCAN "${dirData.name || currentPath.split("\\").pop() || currentPath}"`
                : "SELECT A DIRECTORY"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
