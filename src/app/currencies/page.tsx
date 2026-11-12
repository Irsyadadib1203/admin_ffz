"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import {
  Coins,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Calculator,
  ArrowRight,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

interface CurrencyItem {
  id: number;
  code: string;
  name: string;
  symbol: string;
  rate_to_idr: number;
  provider_code: string;
  description: string;
  is_active: boolean;
  updated_at: string;
}

export default function CurrenciesPage() {
  const { data: currencies, mutate, isLoading } = useSWR<CurrencyItem[]>(
    "/admin/currencies",
    fetcher
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CurrencyItem | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    symbol: "",
    rate_to_idr: "",
    provider_code: "",
    description: "",
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: CurrencyItem | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    item: null,
    isDeleting: false,
  });

  // Calculator State
  const [calcCurrency, setCalcCurrency] = useState("SHELL");
  const [calcAmount, setCalcAmount] = useState<number | string>(100);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };
  const formatRate = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(val || 0);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      code: "",
      name: "",
      symbol: "",
      rate_to_idr: "",
      provider_code: "KIOSGAMER",
      description: "",
      is_active: true,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: CurrencyItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      symbol: item.symbol,
      rate_to_idr: item.rate_to_idr.toString(),
      provider_code: item.provider_code,
      description: item.description,
      is_active: item.is_active,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.code.trim()) {
      setFormError("Kode mata uang wajib diisi (misal: SHELL, USD)");
      return;
    }
    if (!formData.name.trim()) {
      setFormError("Nama mata uang wajib diisi (misal: Garena Shell)");
      return;
    }
    const rate = parseFloat(formData.rate_to_idr);
    if (isNaN(rate) || rate <= 0) {
      setFormError("Kurs konversi ke IDR harus berupa angka lebih besar dari 0");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await api.put(`/admin/currencies/${editingItem.id}`, {
          code: formData.code,
          name: formData.name,
          symbol: formData.symbol,
          rate_to_idr: rate,
          provider_code: formData.provider_code,
          description: formData.description,
          is_active: formData.is_active,
        });
      } else {
        await api.post("/admin/currencies", {
          code: formData.code,
          name: formData.name,
          symbol: formData.symbol,
          rate_to_idr: rate,
          provider_code: formData.provider_code,
          description: formData.description,
          is_active: formData.is_active,
        });
      }
      setIsModalOpen(false);
      mutate();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Gagal menyimpan mata uang");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/admin/currencies/${deleteModal.item.id}`);
      setDeleteModal({ isOpen: false, item: null, isDeleting: false });
      mutate();
    } catch (err: any) {
      alert("Gagal menghapus mata uang: " + (err.response?.data?.message || err.message));
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // Calculator conversion logic
  const selectedCalcCur = currencies?.find((c) => c.code === calcCurrency);
  const calcRate = selectedCalcCur?.rate_to_idr || 0;
  const numAmount = typeof calcAmount === "number" ? calcAmount : parseFloat(calcAmount) || 0;
  const totalConverted = numAmount * calcRate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-400" />
            Mata Uang &amp; Kurs Penyesuaian
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola kurs konversi mata uang / credit point (seperti Garena Shell Kiosgamer, SGD, USD) ke Rupiah (IDR)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah Mata Uang
          </button>
        </div>
      </div>

      {/* Quick Converter Widget */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-slate-800">
        <div className="flex items-center gap-2 text-white font-semibold text-sm mb-3">
          <Calculator className="w-4 h-4 text-indigo-400" />
          Kalkulator Simulasi Kurs Instan
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">Pilih Mata Uang</label>
            <select
              value={calcCurrency}
              onChange={(e) => setCalcCurrency(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {currencies?.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name} ({formatRate(c.rate_to_idr)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">
              Jumlah {selectedCalcCur?.symbol || calcCurrency}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              placeholder="100"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="sm:mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              Hasil IDR <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
            </span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">
              {formatRupiah(totalConverted)}
            </span>
          </div>
        </div>
      </div>

      {/* Currencies Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium bg-slate-900/60">
                <th className="py-3.5 px-4">Kode</th>
                <th className="py-3.5 px-4">Nama &amp; Simbol</th>
                <th className="py-3.5 px-4">Kurs Konversi (IDR)</th>
                <th className="py-3.5 px-4">Provider / Asal</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Memuat data mata uang...
                  </td>
                </tr>
              ) : currencies && currencies.length > 0 ? (
                currencies.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{item.name}</span>
                        {item.symbol && (
                          <span className="text-[11px] text-slate-400">({item.symbol})</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-slate-400 text-[11px]">1 {item.code} =</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          {formatRate(item.rate_to_idr)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono">
                        {item.provider_code || "MANUAL"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate" title={item.description}>
                      {item.description || "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Edit Mata Uang"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, item, isDeleting: false })}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Hapus Mata Uang"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Belum ada data mata uang. Klik &quot;Tambah Mata Uang&quot; untuk menambahkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {mounted &&
        isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  {editingItem ? `Edit Mata Uang: ${editingItem.code}` : "Tambah Mata Uang Baru"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Kode Mata Uang / Shell *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: SHELL, USD, SGD"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nama Mata Uang *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Garena Shell, US Dollar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Simbol</label>
                    <input
                      type="text"
                      placeholder="misal: Shell, $, S$"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Provider / Asal
                    </label>
                    <input
                      type="text"
                      placeholder="misal: KIOSGAMER"
                      value={formData.provider_code}
                      onChange={(e) =>
                        setFormData({ ...formData, provider_code: e.target.value.toUpperCase() })
                      }
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Kurs Nilai ke Rupiah (1 Unit = Rp X) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="misal: 330 (untuk Shell) atau 16000 (untuk USD)"
                    value={formData.rate_to_idr}
                    onChange={(e) => setFormData({ ...formData, rate_to_idr: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-amber-300 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nilai tukar Rupiah per 1 unit mata uang/shell.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Keterangan</label>
                  <textarea
                    rows={2}
                    placeholder="Catatan tambahan mengenai penggunaan mata uang ini..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="relative flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4"
                    />
                    <span className="text-slate-300 font-medium">Aktifkan mata uang ini</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Mata Uang"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {mounted &&
        deleteModal.isOpen &&
        deleteModal.item &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setDeleteModal({ isOpen: false, item: null, isDeleting: false })}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Hapus Mata Uang?</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Anda yakin ingin menghapus {deleteModal.item.code} ({deleteModal.item.name})?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: false, item: null, isDeleting: false })}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleteModal.isDeleting}
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {deleteModal.isDeleting ? "Menghapus..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
