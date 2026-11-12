"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import {
  Flame,
  RefreshCw,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  Clock,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

export default function KiosgamerCenterPage() {
  const { data: statusData, mutate: refreshStatus, isLoading } = useSWR(
    "/admin/kiosgamer/status",
    fetcher
  );

  const { data: games } = useSWR("/admin/games?limit=1000", fetcher);

  const [sessionKey, setSessionKey] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [showSessionKey, setShowSessionKey] = useState(false);
  const [showTotpSecret, setShowTotpSecret] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  // Auto-Sync SKU & Catalog states
  const [syncGameSlug, setSyncGameSlug] = useState<string>("free-fire");
  const [isSyncingSKU, setIsSyncingSKU] = useState(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [confirmSave, setConfirmSave] = useState(false);

  const handleFetchCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await api.get(`/admin/kiosgamer/catalog?game_slug=${syncGameSlug}`);
      setCatalogItems(res.data.data || []);
      setIsCatalogModalOpen(true);
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: "Gagal memuat katalog Kiosgamer: " + (err.response?.data?.message || err.message),
      });
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleAutoSyncSKU = async () => {
    // Find game ID from loaded games list
    const targetGame = games?.find(
      (g: any) =>
        g.slug.toLowerCase().includes(syncGameSlug) ||
        (syncGameSlug === "free-fire" && g.slug.toLowerCase().includes("free")) ||
        (syncGameSlug === "call-of-duty-mobile" &&
          (g.slug.toLowerCase().includes("cod") || g.slug.toLowerCase().includes("duty")))
    );

    if (!targetGame) {
      setActionMessage({
        type: "error",
        text: `Game ${syncGameSlug} belum terdaftar di database Anda. Silakan tambahkan game terlebih dahulu di menu Games.`,
      });
      return;
    }

    setIsSyncingSKU(true);
    setSyncResult(null);
    try {
      const res = await api.post("/admin/kiosgamer/sync-catalog", {
        game_id: targetGame.id,
        game_slug: syncGameSlug,
      });
      setSyncResult(res.data.data);
      setActionMessage({
        type: "success",
        text: res.data.message || "Auto-sync SKU Kiosgamer berhasil diselesaikan!",
      });
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: "Auto-sync SKU gagal: " + (err.response?.data?.message || err.message),
      });
    } finally {
      setIsSyncingSKU(false);
    }
  };

  const handleSaveCredentials = async () => {
    setConfirmSave(false);
    setIsSaving(true);
    setActionMessage(null);
    try {
      await api.post("/admin/kiosgamer/credentials", {
        session_key: sessionKey.trim(),
        totp_secret: totpSecret.trim(),
      });
      setActionMessage({
        type: "success",
        text: "Kredensial Kiosgamer berhasil disimpan dan dienkripsi dengan aman.",
      });
      setSessionKey("");
      setTotpSecret("");
      refreshStatus();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: "Gagal menyimpan kredensial: " + (err.response?.data?.message || err.message),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleHealthCheck = async () => {
    setIsChecking(true);
    setActionMessage(null);
    try {
      const res = await api.post("/admin/kiosgamer/health-check");
      const username = res.data.data?.oauth?.username || "Garena User";
      setActionMessage({
        type: "success",
        text: `Sesi Kiosgamer AKTIF! Terhubung sebagai ${username}.`,
      });
      refreshStatus();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: "Pengecekan sesi gagal: " + (err.response?.data?.message || err.message),
      });
      refreshStatus();
    } finally {
      setIsChecking(false);
    }
  };

  const handleRecoverSession = async () => {
    setIsRecovering(true);
    setActionMessage(null);
    try {
      await api.post("/admin/kiosgamer/recover");
      setActionMessage({
        type: "success",
        text: "Sesi Kiosgamer berhasil dipulihkan secara otomatis melalui SSO!",
      });
      refreshStatus();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: "Pemulihan sesi otomatis gagal: " + (err.response?.data?.message || err.message),
      });
      refreshStatus();
    } finally {
      setIsRecovering(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatUnixExpiry = (expiryUnix?: number) => {
    if (!expiryUnix || expiryUnix <= 0) return "-";
    const date = new Date(expiryUnix * 1000);
    const now = new Date();
    const isExpired = date < now;
    return `${date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    })} ${isExpired ? "(Sudah Kadaluarsa)" : ""}`;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Sesi Aktif (Terkoneksi)
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            Sesi Kadaluarsa
          </span>
        );
      case "REAUTH_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <AlertCircle className="w-4 h-4" />
            Perlu Re-Otentikasi Manual
          </span>
        );
      case "CHALLENGE_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <ShieldCheck className="w-4 h-4" />
            Perlu Verifikasi Bot / Challenge
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-400">
            <HelpCircle className="w-4 h-4" />
            Belum Dikonfigurasi
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white">Kiosgamer Command Center</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kelola otentikasi sesi Kiosgamer (Garena), pemulihan SSO otomatis, dan multi-provider routing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/nominals"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors"
          >
            <span>Alokasi Produk di Nominals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-lg ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            )}
            <span className="font-medium leading-relaxed">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status & Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Status & Account Info Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status Koneksi Sesi
              </span>
              <div className="mt-1.5">{getStatusBadge(statusData?.status)}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleHealthCheck}
                disabled={isChecking || isLoading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
                <span>{isChecking ? "Memeriksa..." : "Cek Sesi"}</span>
              </button>

              <button
                onClick={handleRecoverSession}
                disabled={isRecovering || isLoading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all disabled:opacity-50"
                title="Pulihkan sesi otomatis menggunakan Garena SSO"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isRecovering ? "Memulihkan..." : "Pulihkan SSO"}</span>
              </button>
            </div>
          </div>

          {/* Account Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 block">Akun Garena / Username</span>
              <span className="font-bold text-white text-sm">
                {statusData?.username || "Belum terhubung"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 block">Account UID</span>
              <span className="font-bold text-amber-300 font-mono text-sm">
                {statusData?.uid || "-"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 block">TOTP 2FA Secret</span>
              <span className="font-bold text-indigo-300 text-sm">
                {statusData?.has_totp_secret ? "Terpasang & Terenkripsi" : "Belum dipasang"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 block">Masa Berlaku OAuth</span>
              <span className="font-medium text-slate-300">
                {formatUnixExpiry(statusData?.oauth_expiry_time)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 block">Terakhir Dicek</span>
              <span className="font-medium text-slate-300">
                {formatDate(statusData?.last_checked_at)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 block">Terakhir Dipulihkan</span>
              <span className="font-medium text-slate-300">
                {formatDate(statusData?.last_recovered_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Info & Guide Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <HelpCircle className="w-4 h-4" />
              <span>Cara Kerja Sesi Kiosgamer</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Kiosgamer menggunakan otentikasi Cookie <code>session_key</code> Garena. Sistem ini
              dilengkapi dengan enkripsi AES-256 dan auto-recovery SSO untuk memperpanjang sesi secara otomatis tanpa login ulang manual berulang kali.
            </p>
            <ul className="space-y-2 text-[11px] text-slate-300 pt-1">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Session Key:</strong> Cookie sesi dari browser setelah login ke Kiosgamer.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>TOTP Secret:</strong> Secret key 2FA Google Authenticator akun Garena Anda (opsional untuk auto-login).</span>
              </li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 text-[11px]">
            Semua transaksi dengan nominal yang dialihkan ke Kiosgamer akan dieksekusi secara instan.
          </div>
        </div>
      </div>

      {/* Update Credentials Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-400" />
            Konfigurasi & Perbarui Kredensial Kiosgamer
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Kredensial akan dienkripsi dengan standar AES-GCM di database backend sebelum disimpan.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmSave(true);
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Session Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium">Session Key (Cookie) *</label>
                <button
                  type="button"
                  onClick={() => setShowSessionKey(!showSessionKey)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  {showSessionKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showSessionKey ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Masukkan nilai session_key dari cookie Kiosgamer..."
                value={sessionKey}
                onChange={(e) => setSessionKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
              />
            </div>

            {/* TOTP Secret Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium">
                  Secret Key TOTP / 2FA (Opsional)
                </label>
                <button
                  type="button"
                  onClick={() => setShowTotpSecret(!showTotpSecret)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  {showTotpSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showTotpSecret ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
              <input
                type={showTotpSecret ? "text" : "password"}
                placeholder="Contoh: JBSWY3DPEHPK3PXP"
                value={totpSecret}
                onChange={(e) => setTotpSecret(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs uppercase"
              />
              <span className="text-[10px] text-slate-500 block">
                Format Base32 tanpa spasi. Digunakan untuk menghasilkan kode 2FA secara otomatis saat dibutuhkan.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving || (!sessionKey.trim() && !totpSecret.trim())}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Kredensial Kiosgamer"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Auto-Sync SKU & Catalog Management Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Auto-Sync SKU & Katalog Produk Kiosgamer
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ambil daftar SKU produk resmi dari server Kiosgamer dan hubungkan otomatis ke nominal website Anda.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFetchCatalog}
              disabled={isLoadingCatalog}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isLoadingCatalog ? "Memuat..." : "Lihat Katalog Kiosgamer"}</span>
            </button>

            <button
              type="button"
              onClick={handleAutoSyncSKU}
              disabled={isSyncingSKU}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSKU ? "animate-spin" : ""}`} />
              <span>{isSyncingSKU ? "Menyinkronkan..." : "Sinkronkan SKU Otomatis"}</span>
            </button>
          </div>
        </div>

        {/* Game Target Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Pilih Game yang Didukung Kiosgamer
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSyncGameSlug("free-fire")}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  syncGameSlug === "free-fire"
                    ? "bg-amber-500/10 border-amber-500 text-amber-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <span className="text-xs">Free Fire</span>
                <span className="text-[10px] text-slate-400">App ID: 100067</span>
              </button>

              <button
                type="button"
                onClick={() => setSyncGameSlug("call-of-duty-mobile")}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  syncGameSlug === "call-of-duty-mobile"
                    ? "bg-amber-500/10 border-amber-500 text-amber-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <span className="text-xs">Call of Duty Mobile</span>
                <span className="text-[10px] text-slate-400">App ID: 100082</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-2 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Keamanan & Validasi Otomatis:</span>
            </div>
            <p className="leading-relaxed">
              Game non-Garena (seperti Mobile Legends, PUBG, dll.) akan <strong>otomatis ditolak / fallback</strong> ke provider lama saat pemindahan provider, sehingga saldo dan transaksi tetap 100% aman.
            </p>
          </div>
        </div>

        {/* Sync Result Box if any */}
        {syncResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{syncResult.message}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {syncResult.matched_count} dari {syncResult.total_nominals} Berhasil Dimapping
              </span>
            </div>

            {syncResult.matched_items && syncResult.matched_items.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-300 block">
                  Produk yang Berhasil Dihubungkan:
                </span>
                <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-emerald-300/90 font-mono pr-1 custom-scrollbar">
                  {syncResult.matched_items.map((m: string, idx: number) => (
                    <div key={idx} className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/10">
                      ✓ {m}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {syncResult.unmatched_items && syncResult.unmatched_items.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Produk Tanpa SKU di Kiosgamer (Tetap di Provider Lama):
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] text-amber-300/80 font-mono pr-1 custom-scrollbar">
                  {syncResult.unmatched_items.map((u: string, idx: number) => (
                    <div key={idx} className="p-1.5 rounded bg-amber-950/20 border border-amber-500/10">
                      • {u}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Katalog Resmi Kiosgamer */}
      {isCatalogModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setIsCatalogModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Katalog Resmi Kiosgamer: {syncGameSlug === "free-fire" ? "Free Fire" : "Call of Duty Mobile"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Daftar item_id dan denominasi resmi yang tersedia langsung dari server Kiosgamer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCatalogModalOpen(false)}
                className="text-slate-400 hover:text-white text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto pr-1 space-y-2 text-xs custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {catalogItems?.map((it: any) => (
                  <div
                    key={it.item_id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{it.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                        <span>SKU ID: <strong className="text-amber-300 font-mono">{it.item_id}</strong></span>
                        <span>•</span>
                        <span className="text-slate-400">Tipe: {it.item_type}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>{it.garena_shell} Shell</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        ≈ Rp {it.price_idr?.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={handleSaveCredentials}
        title="Simpan Kredensial Kiosgamer?"
        message={
          <>
            Kredensial sesi dan 2FA secret baru akan disimpan dan langsung digunakan oleh sistem
            untuk memproses pesanan melalui provider Kiosgamer.
          </>
        }
        confirmText="Ya, Simpan Kredensial"
        cancelText="Batal"
        variant="primary"
        isLoading={isSaving}
      />
    </div>
  );
}
