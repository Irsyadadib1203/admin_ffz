"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function Setup2FAPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setEnabled(!!res.data.data.totp_enabled))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const start = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.post("/auth/2fa/setup");
      setSecret(res.data.data.secret);
    } catch (e: any) {
      setMsg(e.response?.data?.message || "Gagal membuat kunci");
    } finally {
      setLoading(false);
    }
  };

  const enable = async () => {
    setLoading(true);
    setMsg(null);
    try {
      await api.post("/auth/2fa/enable", { code });
      setEnabled(true);
      setSecret(null);
      setCode("");
      setTimeout(() => router.push("/"), 2000);
    } catch (e: any) {
      setMsg(e.response?.data?.message || "Kode salah");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const pretty = secret?.match(/.{1,4}/g)?.join(" ");

  if (checking) {
    return <p className="text-sm text-slate-400">Memuat...</p>;
  }

  return (
    <div className="max-w-md space-y-4 text-slate-200">
      <h1 className="text-lg font-bold">
        Verifikasi Dua Langkah (Google Authenticator)
      </h1>

      {enabled ? (
        <p className="text-emerald-400 text-sm">
          2FA aktif. Akun Anda dilindungi kode verifikasi saat login.
        </p>
      ) : !secret ? (
        <>
          <p className="text-sm text-slate-400">
            Akun admin wajib memakai verifikasi dua langkah.
          </p>
          <button
            onClick={start}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm disabled:opacity-50"
          >
            {loading ? "Membuat kunci..." : "Mulai Aktivasi"}
          </button>
        </>
      ) : (
        <>
          <ol className="text-sm text-slate-400 list-decimal pl-5 space-y-1">
            <li>
              Buka Google Authenticator, tekan <b>+</b>, pilih{" "}
              <b>Masukkan kunci penyiapan</b>.
            </li>
            <li>
              Isi nama akun bebas, masukkan kunci di bawah, jenis{" "}
              <b>Berbasis waktu</b>.
            </li>
            <li>Masukkan kode 6 digit yang muncul untuk konfirmasi.</li>
          </ol>

          <div className="font-mono text-xl tracking-widest bg-slate-900 border border-slate-800 rounded-xl p-4 text-center select-all">
            {pretty}
          </div>
          <button
            type="button"
            onClick={copySecret}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            {copied ? "Tersalin" : "Salin kunci"}
          </button>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Kode 6 digit"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-center tracking-[0.4em] focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={enable}
            disabled={code.length !== 6 || loading}
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm disabled:opacity-50"
          >
            {loading ? "Memverifikasi..." : "Aktifkan"}
          </button>
        </>
      )}

      {msg && <p className="text-rose-400 text-xs">{msg}</p>}
    </div>
  );
}