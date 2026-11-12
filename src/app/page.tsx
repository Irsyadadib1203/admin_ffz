"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
  RefreshCw,
  ShieldCheck,
  ArrowUpRight,
  Radio,
  Filter,
} from "lucide-react";
import { api, API_BASE_URL } from "@/lib/api";
import Link from "next/link";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

export default function DashboardPage() {
  const { data: stats, mutate: refreshStats, isLoading: statsLoading } = useSWR(
    "/admin/dashboard/stats",
    fetcher,
    { refreshInterval: 15000 }
  );

  const [categoryFilter, setCategoryFilter] = useState<string>("Semua");
  const categoryFilterRef = useRef(categoryFilter);
  useEffect(() => {
    categoryFilterRef.current = categoryFilter;
  }, [categoryFilter]);

  // Initial load via REST (fetches 20 latest transactions matching active game filter); SSE handles live updates thereafter
  const swrKey = categoryFilter === "Semua"
    ? "/admin/dashboard/recent-transactions?limit=20"
    : `/admin/dashboard/recent-transactions?limit=20&game_name=${encodeURIComponent(categoryFilter)}`;

  const { data: initialTxs, mutate: refreshTxs } = useSWR(
    swrKey,
    fetcher,
    { refreshInterval: 0 }
  );

  const [liveTxs, setLiveTxs] = useState<any[] | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  // Load daftar game untuk dropdown filter kategori game (Free Fire, Mobile Legends, dll)
  const { data: games } = useSWR("/admin/games?limit=500", (u: string) =>
    api.get(u).then((r) => {
      const list = Array.isArray(r.data?.data) ? r.data.data : [];
      return [...list].sort((a: any, b: any) => String(a?.name || "").localeCompare(String(b?.name || "")));
    })
  );

  const formatDuration = (ms: number) => {
    if (!Number.isFinite(ms) || ms < 0) return "-";
    if (ms < 1000) return `${Math.floor(ms)} ms`;
    if (ms < 60000) return `${(Math.floor(ms / 10) / 100).toFixed(2)} s`;
    return `${(Math.floor(ms / 600) / 100).toFixed(2)} m`;
  };

  // Sama persis dengan perhitungan di Pusat Transaksi (/transactions)
  const calculateSpeed = (tx: any) => {
    if (!tx) return "-";
    const startTime = new Date(tx.payment_verified_at || tx.created_at).getTime();
    const endTime = tx.completed_at
      ? new Date(tx.completed_at).getTime()
      : tx.status === "success" || tx.status === "failed" || tx.status === "refunded"
      ? new Date(tx.updated_at).getTime()
      : (tx.status === "processing" || tx.status === "pending" ? Date.now() : null);

    if (!startTime || !endTime || endTime < startTime) return "-";
    return formatDuration(endTime - startTime);
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Data transaksi terbaru yang sudah otomatis difilter 20 teratas dari database sesuai game
  const recentTxs = liveTxs ?? initialTxs ?? [];

  // Sync live state from SWR whenever initial fetch or game filter changes
  useEffect(() => {
    if (initialTxs) {
      setLiveTxs(initialTxs);
    }
  }, [initialTxs]);

  // SSE connection — real-time transaction push from backend.
  // Uses a reconnect loop with backoff so the live feed survives
  // server restarts or brief network hiccups without a page refresh.
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 2000; // start at 2 s, cap at 30 s
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      const token = localStorage.getItem("topup_admin_token");
      if (!token) {
        // Not logged in yet — retry in 2 s
        retryTimeout = setTimeout(connect, 2000);
        return;
      }

      const url = `${API_BASE_URL}/admin/dashboard/stream?token=${encodeURIComponent(token)}`;
      es = new EventSource(url);

      es.onopen = () => {
        setSseConnected(true);
        retryDelay = 2000; // reset backoff on successful connect
      };

      es.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          if (evt.type === "tx_update" && evt.payload) {
            const currentFilter = categoryFilterRef.current;
            const matchesFilter =
              currentFilter === "Semua" ||
              (evt.payload.game_name &&
                evt.payload.game_name.toLowerCase() === currentFilter.toLowerCase());

            if (matchesFilter) {
              setLiveTxs((prev) => {
                const base = prev ?? [];
                // Newest tx at top, deduplicate by id, max 20
                const updated = [
                  evt.payload,
                  ...base.filter((t: any) => t.id !== evt.payload.id),
                ];
                return updated.slice(0, 20);
              });
            }
          }
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        setSseConnected(false);
        es?.close();
        es = null;
        if (!destroyed) {
          // Exponential backoff reconnect (max 30 s)
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 1.5, 30000);
            connect();
          }, retryDelay);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      es?.close();
      setSseConnected(false);
    };
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Dashboard Performa
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau transaksi top-up game, integrasi Digiflazz H2H, dan statistik keuntungan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refreshStats();
              refreshTxs();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Segarkan Data
          </button>
          {/* SSE live connection indicator */}
          {sseConnected && (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <Radio className="w-3 h-3 animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Pendapatan</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-white">
              {statsLoading ? "Memuat..." : formatRupiah(stats?.total_revenue)}
            </h3>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <span>Hari ini: {formatRupiah(stats?.today_revenue)}</span>
            </p>
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Laba Bersih (Margin)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-white">
              {statsLoading ? "Memuat..." : formatRupiah(stats?.total_profit)}
            </h3>
            <p className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1 font-medium">
              <span>Laba Hari ini: {formatRupiah(stats?.today_profit)}</span>
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-white">
              {statsLoading ? "0" : (stats?.total_orders || 0).toLocaleString()}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-medium">
                {stats?.success_orders || 0} Sukses
              </span>
              <span>•</span>
              <span className="text-amber-400">{stats?.pending_orders || 0} Proses</span>
            </div>
          </div>
        </div>

        {/* Digiflazz Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Saldo Digiflazz Provider</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-amber-300">
              {statsLoading ? "Memuat..." : formatRupiah(stats?.digiflazz_balance)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Digunakan untuk fulfillment otomatis
            </p>
          </div>
        </div>
      </div>


      {/* Recent Live Transactions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Transaksi Terkini (Live Feed)
              {sseConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Transaksi top-up game yang baru saja diproses oleh engine
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Filter Kategori Game (Free Fire, Mobile Legends, dll) */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer max-w-[170px]"
                aria-label="Filter kategori game"
              >
                <option value="Semua" className="bg-slate-900 text-white">Semua Game</option>
                {games?.map((g: any) => (
                  <option key={g.id} value={g.name} className="bg-slate-900 text-white">
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <Link
              href="/transactions"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 whitespace-nowrap"
            >
              Lihat Semua &rarr;
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium pb-3">
                <th className="pb-3 pr-4">Invoice</th>
                <th className="pb-3 px-4">Harga</th>
                <th className="pb-3 px-4">Kategori</th>
                <th className="pb-3 px-4">Nominal</th>
                <th className="pb-3 px-4">Tanggal</th>
                <th className="pb-3 px-4">Speed</th>
                <th className="pb-3 pl-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentTxs && recentTxs.length > 0 ? (
                recentTxs.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-4 font-mono font-medium text-slate-200">
                      {tx.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      {formatRupiah(tx.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {tx.game_name || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {tx.nominal_name || "-"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {formatDateTime(tx.created_at)}
                    </td>
                    <td className="py-3.5 px-4 min-w-[100px] font-semibold text-slate-100 whitespace-nowrap">
                      {calculateSpeed(tx)}
                    </td>
                    <td className="py-3.5 pl-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          tx.status === "success"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : tx.status === "processing" || tx.status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {tx.status === "success" && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {tx.status === "processing" && <Clock className="w-3 h-3" />}
                        {tx.status === "failed" && <XCircle className="w-3 h-3" />}
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {categoryFilter !== "Semua" ? `Belum ada transaksi untuk game ${categoryFilter}.` : "Belum ada transaksi top-up terbaru."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
