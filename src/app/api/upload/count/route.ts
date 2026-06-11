import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]);

interface CountResult {
  totalImages: number;
  totalFolders: number;
  immediateImages: number;
  immediateFolders: number;
}

function countRecursive(dirPath: string): CountResult {
  let totalImages = 0;
  let totalFolders = 1;
  let immediateImages = 0;
  let immediateFolders = 0;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        immediateFolders++;
        const sub = countRecursive(fullPath);
        totalImages += sub.totalImages;
        totalFolders += sub.totalFolders;
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTS.has(ext)) {
          totalImages++;
          immediateImages++;
        }
      }
    }
  } catch {}

  return { totalImages, totalFolders, immediateImages, immediateFolders };
}

export async function POST(req: NextRequest) {
  try {
    const { dirPath, recursive = true } = await req.json();

    if (!dirPath) {
      return NextResponse.json({ error: "dirPath required" }, { status: 400 });
    }

    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ error: "Directory not found" }, { status: 404 });
    }

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
    }

    const result = recursive ? countRecursive(dirPath) : (() => {
      const r: CountResult = { totalImages: 0, totalFolders: 1, immediateImages: 0, immediateFolders: 0 };
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            r.immediateFolders++;
            r.totalFolders++;
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTS.has(ext)) {
              r.totalImages++;
              r.immediateImages++;
            }
          }
        }
      } catch {}
      return r;
    })();

    return NextResponse.json(result);
  } catch (err) {
    console.error("Count error:", err);
    return NextResponse.json({ error: "Count failed" }, { status: 500 });
  }
}
