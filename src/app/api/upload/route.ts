import { NextRequest, NextResponse } from "next/server";
import { getDb, uuidv4 } from "@/lib/db";
import fs from "fs";
import path from "path";
import sizeOf from "image-size";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]);

function scanImages(dirPath: string, recursive: boolean): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (recursive) results.push(...scanImages(fullPath, true));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch { }
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const { username, dirPath, recursive = true } = await req.json();

    if (!username || !dirPath) {
      return NextResponse.json({ error: "username and dirPath required" }, { status: 400 });
    }

    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ error: "Directory not found" }, { status: 404 });
    }

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
    }

    const files = scanImages(dirPath, recursive);
    if (files.length === 0) {
      return NextResponse.json({ error: "No images found in directory" }, { status: 404 });
    }

    const folderName = path.basename(dirPath);

    const db = getDb();
    const existingFolder = db.prepare(
      "SELECT id FROM folders WHERE username = ? AND name = ?"
    ).get(username, folderName) as { id: string } | undefined;

    let folderId: string;
    if (existingFolder) {
      folderId = existingFolder.id;
      db.prepare("DELETE FROM images WHERE folder_id = ?").run(folderId);
    } else {
      folderId = uuidv4();
      db.prepare("INSERT INTO folders (id, username, name) VALUES (?, ?, ?)").run(folderId, username, folderName);
    }

    const insertImage = db.prepare(
      "INSERT INTO images (id, folder_id, filename, stored_path, size, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    let savedCount = 0;
    for (const filePath of files) {
      const imageId = uuidv4();
      const filename = path.basename(filePath);
      const size = fs.statSync(filePath).size;
      let width = 0, height = 0;
      try {
        const buf = fs.readFileSync(filePath);
        const dim = sizeOf(buf);
        width = dim.width ?? 0;
        height = dim.height ?? 0;
      } catch {}

      insertImage.run(imageId, folderId, filename, filePath, size, width, height);
      savedCount++;
    }

    db.prepare("UPDATE folders SET image_count = ? WHERE id = ?").run(savedCount, folderId);

    return NextResponse.json({ folderId, folderName, imageCount: savedCount });
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
