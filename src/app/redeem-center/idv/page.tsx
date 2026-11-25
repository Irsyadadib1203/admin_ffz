"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

type RedeemResult = {
  idv_user_id: string;
  time: string;
  amount: number;
  balance: number;
  voucher_trx_id: string;
};

type HistoryItem = {
  code: string;
  success: boolean;
  message: string;
  result?: RedeemResult;
  at: Date;
};

const maskCode = (code: string) =>
  code.length <= 6 ? code : `${code.slice(0, 3)}${"•".repeat(code.length - 6)}${code.slice(-3)}`;

export default function IDVRedeemPage() {
  const {
    data: balance,
    error: balanceError,
    isValidating,
    mutate,
  } = useSWR<{ balance: number; unit: string }>("/admin/redeem-center/idv/balance", fetcher, {
    revalidateOnFocus: false,
  });

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [last, setLast] = useState<HistoryItem | null>(null);

  const submit = async () => {
    const voucher = code.trim();
    if (!voucher || loading) return;

    setLoading(true);
    setLast(null);
    let item: HistoryItem;
    try {
      const res = await api.post("/admin/redeem-center/idv/redeem", { voucher_code: voucher });
      item = {
        code: voucher,
        success: true,
        message: res.data?.message || "Voucher berhasil di-redeem",
        result: res.data.data,
        at: new Date(),
      };
      setCode("");
      mutate({ balance: res.data.data.balance, unit: "UCOIN" }, false);
    } catch (err: any) {
      item = {
        code: voucher,
        success: false,
        message: err.response?.data?.message || "Gagal redeem voucher",
        at: new Date(),
      };
    } finally {
      setLoading(false);
    }
    setLast(item);
    setHistory((prev) => [item, ...prev].slice(0, 20));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5">
        <div className="flex gap-3">
          <Ticket className="h-5 w-5 text-indigo-300" />
          <div>
            <h1 className="text-xl font-bold text-white">IDV Redeem</h1>
            <p className="mt-1 text-sm text-slate-300">
              Redeem voucher IDV ke saldo Ucoin akun reseller yang dikonfigurasi pada provider IDV.
            </p>
          </div>
        </div>
      </div>

      {/* Saldo */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
            <Coins className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Saldo akun IDV</p>
            <p className="text-lg font-black text-emerald-400">
              {balance
                ? `${balance.balance.toLocaleString("id-ID")} Ucoin`
                : balanceError
                ? "Gagal memuat"
                : "Memuat..."}
            </p>
          </div>
        </div>
        <button
          onClick={() => mutate()}
          disabled={isValidating}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          title="Refresh saldo"
        >
          <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {balanceError && (
        <p className="text-xs text-amber-400">
          {(balanceError as any).response?.data?.message ||
            "Saldo tidak bisa dimuat. Pastikan provider IDV sudah dikonfigurasi dan aktif."}
        </p>
      )}

      {/* Form redeem */}
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <label className="block text-sm text-slate-200">
          Kode Voucher
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Contoh: PT1ZB3GCGDWWSRLJ"
            autoComplete="off"
            spellCheck={false}
            maxLength={64}
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-100"
          />
        </label>

        <p className="text-[11px] text-slate-500">
          Hati-hati: IDV memblokir akun sementara jika redeem gagal 5 kali (error E013). Periksa kode sebelum menekan tombol.
        </p>

        <button
          onClick={submit}
          disabled={loading || !code.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          <Ticket className="h-4 w-4" />
          {loading ? "Memproses..." : "Redeem Voucher"}
        </button>

        {last && (
          <div
            className={`rounded-xl border p-4 text-xs ${
              last.success
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {last.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400" />
              )}
              {last.message}
            </div>
            {last.success && last.result && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <dt className="text-[10px] text-slate-400">Nominal</dt>
                  <dd className="font-mono">{last.result.amount.toLocaleString("id-ID")} Ucoin</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400">Saldo sekarang</dt>
                  <dd className="font-mono">{last.result.balance.toLocaleString("id-ID")} Ucoin</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400">ID Redeem</dt>
                  <dd className="font-mono">{last.result.voucher_trx_id}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400">Waktu</dt>
                  <dd className="font-mono">{last.result.time}</dd>
                </div>
              </dl>
            )}
          </div>
        )}
      </section>

      {/* Riwayat sesi */}
      {history.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">Riwayat Sesi Ini</h2>
            <button
              onClick={() => setHistory([])}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              Bersihkan
            </button>
          </div>
          <div className="divide-y divide-slate-800">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                <div className="min-w-0">
                  <p className="font-mono text-slate-200">{maskCode(h.code)}</p>
                  <p className="truncate text-[11px] text-slate-500">{h.message}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={h.success ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                    {h.success ? `+${h.result?.amount.toLocaleString("id-ID")} Ucoin` : "Gagal"}
                  </p>
                  <p className="text-[10px] text-slate-500">{h.at.toLocaleTimeString("id-ID")}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600">
            Riwayat hanya disimpan di browser selama halaman terbuka, tidak masuk database.
          </p>
        </section>
      )}
    </div>
  );
}