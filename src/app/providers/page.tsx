"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  RefreshCw,
  Save,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

type ProviderItem = {
  id: number;
  name: string;
  code: string;
  base_url: string;
  is_active: boolean;
  api_key_configured: boolean;
  balance?: number;
  balance_unit?: string;
  balance_checked_at?: string | null;
};

type Reference = {
  invoice_template: string;
  ref_id_template: string;
  tokens: string[];
};

type FFZSettings = {
  configured: boolean;
  name: string;
  base_url: string;
  is_active: boolean;
  api_key_configured: boolean;
};

type DigiflazzSettings = {
  configured: boolean;
  id?: number;
  name: string;
  base_url: string;
  username: string;
  is_active: boolean;
  api_key_configured: boolean;
  secret_configured?: boolean;
};


type VocaSettings = {
  configured: boolean;
  name: string;
  base_url: string;
  merchant_id: string;
  is_active: boolean;
  secret_key_configured: boolean;
  callback_key_configured: boolean;
};


type OnoystoreSettings = {
  configured: boolean;
  name: string;
  base_url: string;
  is_active: boolean;
  api_key_configured: boolean;
};

type TopupKuySettings = {
  configured: boolean;
  name: string;
  base_url: string;
  is_active: boolean;
  api_key_configured: boolean;
};

export default function ProvidersPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const { data: providers, mutate } = useSWR<ProviderItem[]>(
    "/admin/providers",
    fetcher,
    {
      refreshInterval: autoRefresh ? 10000 : 0,
      onSuccess: () => setLastRefreshedAt(new Date()),
    }
  );
  const sortedProviders = useMemo(() => {
    if (!providers) return [];
    const isShell = (p: ProviderItem) => p.balance_unit?.toUpperCase() === "SHELL";
    return [...providers].sort((a, b) => {
      // Provider ber-satuan Shell (Kiosgamer) tidak sebanding dengan Rupiah,
      // jadi ditaruh paling bawah dan diurutkan di antara sesamanya.
      const unitDiff = Number(isShell(a)) - Number(isShell(b));
      if (unitDiff !== 0) return unitDiff;
      const diff = (b.balance ?? 0) - (a.balance ?? 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, [providers]);
  const { data: refData, mutate: mutateReference } = useSWR<Reference>(
    "/admin/settings/transaction-reference",
    fetcher
  );

  const [reference, setReference] = useState<Reference>({
    invoice_template: "",
    ref_id_template: "",
    tokens: [],
  });
  const [selected, setSelected] = useState<ProviderItem | null>(null);

  // Common Form States
  const [name, setName] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const [apiKey, setAPIKey] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [referenceSaveResult, setReferenceSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // FFZStore State
  const [ffz, setFFZ] = useState<FFZSettings | null>(null);

  // Digiflazz State
  const [digi, setDigi] = useState<DigiflazzSettings | null>(null);
  const [digiUsername, setDigiUsername] = useState("");
  const [digiSecret, setDigiSecret] = useState("");

  // Voca State
const [voca, setVoca] = useState<VocaSettings | null>(null);
const [vocaMerchantId, setVocaMerchantId] = useState("");
const [vocaSecretKey, setVocaSecretKey] = useState("");
const [vocaCallbackKey, setVocaCallbackKey] = useState("");

  // Onoystore State
  const [onoystore, setOnoystore] = useState<OnoystoreSettings | null>(null);

  // TopupKuy State
  const [topupkuy, setTopupkuy] = useState<TopupKuySettings | null>(null);

  // Per-card balance loading indicator
  const [checkingBalanceId, setCheckingBalanceId] = useState<number | null>(null);

  const refreshAllBalances = async () => {
    setIsRefreshingAll(true);
    setNotice("");
    try {
      const res = await api.post("/admin/providers/refresh-balances");
      if (res.data?.data) {
        await mutate(res.data.data, false);
      } else {
        await mutate();
      }
      setLastRefreshedAt(new Date());
      setNotice("Saldo seluruh provider berhasil diperbarui secara realtime!");
    } catch (err: any) {
      setNotice(err.response?.data?.message || "Gagal memperbarui saldo provider.");
    } finally {
      setIsRefreshingAll(false);
    }
  };

  useEffect(() => {
    if (refData) setReference(refData);
  }, [refData]);

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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

  const formatUnixExpiry = (expiryUnix?: number) => {
    if (!expiryUnix || expiryUnix <= 0) return "-";
    const date = new Date(expiryUnix * 1000);
    const now = new Date();
    const isExpired = date < now;
    return `${date.toLocaleString("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
    })} ${isExpired ? "(Kadaluarsa)" : ""}`;
  };

  const refreshProviderBalance = async (id: number) => {
    setCheckingBalanceId(id);
    setNotice("");
    try {
      const res = await api.get(`/admin/providers/${id}/balance`);
      await mutate();
      setNotice(`Saldo ${res.data.data?.name || "provider"} berhasil diperbarui.`);
    } catch (err: any) {
      setNotice(err.response?.data?.message || "Gagal memperbarui saldo provider.");
    } finally {
      setCheckingBalanceId(null);
    }
  };

  const saveReference = async () => {
    setSaving(true);
    setNotice("");
    setReferenceSaveResult(null);
    try {
      const res = await api.put("/admin/settings/transaction-reference", reference);
      // Merge response with existing tokens so the token chip list is never undefined
      const saved = res.data.data;
      await mutateReference(
        { ...saved, tokens: saved.tokens ?? reference.tokens ?? [] },
        false
      );
      setReference((current) => ({ ...current, invoice_template: saved.invoice_template, ref_id_template: saved.ref_id_template, tokens: saved.tokens ?? current.tokens }));
      setNotice("Format invoice dan ref ID global tersimpan.");
      setReferenceSaveResult({ success: true, message: "Format invoice dan Ref ID global berhasil disimpan." });
    } catch (error: any) {
      const message = error.response?.data?.message || "Gagal menyimpan format global.";
      setNotice(message);
      setReferenceSaveResult({ success: false, message });
    } finally {
      setSaving(false);
    }
  };

  const openManage = async (item: ProviderItem) => {
    setSelected(item);
    setNotice("");
    setAPIKey("");
    setDigiSecret("");
    setOnoystore(null);
    setTopupkuy(null);
    setVoca(null);
    setVocaSecretKey("");
    setVocaCallbackKey("");
    setFFZ(null);
    setDigi(null);
    setName(item.name);
    setBaseURL(item.base_url);
    setIsActive(item.is_active);

    const code = item.code.toUpperCase();
    if (code === "FFZSTORE") {
      try {
        const res = await api.get("/admin/providers/ffzstore");
        const data: FFZSettings = res.data.data;
        setFFZ(data);
        setName(data.name);
        setBaseURL(data.base_url);
        setIsActive(data.is_active);
      } catch {
        // fallback
      }
    } else if (code === "DIGIFLAZZ") {
      try {
        const res = await api.get("/admin/providers/digiflazz");
        const data: DigiflazzSettings = res.data.data;
        setDigi(data);
        setName(data.name);
        setBaseURL(data.base_url);
        setDigiUsername(data.username || "");
        setIsActive(data.is_active);
      } catch {
        // fallback
      }
      } else if (code === "ONOYSTORE") {
      try {
        const res = await api.get("/admin/providers/onoystore");
        const data: OnoystoreSettings = res.data.data;
        setOnoystore(data);
        setName(data.name);
        setBaseURL(data.base_url);
        setIsActive(data.is_active);
      } catch {
        // fallback
      }
    } else if (code === "TOPUPKUY") {
      try {
        const res = await api.get("/admin/providers/topupkuy");
        const data: TopupKuySettings = res.data.data;
        setTopupkuy(data);
        setName(data.name);
        setBaseURL(data.base_url);
        setIsActive(data.is_active);
      } catch {
        // fallback
      }
      } else if (code === "VOCA") {
      try {
        const res = await api.get("/admin/providers/voca");
        const data: VocaSettings = res.data.data;
        setVoca(data);
        setName(data.name);
        setBaseURL(data.base_url);
        setVocaMerchantId(data.merchant_id || "");
        setIsActive(data.is_active);
      } catch {
        // fallback
      }
    } 
  };

  const saveFFZ = async () => {
    setSaving(true);
    setNotice("");
    try {
      await api.put("/admin/providers/ffzstore", {
        name,
        base_url: baseURL,
        api_key: apiKey,
        is_active: isActive,
      });
      setAPIKey("");
      await mutate();
      setNotice("Konfigurasi FFZStore tersimpan.");
    } catch (error: any) {
      setNotice(error.response?.data?.message || "Gagal menyimpan FFZStore.");
    } finally {
      setSaving(false);
    }
  };

  const saveDigiflazz = async () => {
    setSaving(true);
    setNotice("");
    try {
      await api.put("/admin/providers/digiflazz", {
        name,
        base_url: baseURL,
        username: digiUsername,
        api_key: apiKey,
        secret: digiSecret,
        is_active: isActive,
      });
      setAPIKey("");
      setDigiSecret("");
      const fresh = await api.get("/admin/providers/digiflazz");
      setDigi(fresh.data.data);
      await mutate();
      setNotice("Konfigurasi Digiflazz tersimpan.");
    } catch (error: any) {
      setNotice(error.response?.data?.message || "Gagal menyimpan Digiflazz.");
    } finally {
      setSaving(false);
    }
  };

  const saveOnoystore = async () => {
    setSaving(true);
    setNotice("");
    try {
      await api.put("/admin/providers/onoystore", {
        name,
        base_url: baseURL,
        api_key: apiKey,
        is_active: isActive,
      });
      setAPIKey("");
      const fresh = await api.get("/admin/providers/onoystore");
      setOnoystore(fresh.data.data);
      await mutate();
      setNotice("Konfigurasi Onoystore tersimpan.");
    } catch (error: any) {
      setNotice(error.response?.data?.message || "Gagal menyimpan Onoystore.");
    } finally {
      setSaving(false);
    }
  };

  const saveTopupKuy = async () => {
    setSaving(true);
    setNotice("");
    try {
      await api.put("/admin/providers/topupkuy", {
        name,
        base_url: baseURL,
        api_key: apiKey,
        is_active: isActive,
      });
      setAPIKey("");
      const fresh = await api.get("/admin/providers/topupkuy");
      setTopupkuy(fresh.data.data);
      await mutate();
      setNotice("Konfigurasi TopupKuy tersimpan.");
    } catch (error: any) {
      setNotice(error.response?.data?.message || "Gagal menyimpan TopupKuy.");
    } finally {
      setSaving(false);
    }
  };

  const saveVoca = async () => {
    setSaving(true);
    setNotice("");
    try {
      await api.put("/admin/providers/voca", {
        name,
        base_url: baseURL,
        merchant_id: vocaMerchantId,
        secret_key: vocaSecretKey,
        callback_key: vocaCallbackKey,
        is_active: isActive,
      });
      setVocaSecretKey("");
      setVocaCallbackKey("");
      const fresh = await api.get("/admin/providers/voca");
      setVoca(fresh.data.data);
      await mutate();
      setNotice("Konfigurasi Voca tersimpan.");
    } catch (error: any) {
      setNotice(error.response?.data?.message || "Gagal menyimpan Voca.");
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5">
        <div className="flex gap-3">
          <Server className="h-5 w-5 text-indigo-300" />
          <div>
            <h1 className="text-xl font-bold text-white">Providers Center</h1>
            <p className="mt-1 text-sm text-slate-300">
              Kelola seluruh provider, pantau saldo real-time, dan atur kredensial masing-masing provider secara langsung melalui popup.
            </p>
          </div>
        </div>
      </div>

      {/* Global Invoice & Ref ID Format */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div>
          <h2 className="font-bold text-white">Format Invoice & Ref ID Global</h2>
          <p className="mt-1 text-xs text-slate-400">
            Berlaku untuk seluruh provider dan transaksi baru; tidak disimpan per provider.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-200">
            Template Invoice
            <input
              value={reference.invoice_template}
              onChange={(e) => setReference({ ...reference, invoice_template: e.target.value })}
              placeholder="INV-{date}-{random}"
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <label className="text-sm text-slate-200">
            Template Ref ID
            <input
              value={reference.ref_id_template}
              onChange={(e) => setReference({ ...reference, ref_id_template: e.target.value })}
              placeholder="REF-{timestamp}-{random}"
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {(reference.tokens ?? []).map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => navigator.clipboard.writeText(token)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-slate-300 hover:border-indigo-500"
            >
              <Copy className="h-3 w-3" />
              {token}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500"><code className="font-mono text-indigo-400">{"{seller_sku}"}</code> akan diganti dengan SKU Seller/H2H pada nominal transaksi.</p>
        <button
          onClick={saveReference}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          Simpan Format Global
        </button>
      </section>

      {referenceSaveResult && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={() => setReferenceSaveResult(null)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${referenceSaveResult.success ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-rose-500/30 bg-rose-500/10 text-rose-400"}`}>
                {referenceSaveResult.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              </div>
              <div><h3 className="text-base font-bold text-white">{referenceSaveResult.success ? "Format tersimpan" : "Format belum tersimpan"}</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">{referenceSaveResult.message}</p></div>
            </div>
            <div className="mt-5 flex justify-end"><button onClick={() => setReferenceSaveResult(null)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500">Tutup</button></div>
          </div>
        </div>, document.body
      )}

      {/* Realtime Saldo Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5 items-center justify-center">
            {autoRefresh && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${autoRefresh ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-slate-600"}`}></span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">Monitoring Saldo Provider Real-Time</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                autoRefresh ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}>
                {autoRefresh ? "● Realtime Aktif (Auto-Sync 10s)" : "Manual"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lastRefreshedAt
                ? `Terakhir diperbarui: ${lastRefreshedAt.toLocaleTimeString("id-ID")}`
                : "Saldo diperbarui otomatis secara berkala"}
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
            onClick={refreshAllBalances}
            disabled={isRefreshingAll}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-60 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingAll ? "animate-spin" : ""}`} />
            {isRefreshingAll ? "Mengecek Semua Saldo..." : "Refresh Semua Saldo Realtime"}
          </button>
        </div>
      </div>

      {/* Provider Cards with Balance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedProviders.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-white text-base">{item.name}</h2>
                  <p className="font-mono text-xs text-indigo-300">{item.code}</p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                    item.is_active
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700 bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.is_active ? "AKTIF" : "NONAKTIF"}
                </span>
              </div>

              {/* Saldo Box */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Wallet className="h-3.5 w-3.5 text-indigo-400" />
                    Saldo Provider
                  </span>
                  <button
                    onClick={() => refreshProviderBalance(item.id)}
                    disabled={checkingBalanceId === item.id}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
                    title="Cek Saldo Real-time"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        checkingBalanceId === item.id ? "animate-spin text-indigo-400" : ""
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black text-emerald-400">
                    {formatBalance(item.balance, item.balance_unit)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {item.balance_checked_at ? formatDate(item.balance_checked_at) : "Belum dicek"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Credential:</span>
                <span className={item.api_key_configured ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                  {item.api_key_configured ? "Terkonfigurasi" : "Belum diisi"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500 truncate max-w-[150px]">
                {item.base_url}
              </span>
              <button
                onClick={() => openManage(item)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Kelola
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Kelola Provider */}
      {selected &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-bold text-white text-lg">Kelola {selected.name}</h2>
                <p className="font-mono text-xs text-indigo-300">{selected.code}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notice Message */}
            {notice && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                <span>{notice}</span>
              </div>
            )}

            {/* DIGIFLAZZ MODAL CONTENT */}
            {selected.code.toUpperCase() === "DIGIFLAZZ" && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nama Provider</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Base URL Digiflazz</label>
                  <input
                    type="url"
                    value={baseURL}
                    onChange={(e) => setBaseURL(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Username Digiflazz</label>
                  <input
                    type="text"
                    value={digiUsername}
                    onChange={(e) => setDigiUsername(e.target.value)}
                    placeholder="Username akun buyer Digiflazz"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Production API Key Digiflazz{" "}
                    {digi?.api_key_configured && <span className="text-emerald-400">(sudah tersimpan)</span>}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setAPIKey(e.target.value)}
                      placeholder={
                        digi?.api_key_configured
                          ? "Kosongkan untuk mempertahankan API key saat ini"
                          : "Masukkan API key Digiflazz"
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 font-mono text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  
                <label className="block text-slate-300 font-medium mb-1">
                  Webhook Secret Digiflazz{" "}
                  {digi?.secret_configured && <span className="text-emerald-400">(sudah tersimpan)</span>}
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={digiSecret}
                    onChange={(e) => setDigiSecret(e.target.value)}
                    placeholder={
                      digi?.secret_configured
                        ? "Kosongkan untuk mempertahankan secret saat ini"
                        : "Masukkan secret webhook Digiflazz"
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 font-mono text-slate-100"
                  />
                </div>
              </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Aktifkan Provider Digiflazz</span>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <Link
                    href="/digiflazz"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Buka Digiflazz Center & Sinkronisasi <ExternalLink className="h-3 w-3" />
                  </Link>

                  <button
                    onClick={saveDigiflazz}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60 transition"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Menyimpan..." : "Simpan Digiflazz"}
                  </button>
                </div>
              </div>
            )}

            {/* FFZSTORE MODAL CONTENT */}
            {selected.code.toUpperCase() === "FFZSTORE" && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nama Provider</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Base URL FFZStore</label>
                  <input
                    type="url"
                    value={baseURL}
                    onChange={(e) => setBaseURL(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    API Key FFZStore{" "}
                    {ffz?.api_key_configured && <span className="text-emerald-400">(sudah tersimpan)</span>}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setAPIKey(e.target.value)}
                      placeholder={
                        ffz?.api_key_configured
                          ? "Kosongkan untuk mempertahankan API key saat ini"
                          : "Masukkan API key FFZStore"
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 font-mono text-slate-100"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Aktifkan FFZStore</span>
                </label>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={saveFFZ}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60 transition"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Menyimpan..." : "Simpan FFZStore"}
                  </button>
                </div>
              </div>
            )}

            {/* ONOYSTORE MODAL CONTENT */}
            {selected.code.toUpperCase() === "ONOYSTORE" && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nama Provider</label>
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Base URL Onoystore</label>
                  <input type="url" value={baseURL} onChange={(e) => setBaseURL(e.target.value)}
                    placeholder="https://api.onoystore.id/v1/public"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    API Key Onoystore{" "}
                    {onoystore?.api_key_configured && <span className="text-emerald-400">(sudah tersimpan)</span>}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input type="password" value={apiKey} onChange={(e) => setAPIKey(e.target.value)}
                      placeholder={onoystore?.api_key_configured ? "Kosongkan untuk mempertahankan API key saat ini" : "Masukkan API key Onoystore"}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 font-mono text-slate-100" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Signature callback Onoystore (X-Signature) divalidasi memakai API key di atas, jadi tidak perlu webhook secret terpisah.
                </p>
                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded text-indigo-600" />
                  <span>Aktifkan Onoystore</span>
                </label>
                <div className="flex justify-end pt-2">
                  <button onClick={saveOnoystore} disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60 transition">
                    <Save className="h-4 w-4" />
                    {saving ? "Menyimpan..." : "Simpan Onoystore"}
                  </button>
                </div>
              </div>
            )}

            {/* TOPUPKUY MODAL CONTENT */}
            {selected.code.toUpperCase() === "TOPUPKUY" && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nama Provider</label>
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Base URL TopupKuy</label>
                  <input type="url" value={baseURL} onChange={(e) => setBaseURL(e.target.value)}
                    placeholder="https://api.topupkuy.id/v1"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    API Key TopupKuy{" "}
                    {topupkuy?.api_key_configured && <span className="text-emerald-400">(sudah tersimpan)</span>}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input type="password" value={apiKey} onChange={(e) => setAPIKey(e.target.value)}
                      placeholder={topupkuy?.api_key_configured ? "Kosongkan untuk mempertahankan API key saat ini" : "Masukkan API key TopupKuy"}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 font-mono text-slate-100" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Signature callback TopupKuy (X-Signature) divalidasi memakai API key di atas, jadi tidak perlu webhook secret terpisah.
                </p>
                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded text-indigo-600" />
                  <span>Aktifkan TopupKuy</span>
                </label>
                <div className="flex justify-end pt-2">
                  <button onClick={saveTopupKuy} disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60 transition">
                    <Save className="h-4 w-4" />
                    {saving ? "Menyimpan..." : "Simpan TopupKuy"}
                  </button>
                </div>
              </div>
            )}

            {/* VOCA MODAL CONTENT */}
            {selected.code.toUpperCase() === "VOCA" && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nama Provider</label>
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Base URL Voca</label>
                  <input type="url" value={baseURL} onChange={(e) => setBaseURL(e.target.value)}
                    placeholder="https://api-bisnis.vocagame.com/v1/core"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Merchant ID</label>
                  <input value={vocaMerchantId} onChange={(e) => setVocaMerchantId(e.target.value)}
                    placeholder="xxxx-xxx-xx-xxx-xxxxxx"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Secret Key{" "}
                    {voca?.secret_key_configured && <span className="text-emerald-400">(sudah tersimpan)</span>}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input type="password" value={vocaSecretKey} onChange={(e) => setVocaSecretKey(e.target.value)}
                      placeholder={voca?.secret_key_configured ? "Kosongkan untuk mempertahankan Secret Key" : "Masukkan Secret Key"}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 font-mono text-slate-100" />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Callback Key{" "}
                    {voca?.callback_key_configured && <span className="text-emerald-400">(sudah tersimpan)</span>}
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input type="password" value={vocaCallbackKey} onChange={(e) => setVocaCallbackKey(e.target.value)}
                      placeholder={voca?.callback_key_configured ? "Kosongkan untuk mempertahankan Callback Key" : "Dari dashboard Voca (header X-Callback-Key)"}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 font-mono text-slate-100" />
                  </div>
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded text-indigo-600" />
                  <span>Aktifkan Voca</span>
                </label>
                <div className="flex justify-end pt-2">
                  <button onClick={saveVoca} disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60 transition">
                    <Save className="h-4 w-4" />
                    {saving ? "Menyimpan..." : "Simpan Voca"}
                  </button>
                </div>
              </div>
            )}

            {/* OTHER / CUSTOM PROVIDER FALLBACK */}
            {selected.code.toUpperCase() !== "DIGIFLAZZ" &&
              selected.code.toUpperCase() !== "FFZSTORE" &&
              selected.code.toUpperCase() !== "ONOYSTORE" &&
              selected.code.toUpperCase() !== "TOPUPKUY" &&
               selected.code.toUpperCase() !== "VOCA" &&(  
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nama Provider</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Base URL</label>
                    <input
                      type="url"
                      value={baseURL}
                      onChange={(e) => setBaseURL(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-slate-100"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Aktifkan Provider</span>
                  </label>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={async () => {
                        setSaving(true);
                        setNotice("");
                        try {
                          await api.put(`/admin/providers/${selected.id}`, {
                            name,
                            base_url: baseURL,
                            is_active: isActive,
                          });
                          await mutate();
                          setNotice("Konfigurasi provider tersimpan.");
                        } catch (err: any) {
                          setNotice(err.response?.data?.message || "Gagal menyimpan.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60 transition"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
