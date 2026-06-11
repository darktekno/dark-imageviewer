"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          router.push("/dashboard");
        } else {
          fetch("/api/users")
            .then((r) => r.json())
            .then((list) => setUsers(list.map((u: { username: string }) => u.username)))
            .finally(() => setLoading(false));
        }
      });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) return;

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError("User not found");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newUsername.trim()) return;

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername.trim() }),
    });

    if (res.ok) {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create user");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-hex">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-magenta/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 relative flex items-center justify-center">
              <div className="absolute inset-0 clip-hex rgb-gradient opacity-80 animate-spin-slow" />
              <div className="absolute inset-[3px] clip-hex bg-dark flex items-center justify-center">
                <span className="text-neon-cyan font-gaming font-bold text-2xl">D</span>
              </div>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-gaming font-black tracking-wider">
            <span className="rgb-text">DARK</span>
            <span className="text-white">VIEW</span>
          </h1>
          <p className="text-sm text-gray-500 font-mono mt-2">[ IMAGE VIEWER // v1.0.0 ]</p>
          <div className="flex justify-center gap-1 mt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{
                backgroundColor: ["#00f5ff", "#ff00ff", "#00ff41"][i],
                animation: `neonPulse 2s ease-in-out ${i * 0.5}s infinite`
              }} />
            ))}
          </div>
        </div>

        {!showCreate ? (
          <div className="bg-dark-200/80 backdrop-blur-md border border-white/10 rounded-xl p-8 shadow-2xl">
            <h2 className="font-gaming text-sm font-bold text-neon-cyan mb-4 tracking-wider">SIGN IN</h2>
            <form onSubmit={handleLogin}>
              <div className="relative mb-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full px-4 py-3 bg-dark rounded-lg border border-white/10 text-white text-sm
                    focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_15px_rgba(0,245,255,0.15)]
                    transition-all placeholder:text-gray-600 font-mono"
                  list="existing-users"
                  autoFocus
                />
                <datalist id="existing-users">
                  {users.map((u) => <option key={u} value={u} />)}
                </datalist>
              </div>
              {error && (
                <p className="text-xs text-neon-magenta font-mono mb-3 animate-fade-in">{">"} {error}</p>
              )}
              <button
                type="submit"
                className="w-full py-3 font-gaming font-bold text-sm rounded-lg rgb-gradient text-dark
                  hover:shadow-[0_0_25px_rgba(0,245,255,0.3)] transition-all duration-300 active:scale-[0.98]"
              >
                ENTER
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-xs text-gray-500 font-gaming mb-3">NO ACCOUNT?</p>
              <button
                onClick={() => setShowCreate(true)}
                className="w-full py-2.5 font-gaming font-bold text-sm rounded-lg border border-neon-magenta/50 text-neon-magenta
                  hover:bg-neon-magenta/10 hover:border-neon-magenta hover:shadow-[0_0_15px_rgba(255,0,255,0.2)]
                  transition-all duration-300 active:scale-[0.98]"
              >
                CREATE USER
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-dark-200/80 backdrop-blur-md border border-white/10 rounded-xl p-8 shadow-2xl">
            <h2 className="font-gaming text-sm font-bold text-neon-magenta mb-4 tracking-wider">NEW USER</h2>
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="w-full px-4 py-3 bg-dark rounded-lg border border-white/10 text-white text-sm
                    focus:border-neon-magenta focus:outline-none focus:shadow-[0_0_15px_rgba(255,0,255,0.15)]
                    transition-all placeholder:text-gray-600 font-mono"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-xs text-neon-magenta font-mono mb-3 animate-fade-in">{">"} {error}</p>
              )}
              <button
                type="submit"
                className="w-full py-3 font-gaming font-bold text-sm rounded-lg border border-neon-magenta/50 text-neon-magenta
                  hover:bg-neon-magenta/10 hover:shadow-[0_0_20px_rgba(255,0,255,0.2)]
                  transition-all duration-300 active:scale-[0.98]"
              >
                CREATE
              </button>
            </form>
            <button
              onClick={() => { setShowCreate(false); setError(""); }}
              className="w-full mt-3 py-2 text-xs text-gray-500 font-gaming hover:text-gray-300 transition-colors"
            >
              {"<"} BACK
            </button>
          </div>
        )}

        <p className="text-center mt-6 text-[10px] text-gray-700 font-mono">
          DARKVIEW v1.0 // SELECT YOUR USERNAME TO ENTER THE GRID
        </p>
      </div>
    </div>
  );
}
