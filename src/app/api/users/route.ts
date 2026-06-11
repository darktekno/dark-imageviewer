import { NextRequest, NextResponse } from "next/server";
import { getDb, uuidv4 } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const users = db.prepare("SELECT username FROM users ORDER BY created_at DESC").all();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username || typeof username !== "string" || username.trim().length === 0) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const cleanUsername = username.trim();

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(cleanUsername);
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const id = uuidv4();
    db.prepare("INSERT INTO users (id, username) VALUES (?, ?)").run(id, cleanUsername);

    return NextResponse.json({ id, username: cleanUsername }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
