"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Zap,
  RefreshCw,
  Server,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Code2,
} from "lucide-react";
import { api, API_BASE_URL } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

export default function DigiflazzCenterPage() {
  const [activeTab, setActiveTab] = useState<"buyer" | "seller">("buyer");
  const [syncGameId, setSyncGameId] = useState<number>(1);
  const [brandFilter, setBrandFilter] = useState("");
  const [marginPercent, setMarginPercent] = useState<number>(8);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Confirm state
  const [confirmSync, setConfirmSync] = useState(false);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const { data: games } = useSWR("/admin/games?limit=1000", fetcher);
  const { data: balanceData, mutate: refreshBalance, isLoading: balanceLoading } = useSWR(
    "/admin/digiflazz/balance",
    fetcher
  );

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleSyncPrompt = () => {
    setConfirmSync(true);
  };

  const executeSync = async () => {
    setConfirmSync(false);
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.post("/admin/digiflazz/sync", {
        game_id: syncGameId,
        brand_filter: brandFilter,
        margin_percent: marginPercent,
      });
      setSyncResult(
        `Sukses! Berhasil mensinkronkan ${res.data.data.synced_count} produk dari Digiflazz.`
      );
    } catch (err: any) {
      setSyncResult(
        "Gagal sinkronisasi: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const selectedGameName = games?.find((g: any) => g.id === syncGameId)?.name || `Game ID #${syncGameId}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Digiflazz Command Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola integrasi Digiflazz Buyer (Beli) dan Digiflazz Seller H2H (Jual ke Mitra)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab("buyer")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "buyer"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Digiflazz Buyer (Beli)
          </button>
          <button
            onClick={() => setActiveTab("seller")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "seller"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Digiflazz Seller H2H (Jual)
          </button>
        </div>
      </div>

      {activeTab === "buyer" ? (
        /* =================== BUYER TAB =================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance & Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <span className="text-xs font-medium text-slate-400">
                Saldo Akun Digiflazz (Buyer)
              </span>
              <div className="mt-2 flex items-baseline gap-3">
                <h2 className="text-2xl font-bold text-amber-300">
                  {balanceLoading ? "Memuat..." : formatRupiah(balanceData?.balance)}
                </h2>
                <button
                  onClick={() => refreshBalance()}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Refresh Saldo"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Pastikan saldo selalu mencukupi agar pesanan pelanggan dapat diproses secara otomatis.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3 text-xs">
              <h4 className="font-semibold text-slate-200">Webhook Callback URL</h4>
              <p className="text-[11px] text-slate-400">
                Pasang URL ini pada pengaturan Webhook Akun Digiflazz Anda:
              </p>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300">
                <span className="truncate mr-2">
                  {API_BASE_URL.replace("/api/v1", "")}/api/v1/callback/digiflazz
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `${API_BASE_URL.replace("/api/v1", "")}/api/v1/callback/digiflazz`,
                      "buyer-webhook"
                    )
                  }
                  className="text-slate-400 hover:text-white"
                >
                  {copiedText === "buyer-webhook" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sync Catalog Form */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">
                Sinkronisasi Produk Otomatis (Price List Sync)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tarik daftar produk terbaru dari Digiflazz dan sesuaikan markup keuntungan secara otomatis.
              </p>
            </div>

            {syncResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  syncResult.startsWith("Sukses")
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                }`}
              >
                {syncResult.startsWith("Sukses") ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{syncResult}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Target Game di Website
                </label>
                <select
                  value={syncGameId}
                  onChange={(e) => setSyncGameId(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {games?.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Filter Brand Digiflazz (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: MOBILE LEGENDS"
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Markup Margin (%)
                </label>
                <input
                  type="number"
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSyncPrompt}
                disabled={syncing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sedang Mengambil Produk..." : "Tarik & Sinkronkan Produk"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =================== SELLER H2H TAB =================== */
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Digiflazz Seller Mode (Open API H2H)
                </h3>
                <p className="text-xs text-slate-400">
                  Website Anda kini berfungsi sebagai Supplier/Seller sehingga website top-up lain atau Digiflazz dapat membeli produk langsung ke sistem Anda.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-indigo-400 uppercase">
                  1. Format Endpoint H2H
                </span>
                <ul className="space-y-2 text-slate-300 font-mono text-[11px]">
                  <li className="flex justify-between">
                    <span className="text-slate-400">Pricelist:</span>
                    <span className="text-emerald-400">POST /api/v1/h2h/price-list</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-400">Order:</span>
                    <span className="text-emerald-400">POST /api/v1/h2h/transaction</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-400">POST /api/v1/h2h/check-status</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-400">Saldo:</span>
                    <span className="text-emerald-400">POST /api/v1/h2h/check-balance</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-amber-400 uppercase">
                  2. Aturan Keamanan H2H
                </span>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li>• Request WAJIB dari IP yang telah terdaftar di <strong>IP Whitelist</strong>.</li>
                  <li>• Menggunakan otentikasi API Key & Secret Mitra.</li>
                  <li>• Signature Order: <code className="text-indigo-300 font-mono bg-slate-900 px-1 py-0.5 rounded">md5(username + secret + ref_id)</code></li>
                  <li>• Saldo deposit mitra akan dipotong otomatis per transaksi sukses.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sample JSON Payload Showcase */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-bold text-white">
                Contoh Payload Permintaan H2H (Order Request)
              </h4>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
{`{
  "username": "top_abc123xyz...",
  "buyer_sku_code": "MLBB_86",
  "customer_no": "12345678(1234)",
  "ref_id": "MITRA-INV-998811",
  "sign": "5d41402abc4b2a76b9719d911017c592",
  "testing": false,
  "callback_url": "https://mitra-domain.com/webhook"
}`}
            </pre>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Sync Digiflazz */}
      <ConfirmModal
        isOpen={confirmSync}
        onClose={() => setConfirmSync(false)}
        onConfirm={executeSync}
        title="Mulai Sinkronisasi Produk Digiflazz?"
        message={
          <>
            Sistem akan mengambil katalog produk dari Digiflazz untuk target game{" "}
            <strong className="text-white font-semibold">{selectedGameName}</strong> dengan margin markup{" "}
            <strong className="text-emerald-400 font-bold">{marginPercent}%</strong>.
            <br />
            <span className="text-slate-400 text-[11px] mt-1 block">
              Harga dasar dan harga jual multi-tier akan diperbarui secara otomatis.
            </span>
          </>
        }
        confirmText="Ya, Mulai Sinkronkan"
        cancelText="Batal"
        variant="primary"
        isLoading={syncing}
      />
    </div>
  );
}
