import { NextRequest, NextResponse } from "next/server";
import { getDb, uuidv4 } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare("SELECT id, username FROM users WHERE username = ?").get(username) as { id: string; username: string } | undefined;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const sessionId = uuidv4();
    db.prepare("INSERT INTO sessions (id, username) VALUES (?, ?)").run(sessionId, user.username);

    const cookieStore = await cookies();
    cookieStore.set("session_id", sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 86400 * 7,
    });

    return NextResponse.json({ username: user.username, sessionId });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (!sessionId) {
    return NextResponse.json({ user: null });
  }

  const db = getDb();
  const session = db.prepare("SELECT username FROM sessions WHERE id = ?").get(sessionId) as { username: string } | undefined;

  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: { username: session.username } });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set("session_id", "", { httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 0 });
  return NextResponse.json({ success: true });
}
