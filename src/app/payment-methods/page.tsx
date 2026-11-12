"use client";

import { useState } from "react";
import useSWR from "swr";
import { createPortal } from "react-dom";
import { CreditCard, Edit2, Check, X, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

export default function PaymentMethodsPage() {
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    created: string[];
    updated: string[];
    skipped: string[];
  } | null>(null);

  // Confirm states
  const [confirmEdit, setConfirmEdit] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false,
  });

  const [confirmSync, setConfirmSync] = useState(false);

  const { data: methods, mutate, isLoading } = useSWR(
    "/admin/payment-methods",
    fetcher
  );

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmEdit({ isOpen: true, isLoading: false });
  };

  const executeUpdate = async () => {
    if (!editingMethod) return;
    setConfirmEdit((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.put(`/admin/payment-methods/${editingMethod.id}`, editingMethod);
      setConfirmEdit({ isOpen: false, isLoading: false });
      setEditingMethod(null);
      mutate();
    } catch (err: any) {
      setConfirmEdit((prev) => ({ ...prev, isLoading: false }));
      alert("Gagal update payment method: " + (err.response?.data?.message || err.message));
    }
  };

  const executeSync = async () => {
    setConfirmSync(false);
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.post("/admin/payment-methods/sync-tripay");
      setSyncResult(res.data.data);
      mutate();
    } catch (err: any) {
      alert(
        "Gagal sync dari Tripay: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">
            Metode Pembayaran & Biaya Admin Gateway
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Atur biaya admin (Fixed fee / Persentase) dan aktifkan saluran pembayaran yang didukung
          </p>
        </div>

        <button
          onClick={() => setConfirmSync(true)}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Menyinkronkan..." : "Sync dari Tripay"}
        </button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
          <p className="text-slate-300 font-semibold">Hasil sinkronisasi:</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            <span className="text-emerald-400">
              {syncResult.created.length} baru
              {syncResult.created.length > 0 && (
                <span className="text-slate-500"> ({syncResult.created.join(", ")})</span>
              )}
            </span>
            <span className="text-indigo-400">
              {syncResult.updated.length} diperbarui
              {syncResult.updated.length > 0 && (
                <span className="text-slate-500"> ({syncResult.updated.join(", ")})</span>
              )}
            </span>
            {syncResult.skipped.length > 0 && (
              <span className="text-amber-400">
                {syncResult.skipped.length} dilewati
                <span className="text-slate-500"> ({syncResult.skipped.join(", ")})</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Methods Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
              <th className="py-3.5 px-5">Metode Pembayaran</th>
              <th className="py-3.5 px-4">Kategori</th>
              <th className="py-3.5 px-4">Biaya Admin Flat</th>
              <th className="py-3.5 px-4">Biaya Admin (%)</th>
              <th className="py-3.5 px-4">Batas Minimal</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {methods && methods.length > 0 ? (
              methods.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3.5 px-5">
                    <div>
                      <span className="font-semibold text-white text-sm block">
                        {m.name}
                      </span>
                      <span className="font-mono text-[11px] text-indigo-400">
                        {m.code}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {m.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-200">
                    {formatRupiah(m.fixed_fee)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-200">{m.percent_fee}%</td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {formatRupiah(m.min_amount)}
                  </td>
                  <td className="py-3.5 px-4">
                    {m.is_active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <X className="w-3.5 h-3.5" /> Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => setEditingMethod(m)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit Biaya & Status"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  {isLoading ? "Memuat metode pembayaran..." : "Tidak ada data."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingMethod &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setEditingMethod(null)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">
                  Edit Metode: {editingMethod.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingMethod(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Biaya Flat (Rp)
                    </label>
                    <input
                      type="number"
                      value={editingMethod.fixed_fee}
                      onChange={(e) =>
                        setEditingMethod({
                          ...editingMethod,
                          fixed_fee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Biaya Persen (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingMethod.percent_fee}
                      onChange={(e) =>
                        setEditingMethod({
                          ...editingMethod,
                          percent_fee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Instruksi Pembayaran Singkat
                  </label>
                  <textarea
                    rows={3}
                    value={editingMethod.instructions || ""}
                    onChange={(e) =>
                      setEditingMethod({
                        ...editingMethod,
                        instructions: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="pm_active"
                    checked={editingMethod.is_active}
                    onChange={(e) =>
                      setEditingMethod({
                        ...editingMethod,
                        is_active: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <label htmlFor="pm_active" className="text-slate-300 font-medium cursor-pointer">
                    Aktifkan saluran pembayaran ini
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingMethod(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Confirmation Modal - Edit Payment Method */}
      <ConfirmModal
        isOpen={confirmEdit.isOpen}
        onClose={() => setConfirmEdit({ isOpen: false, isLoading: false })}
        onConfirm={executeUpdate}
        title="Simpan Perubahan Biaya Pembayaran?"
        message={
          <>
            Apakah Anda yakin ingin memperbarui konfigurasi biaya untuk metode{" "}
            <strong className="text-white font-semibold">{editingMethod?.name}</strong>?
          </>
        }
        confirmText="Ya, Simpan"
        cancelText="Periksa Lagi"
        variant="primary"
        isLoading={confirmEdit.isLoading}
      />

      {/* Confirmation Modal - Sync Tripay */}
      <ConfirmModal
        isOpen={confirmSync}
        onClose={() => setConfirmSync(false)}
        onConfirm={executeSync}
        title="Sinkronisasi Saluran Tripay?"
        message={
          <>
            Sistem akan mengambil daftar channel pembayaran terbaru dari akun Tripay Anda dan memperbarui status saluran yang tersedia.
          </>
        }
        confirmText="Ya, Sinkronkan"
        cancelText="Batal"
        variant="primary"
        isLoading={syncing}
      />
    </div>
  );
}
