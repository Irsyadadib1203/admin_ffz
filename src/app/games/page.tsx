"use client";

import { useState } from "react";
import useSWR from "swr";
import { createPortal } from "react-dom";
import {
  Gamepad2,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";

const paginatedFetcher = (url: string) => api.get(url).then((res) => res.data);

const EMPTY_FORM = {
  name: "",
  slug: "",
  category: "Games",
  publisher: "",
  description: "",
  is_active: true,
  code: "",
};

export default function GamesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any | null>(null);

  // Confirm Modal state
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    gameId: number | null;
    gameName: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    gameId: null,
    gameName: "",
    isLoading: false,
  });

  const [confirmEdit, setConfirmEdit] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false,
  });

  // Form State
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: resData, mutate, isLoading } = useSWR(
    `/admin/games?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
    paginatedFetcher
  );

  const games = Array.isArray(resData?.data) ? resData.data : [];
  const totalItems = resData?.meta?.total ?? games.length;

  const openCreateModal = () => {
    setEditingGame(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (game: any) => {
    setEditingGame(game);
    setFormData({
      name: game.name,
      slug: game.slug,
      category: game.category,
      publisher: game.publisher || "",
      description: game.description || "",
      is_active: game.is_active,
      code: game.code || "",
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGame) {
      // Show edit confirmation
      setConfirmEdit({ isOpen: true, isLoading: false });
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    try {
      if (editingGame) {
        setConfirmEdit((prev) => ({ ...prev, isLoading: true }));
        await api.put(`/admin/games/${editingGame.id}`, formData);
        setConfirmEdit({ isOpen: false, isLoading: false });
      } else {
        await api.post("/admin/games", formData);
      }
      setIsModalOpen(false);
      mutate();
    } catch (err: any) {
      setConfirmEdit((prev) => ({ ...prev, isLoading: false }));
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  const promptDelete = (id: number, name: string) => {
    setConfirmDelete({
      isOpen: true,
      gameId: id,
      gameName: name,
      isLoading: false,
    });
  };

  const executeDelete = async () => {
    if (!confirmDelete.gameId) return;
    setConfirmDelete((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.delete(`/admin/games/${confirmDelete.gameId}`);
      setConfirmDelete({ isOpen: false, gameId: null, gameName: "", isLoading: false });
      mutate();
    } catch (err: any) {
      setConfirmDelete((prev) => ({ ...prev, isLoading: false }));
      alert("Gagal menghapus game: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Manajemen Game & Produk</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar game yang tersedia untuk order mitra H2H
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari game..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-64"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah Game
          </button>
        </div>
      </div>

      {/* Games Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th className="py-3.5 px-5">Game</th>
                <th className="py-3.5 px-4">Kategori & Publisher</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {games && games.length > 0 ? (
                games.map((g: any) => (
                  <tr key={g.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                          <Gamepad2 className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{g.name}</p>
                          <p className="text-[11px] text-slate-500">
                            /{g.slug}{g.code ? <span className="ml-2 text-amber-400 font-mono">[{g.code}]</span> : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium mr-1.5">
                        {g.category}
                      </span>
                      <span className="text-slate-400">{g.publisher || "-"}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {g.is_active ? (
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(g)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Edit Game"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => promptDelete(g.id, g.name)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Hapus Game"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    {isLoading ? "Memuat katalog game..." : "Tidak ada game yang ditemukan."}
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

      {/* Modal Add / Edit Game */}
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
                  {editingGame ? "Edit Game: " + editingGame.name : "Tambah Game Baru"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Nama Game *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Mobile Legends: Bang Bang"
                      value={formData.name}
                      onChange={(e) => {
                        const nameVal = e.target.value;
                        if (!editingGame) {
                          const autoSlug = nameVal
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, "");
                          setFormData({
                            ...formData,
                            name: nameVal,
                            slug: autoSlug,
                          });
                        } else {
                          setFormData({ ...formData, name: nameVal });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                      <span>Slug URL *</span>
                      <span className="text-[10px] text-slate-500 font-mono">/game/{"{slug}"}</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="contoh: mobile-legends"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-indigo-400 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Kategori
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Games">Games</option>
                      <option value="Voucher">Voucher</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Pulsa & PLN">Pulsa & PLN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Publisher
                    </label>
                    <input
                      type="text"
                      placeholder="Moonton / Garena"
                      value={formData.publisher}
                      onChange={(e) =>
                        setFormData({ ...formData, publisher: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                    <span>Kode Game *</span>
                    <span className="text-[10px] text-slate-500 font-mono">token {"{game_code}"}</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={10}
                    placeholder="Contoh: ML"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-amber-300 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                    />
                    <span className="text-slate-300 font-medium">Aktifkan Game</span>
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
                    {editingGame ? "Simpan Perubahan" : "Buat Game"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Confirmation Modal - Delete Game */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() =>
          setConfirmDelete({ isOpen: false, gameId: null, gameName: "", isLoading: false })
        }
        onConfirm={executeDelete}
        title="Hapus Game & Produk?"
        message={
          <>
            Apakah Anda yakin ingin menghapus game{" "}
            <strong className="text-white font-semibold">{confirmDelete.gameName}</strong>?
            <br />
            <span className="text-rose-400 mt-1 block font-medium">
              Peringatan: Semua item nominal dan SKU yang terhubung dengan game ini juga akan dihapus.
            </span>
          </>
        }
        confirmText="Ya, Hapus Game"
        cancelText="Batal"
        variant="danger"
        isLoading={confirmDelete.isLoading}
      />

      {/* Confirmation Modal - Edit Game */}
      <ConfirmModal
        isOpen={confirmEdit.isOpen}
        onClose={() => setConfirmEdit({ isOpen: false, isLoading: false })}
        onConfirm={executeSave}
        title="Simpan Perubahan Game?"
        message={
          <>
            Apakah Anda yakin ingin memperbarui data game{" "}
            <strong className="text-white font-semibold">{formData.name}</strong>?
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