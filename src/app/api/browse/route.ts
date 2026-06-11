import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dirPath = searchParams.get("path") || "";

  let targetPath: string;
  if (!dirPath) {
    if (process.platform === "win32") {
      const drives = [];
      for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i);
        try {
          if (fs.existsSync(letter + ":\\")) {
            drives.push(letter + ":\\");
          }
        } catch { }
      }
      return NextResponse.json({ type: "drives", items: drives });
    }
    targetPath = "/";
  } else {
    targetPath = dirPath;
  }

  try {
    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      const parent = path.dirname(targetPath);
      const name = path.basename(targetPath);
      const ext = path.extname(name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        return NextResponse.json({
          type: "file",
          name,
          path: targetPath,
          size: stat.size,
          ext,
        });
      }
      return NextResponse.json({ error: "Not a directory" }, { status: 400 });
    }

    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const folders: string[] = [];
    const images: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        folders.push(entry.name);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTS.has(ext)) {
          images.push(entry.name);
        }
      }
    }

    folders.sort((a, b) => a.localeCompare(b));
    images.sort((a, b) => a.localeCompare(b));

    const parent = path.dirname(targetPath);

    return NextResponse.json({
      type: "directory",
      path: targetPath,
      parent: parent !== targetPath ? parent : null,
      name: path.basename(targetPath),
      folders,
      images,
    });
  } catch {
    return NextResponse.json({ error: "Cannot read directory" }, { status: 404 });
  }
}
