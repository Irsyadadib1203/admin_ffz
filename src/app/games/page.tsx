"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Edit2, Gamepad2, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";

const fetcher = (url: string) => api.get(url).then((res) => res.data);
const emptyGame = { name: "", slug: "", category: "Games", publisher: "", description: "", code: "", is_active: true };

export default function GamesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [form, setForm] = useState(emptyGame);
  const [editing, setEditing] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<any | null>(null);
  const { data, mutate, isLoading } = useSWR(`/admin/games?page=${page}&limit=${limit}&search=${search}`, fetcher);
  const games = Array.isArray(data?.data) ? data.data : [];

  const openCreate = () => { setEditing(null); setForm(emptyGame); setModalOpen(true); };
  const openEdit = (game: any) => {
    setEditing(game);
    setForm({ name: game.name, slug: game.slug, category: game.category, publisher: game.publisher || "", description: game.description || "", code: game.code || "", is_active: game.is_active });
    setModalOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editing) await api.put(`/admin/games/${editing.id}`, form);
      else await api.post("/admin/games", form);
      setModalOpen(false); mutate();
    } catch (error: any) { alert(error.response?.data?.message || error.message); }
  };
  const remove = async () => {
    if (!deleting) return;
    try { await api.delete(`/admin/games/${deleting.id}`); setDeleting(null); mutate(); }
    catch (error: any) { alert(error.response?.data?.message || error.message); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h1 className="text-xl font-bold text-white">Katalog Game</h1><p className="mt-0.5 text-xs text-slate-400">Data game untuk transaksi dan pengelolaan provider.</p></div>
      <div className="flex gap-3"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari game..." className="w-48 rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-indigo-500" /></label><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Tambah Game</button></div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400"><th className="px-5 py-3.5">Game</th><th className="px-4 py-3.5">Kategori</th><th className="px-4 py-3.5">Publisher</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-800/60">{games.map((game: any) => <tr key={game.id} className="hover:bg-slate-800/20"><td className="px-5 py-3.5"><span className="inline-flex items-center gap-2 font-semibold text-white"><Gamepad2 className="h-4 w-4 text-indigo-400" />{game.name}</span><span className="ml-2 text-[10px] text-slate-500">{game.code ? `[${game.code}]` : ""}</span></td><td className="px-4 py-3.5 text-slate-300">{game.category}</td><td className="px-4 py-3.5 text-slate-400">{game.publisher || "-"}</td><td className="px-4 py-3.5">{game.is_active ? <span className="inline-flex items-center gap-1 text-emerald-400"><Check className="h-3.5 w-3.5" />Aktif</span> : <span className="text-slate-500">Nonaktif</span>}</td><td className="px-5 py-3.5 text-right"><button onClick={() => openEdit(game)} className="mr-2 rounded-lg bg-slate-800 p-1.5 text-slate-300"><Edit2 className="h-3.5 w-3.5" /></button><button onClick={() => setDeleting(game)} className="rounded-lg bg-rose-500/10 p-1.5 text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button></td></tr>)}{games.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">{isLoading ? "Memuat katalog..." : "Belum ada game."}</td></tr>}</tbody></table></div></div>
    <Pagination currentPage={page} totalItems={data?.meta?.total ?? games.length} limit={limit} onPageChange={setPage} onLimitChange={setLimit} isLoading={isLoading} />
    {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"><form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-xs"><div className="flex items-center justify-between border-b border-slate-800 pb-3"><h2 className="text-base font-bold text-white">{editing ? "Edit Game" : "Tambah Game"}</h2><button type="button" onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div><div className="grid grid-cols-2 gap-3"><label className="col-span-2 text-slate-300">Nama Game<input required value={form.name} onChange={(e) => { const name = e.target.value; setForm((previous) => ({ ...previous, name, slug: editing ? previous.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })); }} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100" /></label><label className="text-slate-300">Slug<input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100" /></label><label className="text-slate-300">Kode<input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100" /></label><label className="text-slate-300">Kategori<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"><option>Games</option><option>Voucher</option><option>Entertainment</option><option>Pulsa & PLN</option></select></label><label className="text-slate-300">Publisher<input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100" /></label><label className="col-span-2 text-slate-300">Deskripsi<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100" /></label></div><label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Aktif</label><div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl bg-slate-800 px-4 py-2 text-slate-300">Batal</button><button className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">Simpan</button></div></form></div>}
    <ConfirmModal isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Hapus Game?" message={<>Hapus <strong className="text-white">{deleting?.name}</strong>?</>} confirmText="Hapus" cancelText="Batal" variant="danger" />
  </div>;
}
