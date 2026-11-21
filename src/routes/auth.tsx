import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

import { InfinityMark } from "@/components/infinity-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { isValidUsername, normalizeUsername, usernameToEmail } from "@/lib/username";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk Admin — Lyy'Tzy" },
      {
        name: "description",
        content: "Masuk ke panel admin Lyy'Tzy untuk mengelola tools dan tampilan web.",
      },
      { property: "og:title", content: "Masuk Admin — Lyy'Tzy" },
      {
        property: "og:description",
        content: "Masuk ke panel admin Lyy'Tzy untuk mengelola tools dan tampilan web.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [canRegister, setCanRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data }) => {
      const open = data === false;
      setCanRegister(open);
      if (open) setMode("register");
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uname = normalizeUsername(username);
    if (!isValidUsername(uname)) {
      toast.error("Username 3–20 karakter: huruf kecil, angka, titik, atau underscore.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: usernameToEmail(uname),
          password,
          options: { data: { username: uname } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Akun dibuat. Silakan masuk.");
          setMode("login");
          return;
        }
        toast.success("Akun admin berhasil dibuat!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: usernameToEmail(uname),
          password,
        });
        if (error) throw new Error("Username atau password salah.");
        toast.success(`Selamat datang, ${uname}!`);
      }
      void navigate({ to: "/admin" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(
        msg.includes("already registered")
          ? "Username sudah dipakai."
          : msg.toLowerCase().includes("weak")
            ? "Password terlalu mudah ditebak. Pakai kombinasi huruf, angka, dan simbol."
            : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full glow-soft opacity-50" />

      <div className="relative w-full max-w-sm animate-fade-up">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Beranda
        </Link>

        <div className="glass rounded-3xl p-6 shadow-card sm:p-8">
          <div className="flex flex-col items-center text-center">
            <InfinityMark className="h-14 w-28" detailed={false} />
            <h1 className="mt-4 font-display text-xl font-bold tracking-[0.15em]">
              <span className="text-gradient-neon">ADMIN</span> PANEL
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "register" ? "Buat akun admin pertama" : "Masuk untuk mengelola tools"}
            </p>
          </div>

          {canRegister && (
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-lg py-2 text-sm font-medium transition-[background-color,color] duration-300",
                    mode === m
                      ? "bg-background text-primary shadow-glow-cyan"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "login" ? "Masuk" : "Daftar"}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="lyytzy"
                  autoComplete="username"
                  autoCapitalize="none"
                  className="h-11 glass-field pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="h-11 glass-field px-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="neon" size="xl" className="w-full" disabled={busy}>
              <ShieldCheck />{" "}
              {busy ? "Memproses…" : mode === "register" ? "Buat Akun Admin" : "Masuk"}
            </Button>
          </form>

          {mode === "register" && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Akun pertama otomatis menjadi admin. Setelah itu pendaftaran ditutup.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
