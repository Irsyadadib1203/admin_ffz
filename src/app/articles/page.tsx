"use client";

import { useState } from "react";
import useSWR from "swr";
import { createPortal } from "react-dom";
import {
  Newspaper,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

const CATEGORIES = ["Promo", "Update", "Event", "Patch Notes"];

const emptyForm = {
  title: "",
  slug: "",
  category: "Promo",
  excerpt: "",
  content: "",
  image_url: "",
  read_time: "3 min read",
  is_published: true,
  sort_order: 0,
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const CATEGORY_COLORS: Record<string, string> = {
  Promo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Update: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Event: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Patch Notes": "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export default function ArticlesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [previewError, setPreviewError] = useState(false);
  const [filterCat, setFilterCat] = useState("Semua");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Confirm states
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    articleId: number | null;
    articleTitle: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    articleId: null,
    articleTitle: "",
    isLoading: false,
  });

  const [confirmEdit, setConfirmEdit] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false,
  });

  const { data: articles, mutate, isLoading } = useSWR(
    `/admin/articles${filterCat !== "Semua" ? `?category=${filterCat}` : ""}`,
    fetcher
  );

  const rawArticles = Array.isArray(articles) ? articles : [];
  const totalItems = rawArticles.length;
  const paginatedArticles = rawArticles.slice((page - 1) * limit, page * limit);

  const openCreate = () => {
    setEditingArticle(null);
    setFormData({ ...emptyForm });
    setPreviewError(false);
    setIsModalOpen(true);
  };

  const openEdit = (a: any) => {
    setEditingArticle(a);
    setFormData({
      title: a.title,
      slug: a.slug,
      category: a.category,
      excerpt: a.excerpt || "",
      content: a.content || "",
      image_url: a.image_url || "",
      read_time: a.read_time || "3 min read",
      is_published: a.is_published,
      sort_order: a.sort_order ?? 0,
    });
    setPreviewError(false);
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: prev.slug === "" || prev.slug === slugify(prev.title) ? slugify(val) : prev.slug,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArticle) {
      setConfirmEdit({ isOpen: true, isLoading: false });
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    try {
      if (editingArticle) {
        setConfirmEdit((prev) => ({ ...prev, isLoading: true }));
        await api.put(`/admin/articles/${editingArticle.id}`, formData);
        setConfirmEdit({ isOpen: false, isLoading: false });
      } else {
        await api.post("/admin/articles", formData);
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
      articleId: id,
      articleTitle: title,
      isLoading: false,
    });
  };

  const executeDelete = async () => {
    if (!confirmDelete.articleId) return;
    setConfirmDelete((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.delete(`/admin/articles/${confirmDelete.articleId}`);
      setConfirmDelete({ isOpen: false, articleId: null, articleTitle: "", isLoading: false });
      mutate();
    } catch (err: any) {
      setConfirmDelete((prev) => ({ ...prev, isLoading: false }));
      alert("Gagal menghapus: " + (err.response?.data?.message || err.message));
    }
  };

  const togglePublish = async (a: any) => {
    try {
      await api.put(`/admin/articles/${a.id}`, { ...a, is_published: !a.is_published });
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
            <Newspaper className="w-5 h-5 text-indigo-400" />
            Manajemen Berita & Artikel
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola berita, promo, event, dan patch notes yang tampil di halaman /berita IRXPlay.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Artikel
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {["Semua", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setFilterCat(cat);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterCat === cat
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th className="py-3.5 px-5">Artikel</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Read Time</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedArticles && paginatedArticles.length > 0 ? (
                paginatedArticles.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail */}
                        <div className="w-14 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                          {a.image_url ? (
                            <img
                              src={a.image_url}
                              alt={a.title}
                              className="w-full h-full object-cover"
                              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Newspaper className="w-4 h-4 text-slate-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm line-clamp-1">{a.title}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{a.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                          CATEGORY_COLORS[a.category] || "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {a.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{a.read_time}</td>
                    <td className="py-3.5 px-4">
                      {a.is_published ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                          <Eye className="w-3 h-3" /> Publish
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                          <EyeOff className="w-3 h-3" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => togglePublish(a)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                            a.is_published
                              ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {a.is_published ? "Sembunyikan" : "Publish"}
                        </button>
                        <button
                          onClick={() => openEdit(a)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Edit Artikel"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => promptDelete(a.id, a.title)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Hapus Artikel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    {isLoading ? "Memuat artikel..." : "Belum ada artikel. Klik 'Tambah Artikel' untuk mulai."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination */}
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isLoading}
        />
      </div>

      {/* Modal Add/Edit Article */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">
                  {editingArticle ? "Edit Artikel: " + editingArticle.title : "Tambah Artikel Baru"}
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
                  <label className="block text-slate-300 font-medium mb-1.5">URL Gambar Artikel</label>
                  <input
                    type="url"
                    placeholder="https://i.ibb.co/xxx/berita.jpg"
                    value={formData.image_url}
                    onChange={(e) => {
                      setFormData({ ...formData, image_url: e.target.value });
                      setPreviewError(false);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                  />
                  {formData.image_url && !previewError && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-700 h-28 bg-slate-800">
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
                    Judul Artikel <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Promo Top Up Mobile Legends Bonus 30%"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Slug URL <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="promo-top-up-mobile-legends-bonus-30"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-slate-500 mt-1 text-[11px]">Auto-generated dari judul. Hanya huruf kecil & tanda minus.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Kategori</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Estimasi Baca</label>
                    <input
                      type="text"
                      placeholder="3 min read"
                      value={formData.read_time}
                      onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Ringkasan / Excerpt <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Deskripsi singkat artikel yang tampil di kartu berita..."
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Konten Lengkap (opsional)</label>
                  <textarea
                    rows={5}
                    placeholder="Isi artikel secara lengkap..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                    />
                    <span className="text-slate-300 font-medium">Publish (tampil di website)</span>
                  </label>
                </div>

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
                    {editingArticle ? "Simpan Perubahan" : "Buat Artikel"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Confirmation Modal - Delete Article */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() =>
          setConfirmDelete({ isOpen: false, articleId: null, articleTitle: "", isLoading: false })
        }
        onConfirm={executeDelete}
        title="Hapus Berita / Artikel?"
        message={
          <>
            Apakah Anda yakin ingin menghapus artikel{" "}
            <strong className="text-white font-semibold">{confirmDelete.articleTitle}</strong>?
          </>
        }
        confirmText="Ya, Hapus Artikel"
        cancelText="Batal"
        variant="danger"
        isLoading={confirmDelete.isLoading}
      />

      {/* Confirmation Modal - Edit Article */}
      <ConfirmModal
        isOpen={confirmEdit.isOpen}
        onClose={() => setConfirmEdit({ isOpen: false, isLoading: false })}
        onConfirm={executeSave}
        title="Simpan Perubahan Artikel?"
        message={
          <>
            Apakah Anda yakin ingin memperbarui artikel{" "}
            <strong className="text-white font-semibold">{formData.title}</strong>?
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
