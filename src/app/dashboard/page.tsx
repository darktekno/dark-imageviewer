"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ImageCard from "@/components/ImageCard";
import ImageViewer from "@/components/ImageViewer";
import UploadModal from "@/components/UploadModal";

interface Folder {
  id: string;
  name: string;
  image_count: number;
  created_at: string;
}

interface Image {
  id: string;
  filename: string;
  stored_path: string;
  size: number;
  width: number;
  height: number;
  created_at: string;
  favorited: boolean;
}

type LayoutMode = "grid" | "compact" | "detail";
type SortMode = "name" | "date" | "size" | "random";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);

  // New state
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 50;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const imagesLoadingRef = useRef(false);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { imagesLoadingRef.current = imagesLoading; }, [imagesLoading]);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push("/");
        } else {
          setUser(data.user.username);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const loadFolders = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/folders?username=${encodeURIComponent(user)}`);
    if (res.ok) {
      const data = await res.json();
      setFolders(data);
      setActiveFolder((prev) => {
        if (prev !== null) return prev;
        return data.length > 0 ? data[0].id : null;
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) loadFolders();
  }, [user, loadFolders]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
    setImages([]);
    setTotalImages(0);
    setHasMore(false);
  }, [activeFolder, sortMode, searchQuery, showFavoritesOnly]);

  // Load images for current page
  useEffect(() => {
    if (!activeFolder || !user) return;
    const isInitial = page === 0;
    if (isInitial) {
      setImagesLoading(true);
      setSelectedIds(new Set());
    } else {
      setLoadingMore(true);
    }
    const offset = page * PAGE_SIZE;
    const params = new URLSearchParams({
      folderId: activeFolder, sort: sortMode, username: user,
      limit: String(PAGE_SIZE), offset: String(offset),
    });
    if (searchQuery) params.set("search", searchQuery);
    if (showFavoritesOnly) params.set("favorites", "true");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    fetch(`/api/images?${params}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        if (isInitial) {
          setImages(data.images);
        } else {
          setImages((prev) => [...prev, ...data.images]);
        }
        setTotalImages(data.total);
        setHasMore(offset + data.images.length < data.total);
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        setImagesLoading(false);
        setLoadingMore(false);
      });
  }, [activeFolder, page, sortMode, user, searchQuery, showFavoritesOnly]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      () => {
        if (hasMoreRef.current && !loadingMoreRef.current && !imagesLoadingRef.current) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [activeFolder]);

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleScanSuccess = () => {
    loadFolders();
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder and its image references?")) return;
    const res = await fetch(`/api/folders?folderId=${folderId}`, { method: "DELETE" });
    if (res.ok) {
      setFolders((prev) => {
        const next = prev.filter((f) => f.id !== folderId);
        if (activeFolder === folderId) {
          setActiveFolder(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected image(s)?`)) return;
    setDeleteLoading(true);
    const res = await fetch("/api/images/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), folderId: activeFolder }),
    });
    if (res.ok) {
      setImages((prev) => prev.filter((img) => !selectedIds.has(img.id)));
      setSelectedIds(new Set());
    }
    setDeleteLoading(false);
  };

  const handleToggleFavorite = async (imageId: string) => {
    if (!user) return;
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: imageId, username: user }),
    });
    setImages((prev) => prev.map((img) =>
      img.id === imageId ? { ...img, favorited: !img.favorited } : img
    ));
  };

  const handleRefresh = () => {
    if (activeFolder) {
      setPage(0);
      setImages([]);
      setTotalImages(0);
      setHasMore(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const activeFolderData = folders.find((f) => f.id === activeFolder);

  const gridCols = layoutMode === "compact"
    ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2"
    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4";

  return (
    <div className="min-h-screen bg-hex">
      <Header
        username={user}
        onScanClick={() => setShowScan(true)}
        onRefresh={handleRefresh}
      />

      <main className="pt-20 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
        {folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
            <div className="w-20 h-20 mb-6 relative flex items-center justify-center opacity-50">
              <div className="absolute inset-0 clip-hex border border-neon-cyan/30 opacity-50" />
              <svg className="w-8 h-8 text-neon-cyan/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-gaming font-bold text-gray-400 mb-2">NO FOLDERS YET</h2>
            <p className="text-sm text-gray-600 font-mono mb-6">
              {">"} Scan a directory to start browsing images
            </p>
            <button
              onClick={() => setShowScan(true)}
              className="px-6 py-2.5 font-gaming font-bold text-sm rgb-gradient text-dark rounded-lg
                hover:shadow-[0_0_20px_rgba(0,245,255,0.3)] transition-all"
            >
              + SCAN DIRECTORY
            </button>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className="hidden md:block w-64 shrink-0">
              <div className="sticky top-20">
                <h3 className="text-xs font-gaming font-bold text-gray-500 tracking-widest mb-3">FOLDERS</h3>
                <div className="space-y-1">
                  {folders.map((folder) => (
                    <div key={folder.id} className="group relative">
                      <button
                        onClick={() => { setActiveFolder(folder.id); setSearchQuery(""); setShowFavoritesOnly(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200
                          ${activeFolder === folder.id
                            ? "bg-neon-cyan/10 border border-neon-cyan/30 shadow-[0_0_10px_rgba(0,245,255,0.1)]"
                            : "hover:bg-white/5 border border-transparent"
                          }`}
                      >
                        <svg className={`w-4 h-4 shrink-0 ${activeFolder === folder.id ? "text-neon-cyan" : "text-gray-600 group-hover:text-gray-400"}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm truncate font-medium ${activeFolder === folder.id ? "text-neon-cyan" : "text-gray-300"}`}>
                            {folder.name}
                          </p>
                          <p className="text-[10px] text-gray-600 font-mono">
                            {folder.image_count} image{folder.image_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded
                          text-gray-600 opacity-0 group-hover:opacity-100 hover:text-neon-magenta hover:bg-neon-magenta/10
                          transition-all duration-200"
                        title="Delete folder"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Header section */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-gaming font-bold text-white">
                    {activeFolderData?.name || "Select a folder"}
                  </h2>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    {">"} {images.length} / {totalImages} image{totalImages !== 1 ? "s" : ""}
                    {showFavoritesOnly && (
                      <span className="text-neon-yellow"> (favorites)</span>
                    )}
                    {selectedIds.size > 0 && (
                      <span className="text-neon-cyan"> // {selectedIds.size} selected</span>
                    )}
                  </p>
                </div>

                <div className="hidden md:flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search files..."
                      className="w-40 lg:w-52 px-3 py-1.5 bg-dark rounded border border-white/10 text-xs text-white
                        focus:border-neon-cyan focus:outline-none font-mono placeholder:text-gray-600"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Sort */}
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="px-2 py-1.5 bg-dark border border-white/10 rounded text-[10px] text-gray-400 font-mono
                      focus:border-neon-cyan focus:outline-none cursor-pointer"
                  >
                    <option value="name">Name A-Z</option>
                    <option value="date">Newest</option>
                    <option value="size">Largest</option>
                    <option value="random">Random</option>
                  </select>

                  {/* Layout toggle */}
                  <div className="flex border border-white/10 rounded overflow-hidden">
                    {(["grid", "compact", "detail"] as LayoutMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setLayoutMode(mode)}
                        className={`px-2 py-1.5 text-[10px] font-gaming transition-all
                          ${layoutMode === mode
                            ? "bg-neon-cyan/20 text-neon-cyan"
                            : "text-gray-500 hover:text-gray-300"
                          }`}
                      >
                        {mode === "grid" ? "GRID" : mode === "compact" ? "COMP" : "DETAIL"}
                      </button>
                    ))}
                  </div>

                  {/* Favorites toggle */}
                  <button
                    onClick={() => setShowFavoritesOnly((s) => !s)}
                    className={`px-2 py-1.5 text-[10px] font-gaming border rounded transition-all
                      ${showFavoritesOnly
                        ? "bg-neon-yellow/20 border-neon-yellow text-neon-yellow"
                        : "border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/30"
                      }`}
                  >
                    ★ FAVS
                  </button>

                  {/* Slideshow */}
                  <button
                    onClick={() => {
                      if (images.length > 0) {
                        setViewerIndex(0);
                        setSlideshowActive(true);
                      }
                    }}
                    disabled={images.length === 0}
                    className="px-2 py-1.5 text-[10px] font-gaming border border-white/10 text-gray-500 rounded
                      hover:border-neon-cyan/50 hover:text-neon-cyan transition-all
                      disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ▶ SLIDE
                  </button>
                </div>
              </div>

              {/* Mobile tabs */}
              <div className="md:hidden mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => { setActiveFolder(folder.id); setSearchQuery(""); setShowFavoritesOnly(false); }}
                    className={`shrink-0 px-3 py-1.5 text-xs font-gaming rounded-lg transition-all whitespace-nowrap
                      ${activeFolder === folder.id
                        ? "bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan"
                        : "bg-dark-100 border border-white/5 text-gray-400 hover:border-white/20"
                      }`}
                  >
                    {folder.name}
                  </button>
                ))}
              </div>

              {/* Batch action bar */}
              {selectedIds.size > 0 && (
                <div className="mb-4 flex items-center gap-3 px-4 py-2 bg-dark-200 border border-neon-cyan/20 rounded-lg animate-fade-in">
                  <span className="text-xs font-mono text-neon-cyan">{selectedIds.size} selected</span>
                  <div className="flex-1" />
                  {selectedIds.size === 1 && (
                    <button
                      onClick={() => {
                        const img = images.find((i) => selectedIds.has(i.id));
                        if (img) handleToggleFavorite(img.id);
                      }}
                      className="px-2 py-1 text-[10px] font-gaming border border-neon-yellow/30 text-neon-yellow rounded
                        hover:bg-neon-yellow/10 transition-all"
                    >
                      ★ TOGGLE FAV
                    </button>
                  )}
                  <button
                    onClick={handleBatchDelete}
                    disabled={deleteLoading}
                    className="px-3 py-1 text-[10px] font-gaming border border-neon-magenta/50 text-neon-magenta rounded
                      hover:bg-neon-magenta/10 transition-all disabled:opacity-30"
                  >
                    {deleteLoading ? "DELETING..." : "DELETE"}
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-2 py-1 text-[10px] font-gaming text-gray-500 hover:text-white transition-all"
                  >
                    CLEAR
                  </button>
                </div>
              )}

              {/* Image grid */}
              {imagesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-sm text-gray-500 font-mono">
                    {">{ "}{showFavoritesOnly ? "No favorites in this folder" : searchQuery ? `No images matching "${searchQuery}"` : "No images in this folder"}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    {showFavoritesOnly ? "Star images to add them to favorites" : searchQuery ? "Try a different search term" : "Upload some images to get started"}
                  </p>
                </div>
              ) : layoutMode === "detail" ? (
                <div className="space-y-1">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all
                        ${selectedIds.has(img.id)
                          ? "bg-neon-cyan/10 border border-neon-cyan/30"
                          : "hover:bg-white/5 border border-transparent"
                        }`}
                      onClick={() => handleSelect(img.id)}
                      onDoubleClick={() => {
                        const idx = images.findIndex((i) => i.id === img.id);
                        if (idx !== -1) { setViewerIndex(idx); setSlideshowActive(false); }
                      }}
                    >
                      <div className="w-10 h-10 rounded overflow-hidden bg-dark-200 shrink-0">
                        <img src={`/api/images/${img.id}/thumbnail?w=80`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate font-medium">{img.filename}</p>
                        <p className="text-[10px] text-gray-600 font-mono">
                          {img.width && img.height ? `${img.width}×${img.height} · ` : ""}
                          {img.size ? `${(img.size / 1024).toFixed(1)} KB` : ""}
                          {img.created_at ? ` · ${new Date(img.created_at).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(img.id); }}
                        className={`text-sm transition-all ${img.favorited ? "text-neon-yellow" : "text-gray-600 hover:text-gray-400"}`}
                      >
                        {img.favorited ? "★" : "☆"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`grid ${gridCols}`}>
                  {images.map((img) => (
                    <div key={img.id} className="relative group">
                      <ImageCard
                        id={img.id}
                        filename={img.filename}
                        storedPath={img.stored_path}
                        selected={selectedIds.has(img.id)}
                        onSelect={handleSelect}
                        onView={(id) => {
                          const idx = images.findIndex((i) => i.id === id);
                          if (idx !== -1) { setViewerIndex(idx); setSlideshowActive(false); }
                        }}
                      />
                      {/* Favorite star */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(img.id); }}
                        className={`absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full
                          transition-all duration-200 z-10 opacity-0 group-hover:opacity-100
                          ${img.favorited
                            ? "text-neon-yellow bg-dark/60 border border-neon-yellow/30"
                            : "text-gray-500 bg-dark/60 border border-white/10 hover:text-neon-yellow hover:border-neon-yellow/30"
                          }`}
                        title={img.favorited ? "Remove from favorites" : "Add to favorites"}
                      >
                        <span className="text-xs">{img.favorited ? "★" : "☆"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sentinel for infinite scroll */}
              <div
                ref={sentinelRef}
                className={`flex items-center justify-center py-8 ${activeFolder && !imagesLoading ? "" : "hidden"}`}
              >
                {loadingMore && (
                  <div className="flex items-center gap-3 text-gray-500">
                    <div className="w-5 h-5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono">LOADING MORE...</span>
                  </div>
                )}
                {!hasMore && totalImages > PAGE_SIZE && images.length > 0 && (
                  <p className="text-xs text-gray-600 font-mono">
                    {">"} All {totalImages} images loaded
                  </p>
                )}
              </div>

              {/* Mobile toolbar */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark/95 backdrop-blur-md border-t border-white/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 px-3 py-1.5 bg-dark-100 rounded border border-white/10 text-xs text-white
                      focus:border-neon-cyan focus:outline-none font-mono placeholder:text-gray-600"
                  />
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="px-2 py-1.5 bg-dark-100 border border-white/10 rounded text-[10px] text-gray-400 font-mono"
                  >
                    <option value="name">Name</option>
                    <option value="date">Date</option>
                    <option value="size">Size</option>
                    <option value="random">Random</option>
                  </select>
                  <button
                    onClick={() => {
                      if (images.length > 0) {
                        setViewerIndex(0);
                        setSlideshowActive(true);
                      }
                    }}
                    disabled={images.length === 0}
                    className="px-3 py-1.5 text-[10px] font-gaming border border-neon-cyan/30 text-neon-cyan rounded
                      disabled:opacity-30"
                  >
                    ▶ SLIDE
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showScan && (
        <UploadModal
          username={user}
          onClose={() => setShowScan(false)}
          onSuccess={handleScanSuccess}
        />
      )}

      {viewerIndex !== null && (
        <ImageViewer
          images={images.map((i) => ({
            id: i.id,
            filename: i.filename,
            width: i.width,
            height: i.height,
            size: i.size,
            created_at: i.created_at,
            stored_path: i.stored_path,
          }))}
          currentIndex={viewerIndex}
          onClose={() => { setViewerIndex(null); setSlideshowActive(false); }}
          onIndexChange={(idx) => setViewerIndex(idx)}
          slideshow={slideshowActive}
          slideshowInterval={3000}
          onSlideshowEnd={() => setSlideshowActive(false)}
        />
      )}
    </div>
  );
}
