"use client";

import { useState } from "react";
import useSWR from "swr";
import { createPortal } from "react-dom";
import {
  Image,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

const emptyForm = {
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "",
  badge_text: "",
  sort_order: 0,
  is_active: true,
};

export default function BannersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [previewError, setPreviewError] = useState(false);

  // Confirm states
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    bannerId: number | null;
    bannerTitle: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    bannerId: null,
    bannerTitle: "",
    isLoading: false,
  });

  const [confirmEdit, setConfirmEdit] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false,
  });

  const { data: banners, mutate, isLoading } = useSWR("/admin/banners", fetcher);

  const openCreate = () => {
    setEditingBanner(null);
    setFormData({ ...emptyForm });
    setPreviewError(false);
    setIsModalOpen(true);
  };

  const openEdit = (b: any) => {
    setEditingBanner(b);
    setFormData({
      title: b.title || "",
      subtitle: b.subtitle || "",
      image_url: b.image_url,
      link_url: b.link_url || "",
      badge_text: b.badge_text || "",
      sort_order: b.sort_order ?? 0,
      is_active: b.is_active,
    });
    setPreviewError(false);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBanner) {
      setConfirmEdit({ isOpen: true, isLoading: false });
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    try {
      if (editingBanner) {
        setConfirmEdit((prev) => ({ ...prev, isLoading: true }));
        await api.put(`/admin/banners/${editingBanner.id}`, formData);
        setConfirmEdit({ isOpen: false, isLoading: false });
      } else {
        await api.post("/admin/banners", formData);
      }
      setIsModalOpen(false);
      mutate();
    } catch (err: any) {
      setConfirmEdit((prev) => ({ ...prev, isLoading: false }));
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  const promptDelete = (id: number, title: string) => {
    setConfirmDelete({
      isOpen: true,
      bannerId: id,
      bannerTitle: title,
      isLoading: false,
    });
  };

  const executeDelete = async () => {
    if (!confirmDelete.bannerId) return;
    setConfirmDelete((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.delete(`/admin/banners/${confirmDelete.bannerId}`);
      setConfirmDelete({ isOpen: false, bannerId: null, bannerTitle: "", isLoading: false });
      mutate();
    } catch (err: any) {
      setConfirmDelete((prev) => ({ ...prev, isLoading: false }));
      alert("Gagal menghapus banner: " + (err.response?.data?.message || err.message));
    }
  };

  const toggleActive = async (b: any) => {
    try {
      await api.put(`/admin/banners/${b.id}`, { ...b, is_active: !b.is_active });
      mutate();
    } catch (err: any) {
      alert("Gagal mengubah status: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Image className="w-5 h-5 text-indigo-400" />
            Manajemen Banner & Promo Carousel
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Banner yang tampil di halaman utama IRXPlay. Urutkan berdasarkan Sort Order (terkecil tampil pertama).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Banner
        </button>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
        <AlertCircle className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-indigo-300">
          Gunakan <strong>URL gambar publik</strong> (Google Drive, ImgBB, Cloudinary, atau link gambar langsung) untuk kolom Gambar Banner.
          Resolusi yang disarankan: <strong>1200 × 480 px</strong> (rasio 2.5:1).
        </p>
      </div>

      {/* Banners Grid Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {banners && banners.length > 0 ? (
          banners.map((b: any) => (
            <div
              key={b.id}
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                b.is_active ? "border-slate-700" : "border-slate-800 opacity-50"
              }`}
            >
              {/* Banner Image Preview */}
              <div className="relative h-36 bg-slate-800 overflow-hidden">
                {b.image_url ? (
                  <img
                    src={b.image_url}
                    alt={b.title || "Banner"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3">
                  {b.badge_text && (
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                      {b.badge_text}
                    </span>
                  )}
                  <p className="text-sm font-bold text-white line-clamp-1">{b.title || <span className="italic text-slate-400 font-normal">(Tanpa Judul)</span>}</p>
                  {b.subtitle && (
                    <p className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">{b.subtitle}</p>
                  )}
                </div>
                <div className="absolute top-2 right-2 bg-slate-900/80 rounded-lg px-2 py-0.5 text-[10px] text-slate-300 font-medium">
                  #{b.sort_order}
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 flex items-center justify-between">
                <button
                  onClick={() => toggleActive(b)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    b.is_active ? "text-emerald-400 hover:text-emerald-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {b.is_active ? (
                    <ToggleRight className="w-4 h-4" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )}
                  {b.is_active ? "Aktif" : "Nonaktif"}
                </button>
                <div className="flex gap-2">
                  {b.link_url && (
                    <a
                      href={b.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                      title="Lihat Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => openEdit(b)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Edit Banner"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => promptDelete(b.id, b.title || "(tanpa judul)")}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title="Hapus Banner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-16 text-center">
            <Image className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {isLoading ? "Memuat banner..." : "Belum ada banner. Klik 'Tambah Banner' untuk mulai."}
            </p>
          </div>
        )}
      </div>

      {/* Modal Add/Edit Banner */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">
                  {editingBanner ? "Edit Banner: " + editingBanner.title : "Tambah Banner Baru"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                {/* Image URL + Live Preview */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    URL Gambar Banner <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://i.ibb.co/xxx/banner.jpg"
                    value={formData.image_url}
                    onChange={(e) => {
                      setFormData({ ...formData, image_url: e.target.value });
                      setPreviewError(false);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                  />
                  {formData.image_url && !previewError && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-700 h-32 bg-slate-800">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={() => setPreviewError(true)}
                      />
                    </div>
                  )}
                  {previewError && (
                    <p className="mt-1.5 text-rose-400 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      URL gambar tidak dapat dimuat. Pastikan URL dapat diakses publik.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Judul Banner 
                  </label>
                  <input
                    type="text"
                    placeholder="PROMO SPESIAL TOP UP GAME"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Subjudul / Deskripsi</label>
                  <input
                    type="text"
                    placeholder="Diskon hingga 30% untuk member baru"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Teks Badge</label>
                    <input
                      type="text"
                      placeholder="PROMO TERBATAS"
                      value={formData.badge_text}
                      onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Sort Order</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">URL Link (opsional)</label>
                  <input
                    type="url"
                    placeholder="https://irxplay.com/game/mobile-legends"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <span className="text-slate-300 font-medium">Aktifkan Banner (tampil di website)</span>
                </label>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
                  >
                    {editingBanner ? "Simpan Perubahan" : "Buat Banner"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Confirmation Modal - Delete Banner */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() =>
          setConfirmDelete({ isOpen: false, bannerId: null, bannerTitle: "", isLoading: false })
        }
        onConfirm={executeDelete}
        title="Hapus Banner Promo?"
        message={
          <>
            Apakah Anda yakin ingin menghapus banner{" "}
            <strong className="text-white font-semibold">{confirmDelete.bannerTitle}</strong>?
          </>
        }
        confirmText="Ya, Hapus Banner"
        cancelText="Batal"
        variant="danger"
        isLoading={confirmDelete.isLoading}
      />

      {/* Confirmation Modal - Edit Banner */}
      <ConfirmModal
        isOpen={confirmEdit.isOpen}
        onClose={() => setConfirmEdit({ isOpen: false, isLoading: false })}
        onConfirm={executeSave}
        title="Simpan Perubahan Banner?"
        message={
          <>
            Apakah Anda yakin ingin memperbarui banner{" "}
            <strong className="text-white font-semibold">
              {formData.title || "(tanpa judul)"}
            </strong>?
          </>
        }
        confirmText="Ya, Simpan"
        cancelText="Periksa Lagi"
        variant="primary"
        isLoading={confirmEdit.isLoading}
      />
    </div>
  );
}
