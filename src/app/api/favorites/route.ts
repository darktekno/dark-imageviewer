import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { image_id, username } = await req.json();
  if (!image_id || !username) {
    return NextResponse.json({ error: "image_id and username required" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT image_id FROM favorites WHERE image_id = ? AND username = ?").get(image_id, username);

  if (existing) {
    db.prepare("DELETE FROM favorites WHERE image_id = ? AND username = ?").run(image_id, username);
    return NextResponse.json({ favorited: false });
  } else {
    db.prepare("INSERT INTO favorites (image_id, username) VALUES (?, ?)").run(image_id, username);
    return NextResponse.json({ favorited: true });
  }
}
