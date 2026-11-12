"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  CircleDollarSign,
  Receipt,
  TrendingUp,
  Wallet,
  RefreshCw,
  Calendar,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Filter,
  Search,
  ExternalLink,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

type ProviderBreakdown = {
  provider_id: number;
  provider_name: string;
  provider_code: string;
  is_active: boolean;
  balance: number;
  balance_unit: string;
  balance_checked_at: string | null;
  total_spent: number;
  total_transactions: number;
  success_transactions: number;
  failed_transactions: number;
  total_revenue: number;
  total_profit: number;
  percentage: number;
};

type TransactionItem = {
  id: number;
  invoice_number: string;
  customer_id: string;
  server_id?: string;
  game_id: number;
  nominal_id: number;
  provider_id: number;
  base_price: number;
  selling_price: number;
  total_amount: number;
  profit: number;
  status: string;
  created_at: string;
  game?: { id: number; name: string };
  nominal?: { id: number; name: string };
  provider?: { id: number; name: string; code: string };
};

type FinanceSummary = {
  date: string;
  total_spent: number;
  total_transactions: number;
  success_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  total_revenue: number;
  total_profit: number;
  providers: ProviderBreakdown[];
  transactions: TransactionItem[];
};

export default function KeuanganPage() {
  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [checkingProviderId, setCheckingProviderId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Table filters
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data, mutate, isValidating } = useSWR<FinanceSummary>(
    `/admin/finance/summary?date=${selectedDate}`,
    fetcher,
    {
      refreshInterval: autoRefresh ? 12000 : 0, // poll realtime every 12 seconds
      revalidateOnFocus: true,
      onSuccess: () => setLastRefreshedAt(new Date()),
    }
  );
  const { data: currencies } = useSWR<{ code: string; rate_to_idr: number }[]>(
  "/admin/currencies",
  fetcher
);

const rateFor = (unit?: string) => {
  if (!unit || unit.toUpperCase() === "IDR") return 1;
  return (
    currencies?.find((c) => c.code.toUpperCase() === unit.toUpperCase())
      ?.rate_to_idr ?? 1
  );
};

  const sortedProviders = useMemo(() => {
  if (!data?.providers) return [];

  const list = data.providers.map((p) => {
    const rate = rateFor(p.balance_unit);
    return {
      ...p,
      rate,
      spent_idr: Math.round((p.total_spent ?? 0) * rate),
      balance_idr: Math.round((p.balance ?? 0) * rate),
    };
  });

  const total = list.reduce((s, p) => s + p.spent_idr, 0);

  return list
    .map((p) => ({
      ...p,
      percentage: total > 0 ? Math.round((p.spent_idr / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => {
      const diff = b.spent_idr - a.spent_idr;
      if (diff !== 0) return diff;
      const txDiff = (b.total_transactions ?? 0) - (a.total_transactions ?? 0);
      if (txDiff !== 0) return txDiff;
      return a.provider_name.localeCompare(b.provider_name);
    });
}, [data?.providers, currencies]);

const totalSpentIdr = sortedProviders.reduce((s, p) => s + p.spent_idr, 0);
const rateByProvider = (id: number) =>
  sortedProviders.find((p) => p.provider_id === id)?.rate ?? 1;

  const formatRupiah = (val?: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatBalance = (val?: number, unit?: string) => {
    if (unit?.toUpperCase() === "SHELL") {
      return `${(val || 0).toLocaleString("id-ID")} Shell`;
    }
    return formatRupiah(val);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const formatTimeOnly = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Trigger manual refresh for both stats and provider live balances
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    setNotice("");
    try {
      const res = await api.get(`/admin/finance/summary?date=${selectedDate}&realtime=true`);
      if (res.data?.data) {
        await mutate(res.data.data, false);
      } else {
        await mutate();
      }
      setLastRefreshedAt(new Date());
      setNotice("Data keuangan dan saldo semua provider berhasil diperbarui secara realtime!");
    } catch (err: any) {
      setNotice(err.response?.data?.message || "Gagal memperbarui saldo dan data keuangan.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh single provider balance
  const handleRefreshProvider = async (providerId: number) => {
    setCheckingProviderId(providerId);
    setNotice("");
    try {
      await api.get(`/admin/providers/${providerId}/balance`);
      await mutate();
      setLastRefreshedAt(new Date());
      setNotice("Saldo provider berhasil disinkronkan.");
    } catch (err: any) {
      setNotice(err.response?.data?.message || "Gagal memperbarui saldo provider.");
    } finally {
      setCheckingProviderId(null);
    }
  };

  // Color palette for provider badges and progress bars
  const providerColors = [
    { bg: "bg-indigo-500", text: "text-indigo-400", border: "border-indigo-500/30", fill: "bg-indigo-500/10" },
    { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30", fill: "bg-emerald-500/10" },
    { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30", fill: "bg-amber-500/10" },
    { bg: "bg-sky-500", text: "text-sky-400", border: "border-sky-500/30", fill: "bg-sky-500/10" },
    { bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500/30", fill: "bg-rose-500/10" },
  ];

  // Filtered transactions for the table
  const filteredTransactions = (data?.transactions || []).filter((tx) => {
    const matchProvider =
      selectedProviderFilter === "ALL" ||
      String(tx.provider_id) === selectedProviderFilter ||
      tx.provider?.code === selectedProviderFilter;

    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      tx.invoice_number.toLowerCase().includes(q) ||
      tx.customer_id.toLowerCase().includes(q) ||
      (tx.game?.name && tx.game.name.toLowerCase().includes(q)) ||
      (tx.nominal?.name && tx.nominal.name.toLowerCase().includes(q));

    return matchProvider && matchSearch;
  });

  const isToday = selectedDate === todayStr;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
              <CircleDollarSign className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">Rekapan Keuangan</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {isToday ? "Hari Ini" : selectedDate}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300 max-w-xl leading-relaxed">
                Rekapan penggunaan saldo provider, total transaksi harian, serta penjabaran modal per provider dengan pemantauan saldo real-time.
              </p>
            </div>
          </div>

          {/* Quick Date Selector */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                isToday
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(getYesterdayString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedDate === getYesterdayString()
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Kemarin
            </button>
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Realtime Status Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5 items-center justify-center">
            {autoRefresh && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                autoRefresh ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-slate-600"
              }`}
            ></span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">Monitoring Saldo Real-Time</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  autoRefresh
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {autoRefresh ? "● Realtime Aktif (12s)" : "Manual"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lastRefreshedAt
                ? `Terakhir diperbarui: ${lastRefreshedAt.toLocaleTimeString("id-ID")}`
                : "Memperbarui secara otomatis"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              autoRefresh
                ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                : "bg-emerald-950/40 border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/40"
            }`}
          >
            {autoRefresh ? "Jeda Auto-Sync" : "Nyalakan Auto-Sync"}
          </button>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing || isValidating}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-60 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || isValidating ? "animate-spin" : ""}`} />
            {isRefreshing ? "Menyinkronkan..." : "Refresh Saldo & Data Realtime"}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice("")} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 4 Main Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: TOTAL PENGGUNAAN SALDO (Highlight) */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="font-bold uppercase tracking-wider text-[11px]">
              Total Penggunaan Saldo {isToday ? "Hari Ini" : ""}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-400 tracking-tight">
              {formatRupiah(totalSpentIdr)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400 leading-tight">
              Modal provider yang terpotong untuk transaksi sukses
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-slate-400">
            <span>Provider Aktif:</span>
            <span className="font-bold text-white">
              {data?.providers?.filter((p) => p.is_active).length || 0} Provider
            </span>
          </div>
        </div>

        {/* Card 2: TOTAL TRANSAKSI */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[11px]">
                Total Transaksi {isToday ? "Hari Ini" : ""}
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-white tracking-tight">
                {(data?.total_transactions || 0).toLocaleString("id-ID")}{" "}
                <span className="text-sm font-semibold text-slate-400">Tx</span>
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                <span className="text-emerald-400 font-semibold">
                  {data?.success_transactions || 0} Sukses
                </span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">
                  {data?.pending_transactions || 0} Pending
                </span>
                <span>•</span>
                <span className="text-rose-400 font-semibold">
                  {data?.failed_transactions || 0} Gagal
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Success Rate:</span>
            <span className="font-bold text-emerald-400">
              {data?.total_transactions
                ? ((data.success_transactions / data.total_transactions) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
        </div>

        {/* Card 3: TOTAL OMZET PENJUALAN */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[11px]">
                Total Omzet Penjualan
              </span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-sky-400 tracking-tight">
                {formatRupiah(data?.total_revenue)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Total pembayaran diterima dari transaksi sukses
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Rata-rata/Tx:</span>
            <span className="font-bold text-slate-200">
              {data?.success_transactions
                ? formatRupiah((data.total_revenue || 0) / data.success_transactions)
                : "Rp 0"}
            </span>
          </div>
        </div>

        {/* Card 4: ESTIMASI KEUNTUNGAN / PROFIT */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[11px]">
                Estimasi Keuntungan (Profit)
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-purple-400 tracking-tight">
                {formatRupiah(data?.total_profit)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Selisih harga jual dengan modal saldo provider
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Profit Margin:</span>
            <span className="font-bold text-purple-400">
              {data?.total_revenue
                ? (((data.total_profit || 0) / data.total_revenue) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: PENJABARAN PENGGUNAAN SALDO PER PROVIDER */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">
                Penjabaran Penggunaan Saldo per Provider {isToday ? "Hari Ini" : ""}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Rincian modal yang terpotong di masing-masing provider dan sisa saldo live saat ini.
            </p>
          </div>
          <Link
            href="/providers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            Buka Providers Center <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Visual Share Bar (Stacked Progress) */}
        {data && totalSpentIdr > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Distribusi Penggunaan Saldo:</span>
              <span className="font-mono text-emerald-400 font-bold">
                Total: {formatRupiah(totalSpentIdr)}
              </span>
            </div>
            <div className="h-4 w-full rounded-full bg-slate-950 p-0.5 overflow-hidden flex border border-slate-800">
              {sortedProviders.map((p, idx) => {
                if (p.percentage <= 0) return null;
                const col = providerColors[idx % providerColors.length];
                return (
                  <div
                    key={p.provider_id}
                    style={{ width: `${Math.max(p.percentage, 3)}%` }}
                    className={`${col.bg} h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                    title={`${p.provider_name}: ${formatRupiah(p.spent_idr)} (${p.percentage}%)`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Provider Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedProviders.map((provider, idx) => {
            const col = providerColors[idx % providerColors.length];
            const isChecking = checkingProviderId === provider.provider_id;

            return (
              <div
                key={provider.provider_id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div className="space-y-4">
                  {/* Provider Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${col.bg}`}></span>
                        <h3 className="font-bold text-white text-base">{provider.provider_name}</h3>
                      </div>
                      <p className="font-mono text-xs text-indigo-300 mt-0.5">{provider.provider_code}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                        provider.is_active
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-slate-700 bg-slate-800 text-slate-400"
                      }`}
                    >
                      {provider.is_active ? "AKTIF" : "NONAKTIF"}
                    </span>
                  </div>

                  {/* Penggunaan Saldo Box */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-300">
                      <span className="font-medium">Penggunaan Saldo Hari Ini:</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 font-bold text-[10px]">
                        {provider.percentage}%
                      </span>
                    </div>
                    <div className="text-xl font-black text-emerald-400">
                      {formatRupiah(provider.spent_idr)}
                    </div>
                    {provider.rate !== 1 && (
                      <p className="text-[10px] text-slate-500">
                        {(provider.total_spent ?? 0).toLocaleString("id-ID")} {provider.balance_unit} × {provider.rate}
                      </p>
                    )}
                    {/* Proportion bar */}
                    <div className="w-full h-1.5 rounded-full bg-emerald-950 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(provider.percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Sisa Saldo Provider Saat Ini (Real-time live) */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Zap className="h-3.5 w-3.5 text-indigo-400" />
                        Sisa Saldo Real-Time
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRefreshProvider(provider.provider_id)}
                        disabled={isChecking}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
                        title="Perbarui Saldo Provider Ini"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin text-indigo-400" : ""}`} />
                      </button>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-black text-white">
                        {formatRupiah(provider.balance_idr)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {provider.balance_checked_at ? formatDate(provider.balance_checked_at) : "Belum dicek"}
                      </span>
                    </div>
                    {provider.rate !== 1 && (
                      <p className="text-[10px] text-slate-500">
                        {formatBalance(provider.balance, provider.balance_unit)} × {provider.rate}
                      </p>
                    )}
                  </div>

                  {/* Rincian Transaksi */}
                  <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                    <div className="flex items-center justify-between">
                      <span>Total Transaksi:</span>
                      <span className="font-semibold text-slate-200">
                        {provider.total_transactions} Transaksi
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Transaksi Sukses:</span>
                      <span className="font-semibold text-emerald-400">
                        {provider.success_transactions} Sukses
                      </span>
                    </div>
                    {provider.failed_transactions > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Transaksi Gagal:</span>
                        <span className="font-semibold text-rose-400">
                          {provider.failed_transactions} Gagal
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <span>Omzet Penjualan:</span>
                      <span className="font-semibold text-sky-300">
                        {formatRupiah(provider.total_revenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Profit Provider:</span>
                      <span className="font-semibold text-purple-300">
                        {formatRupiah(provider.total_profit)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedProviderFilter(String(provider.provider_id))}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Lihat Transaksi Provider →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION: RINCIAN DAFTAR TRANSAKSI HARI INI */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              Daftar Transaksi & Penggunaan Saldo {isToday ? "Hari Ini" : selectedDate}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Transaksi yang memotong saldo provider pada tanggal yang dipilih.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari Invoice, User ID, Game..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter Pills per Provider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs custom-scrollbar">
          <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 shrink-0">
            <Filter className="h-3 w-3" /> Filter Provider:
          </span>
          <button
            type="button"
            onClick={() => setSelectedProviderFilter("ALL")}
            className={`px-3 py-1 rounded-xl font-semibold transition shrink-0 ${
              selectedProviderFilter === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-750"
            }`}
          >
            Semua ({data?.transactions?.length || 0})
          </button>
          {sortedProviders.map((p) => {
            const count = (data?.transactions || []).filter(
              (t) => t.provider_id === p.provider_id || t.provider?.code === p.provider_code
            ).length;
            const isSel = selectedProviderFilter === String(p.provider_id);
            return (
              <button
                key={p.provider_id}
                type="button"
                onClick={() => setSelectedProviderFilter(String(p.provider_id))}
                className={`px-3 py-1 rounded-xl font-semibold transition shrink-0 ${
                  isSel ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-750"
                }`}
              >
                {p.provider_name} ({count})
              </button>
            );
          })}
        </div>

        {/* Transaction Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Game & Item</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Saldo Terpakai (Modal)</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-right">Profit</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada transaksi pada filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      {formatTimeOnly(tx.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/transactions?search=${tx.invoice_number}`}
                        className="font-mono font-semibold text-indigo-400 hover:underline"
                      >
                        {tx.invoice_number}
                      </Link>
                      <p className="text-[10px] text-slate-500 font-mono">{tx.customer_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white truncate max-w-[180px]">
                        {tx.game?.name || `Game #${tx.game_id}`}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {tx.nominal?.name || `Nominal #${tx.nominal_id}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {tx.provider?.name || tx.provider?.code || `ID ${tx.provider_id}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400 whitespace-nowrap">
                      {formatRupiah(Math.round(tx.base_price * rateByProvider(tx.provider_id)))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-200 whitespace-nowrap">
                      {formatRupiah(tx.total_amount || tx.selling_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-purple-400 whitespace-nowrap">
                      +{formatRupiah(tx.profit)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {tx.status === "success" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" /> Sukses
                        </span>
                      )}
                      {(tx.status === "pending" || tx.status === "processing") && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Clock className="h-3 w-3" /> {tx.status}
                        </span>
                      )}
                      {(tx.status === "failed" || tx.status === "refunded") && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <XCircle className="h-3 w-3" /> {tx.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
