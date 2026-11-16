"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Check, Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";

const fetcher = (url: string) => api.get(url).then((response) => response.data.data);
const pageFetcher = (url: string) => api.get(url).then((response) => response.data);
const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

type Form = { game_id: string; provider_id: string; name: string; description: string; base_price: string; provider_product_code: string; seller_product_code: string; is_active: boolean };
const emptyForm: Form = { game_id: "", provider_id: "", name: "", description: "", base_price: "", provider_product_code: "", seller_product_code: "", is_active: true };

export default function NominalsPage() {
  const [search, setSearch] = useState("");
  const [gameID, setGameID] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<any | null>(null);
  const { data: games } = useSWR("/admin/games?limit=1000", fetcher);
  const { data: providers } = useSWR("/admin/providers", fetcher);
  const { data, mutate, isLoading } = useSWR(`/admin/nominals?page=${page}&limit=${limit}&game_id=${gameID}&search=${encodeURIComponent(search)}&sort_by=base_price&sort_dir=asc`, pageFetcher);
  const nominals = Array.isArray(data?.data) ? data.data : [];
  const gameList = Array.isArray(games) ? games : [];
  const providerList = Array.isArray(providers) ? providers : [];

  useEffect(() => { setPage(1); }, [gameID, search]);
  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, game_id: gameList[0]?.id ? String(gameList[0].id) : "", provider_id: providerList[0]?.id ? String(providerList[0].id) : "" });
    setModalOpen(true);
  };
  const openEdit = (item: any) => {
    setEditing(item);
    setForm({ game_id: String(item.game_id), provider_id: String(item.provider_id), name: item.name, description: item.description || "", base_price: String(item.base_price || ""), provider_product_code: item.provider_product_code || "", seller_product_code: item.seller_product_code || "", is_active: item.is_active });
    setModalOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { ...form, game_id: Number(form.game_id), provider_id: Number(form.provider_id), base_price: Number(form.base_price) };
    try {
      if (editing) {
        await api.put(`/admin/nominals/${editing.id}`, payload);
        await api.put(`/admin/nominals/${editing.id}/provider-products`, [{ provider_id: Number(form.provider_id), product_code: form.provider_product_code, cost_price: Number(form.base_price), auto_sync_price: false }]);
      } else {
        await api.post("/admin/nominals", payload);
      }
      setModalOpen(false); mutate();
    } catch (error: any) { alert(error.response?.data?.message || error.message); }
  };
  const remove = async () => {
    if (!deleting) return;
    try { await api.delete(`/admin/nominals/${deleting.id}`); setDeleting(null); mutate(); }
    catch (error: any) { alert(error.response?.data?.message || error.message); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><h1 className="text-xl font-bold text-white">Nominal & Harga Modal</h1><p className="mt-0.5 text-xs text-slate-400">Setiap nominal hanya memiliki satu harga: harga modal provider aktif.</p></div><button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Tambah Nominal</button></div>
    <div className="flex flex-col gap-3 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau SKU..." className="w-64 rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-indigo-500" /></label><select value={gameID} onChange={(e) => setGameID(e.target.value)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"><option value="">Semua Game</option>{gameList.map((game: any) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></div>
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead><tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400"><th className="px-5 py-3.5">Game & Item</th><th className="px-4 py-3.5">Provider</th><th className="px-4 py-3.5">SKU</th><th className="px-4 py-3.5">Harga Modal</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-800/60">{nominals.map((item: any) => <tr key={item.id} className="hover:bg-slate-800/20"><td className="px-5 py-3.5"><p className="text-[10px] font-semibold text-indigo-400">{item.game?.name || `Game #${item.game_id}`}</p><p className="font-semibold text-white">{item.name}</p></td><td className="px-4 py-3.5 text-slate-300">{item.provider?.name || "-"}</td><td className="px-4 py-3.5 font-mono text-slate-400">{item.provider_product_code || "-"}</td><td className="px-4 py-3.5 font-semibold text-emerald-400">{rupiah(item.base_price)}</td><td className="px-4 py-3.5">{item.is_active ? <span className="inline-flex items-center gap-1 text-emerald-400"><Check className="h-3.5 w-3.5" />Aktif</span> : <span className="text-slate-500">Nonaktif</span>}</td><td className="px-5 py-3.5 text-right"><button onClick={() => openEdit(item)} className="mr-2 rounded-lg bg-slate-800 p-1.5 text-slate-300"><Edit2 className="h-3.5 w-3.5" /></button><button onClick={() => setDeleting(item)} className="rounded-lg bg-rose-500/10 p-1.5 text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button></td></tr>)}{nominals.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">{isLoading ? "Memuat nominal..." : "Belum ada nominal."}</td></tr>}</tbody></table></div></div>
    <Pagination currentPage={page} totalItems={data?.meta?.total ?? nominals.length} limit={limit} onPageChange={setPage} onLimitChange={setLimit} isLoading={isLoading} />
    {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"><form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-xs"><div className="flex items-center justify-between border-b border-slate-800 pb-3"><h2 className="text-base font-bold text-white">{editing ? "Edit Nominal" : "Tambah Nominal"}</h2><button type="button" onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div><label className="block text-slate-300">Game<select required disabled={!!editing} value={form.game_id} onChange={(e) => setForm({ ...form, game_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100 disabled:opacity-60"><option value="">Pilih game</option>{gameList.map((game: any) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="text-slate-300">Provider<select required disabled={!!editing} value={form.provider_id} onChange={(e) => setForm({ ...form, provider_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100 disabled:opacity-60"><option value="">Pilih provider</option>{providerList.map((provider: any) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><label className="text-slate-300">Harga Modal<input required min="0" type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100" /></label></div><label className="block text-slate-300">Nama Nominal<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100" /></label><label className="block text-slate-300">SKU Provider<input required value={form.provider_product_code} onChange={(e) => setForm({ ...form, provider_product_code: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 font-mono text-slate-100" /></label><label className="block text-slate-300">SKU Seller (opsional)<input value={form.seller_product_code} onChange={(e) => setForm({ ...form, seller_product_code: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 font-mono text-slate-100" /></label><label className="block text-slate-300">Deskripsi<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100" /></label><label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Aktif</label><div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl bg-slate-800 px-4 py-2 text-slate-300">Batal</button><button className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">Simpan</button></div></form></div>}
    <ConfirmModal isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Hapus Nominal?" message={<>Hapus <strong className="text-white">{deleting?.name}</strong>?</>} confirmText="Hapus" cancelText="Batal" variant="danger" />
  </div>;
}
