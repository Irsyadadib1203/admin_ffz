"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Check,
  Copy,
  DollarSign,
  ExternalLink,
  Layers,
  Package,
  RefreshCw,
  Search,
  Tag,
} from "lucide-react";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

type TopupKuyStatus = {
  configured: boolean;
  is_active: boolean;
  balance: number | null;
  balance_err?: string;
};

type CatalogItem = {
  product_code: string;
  name: string;
  base_price: number;
  is_active: boolean;
};

const formatRupiah = (value?: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function TopupKuyPage() {
  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [gameId, setGameId] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [isCreatingNominals, setIsCreatingNominals] = useState(false);
  const {
    data: status,
    mutate: refreshStatus,
    isLoading: statusLoading,
  } = useSWR<TopupKuyStatus>("/admin/topupkuy/status", fetcher);
  const {
    data: products,
    error: productsError,
    mutate: refreshProducts,
    isLoading: productsLoading,
  } = useSWR<CatalogItem[]>("/admin/topupkuy/products", fetcher);
  const { data: games } = useSWR<any[]>("/admin/games?limit=500", fetcher);
  const { data: providers } = useSWR<any[]>("/admin/providers", fetcher);
  const selectedGame = games?.find((game: any) => String(game.id) === gameId);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const gameQuery = selectedGame?.name?.toLowerCase().trim();
    return (products || []).filter((product) =>
      (!query || `${product.name} ${product.product_code}`.toLowerCase().includes(query)) &&
      (!gameQuery || product.name.toLowerCase().includes(gameQuery))
    );
  }, [products, search, selectedGame]);

  const toggleProduct = (code: string) => setSelectedCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  const toggleAllProducts = () => setSelectedCodes((current) => current.length === filteredProducts.length ? [] : filteredProducts.map((item) => item.product_code));
  const createNominals = async () => {
    if (!gameId || selectedCodes.length === 0) return;
    const provider = providers?.find((item: any) => String(item.code).toUpperCase() === "TOPUPKUY");
    if (!provider) return alert("Provider TopupKuy belum tersedia. Atur dahulu pada Providers Center.");
    setIsCreatingNominals(true);
    try {
      const items = (products || []).filter((item) => selectedCodes.includes(item.product_code));
      const existingResponse = await api.get(`/admin/nominals?limit=1000&game_id=${gameId}&provider_id=${provider.id}`);
      const existingCodes = new Set((existingResponse.data?.data || []).map((item: any) => item.provider_product_code));
      const newItems = items.filter((item) => !existingCodes.has(item.product_code));
      await Promise.all(newItems.map((item) => api.post("/admin/nominals", {
        game_id: Number(gameId), provider_id: provider.id, name: item.name, base_price: item.base_price,
        provider_product_code: item.product_code, seller_product_code: item.product_code,
        is_active: item.is_active,
      })));
      setSelectedCodes([]);
      const skipped = items.length - newItems.length;
      alert(`${newItems.length} nominal TopupKuy berhasil dibuat.${skipped ? ` ${skipped} SKU yang sudah ada dilewati.` : ""}`);
    } catch (error: any) {
      alert("Sebagian nominal mungkin belum dibuat: " + (error.response?.data?.message || error.message));
    } finally { setIsCreatingNominals(false); }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(""), 1800);
    } catch {
      window.prompt("Salin SKU TopupKuy berikut:", code);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400">
              <Layers className="h-3.5 w-3.5" /> Provider Center
            </span>
            <span className="text-xs text-slate-500">/</span>
            <span className="text-xs font-medium text-slate-300">TopupKuy</span>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            TopupKuy Center
            {status?.is_active ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Aktif
              </span>
            ) : status?.configured ? (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">Nonaktif</span>
            ) : (
              <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400">Belum Terhubung</span>
            )}
          </h1>
          <p className="mt-1 text-xs text-slate-400">Cek saldo dan katalog TopupKuy, lalu salin SKU untuk dipetakan ke nominal lokal.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 shadow-sm">
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400"><DollarSign className="h-4 w-4" /></div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Saldo TopupKuy</div>
              <div className="font-mono text-sm font-bold text-slate-100">
                {statusLoading ? "Memuat..." : status?.balance == null ? "-" : formatRupiah(status.balance)}
              </div>
            </div>
            <button onClick={() => refreshStatus()} disabled={statusLoading} title="Perbarui saldo" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-40">
              <RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <Link href="/providers" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white">
            Kredensial <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs">
        <p className="font-semibold text-slate-100">SKU TopupKuy langsung memakai Product Code.</p>
        <p className="mt-1 text-slate-300">Pilih game lokal untuk menyaring produk berdasarkan nama game, lalu pilih beberapa produk untuk membuat nominal sekaligus dengan SKU dan harga modal TopupKuy.</p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Katalog Produk</h2>
            <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">{filteredProducts.length} produk</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={gameId} onChange={(event) => { setGameId(event.target.value); setSelectedCodes([]); }} className="max-w-[190px] rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500">
              <option value="">Filter game lokal</option>{games?.map((game: any) => <option key={game.id} value={game.id}>{game.name}</option>)}
            </select>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama produk / SKU..." className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500" />
            </div>
            <button onClick={() => refreshProducts()} disabled={productsLoading} title="Muat ulang katalog" className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 transition hover:text-white disabled:opacity-40">
              <RefreshCw className={`h-3.5 w-3.5 ${productsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {selectedCodes.length > 0 && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3"><span className="text-xs font-semibold text-indigo-200">{selectedCodes.length} produk dipilih{selectedGame ? ` untuk ${selectedGame.name}` : ""}</span><button onClick={createNominals} disabled={!gameId || isCreatingNominals} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{isCreatingNominals ? "Membuat nominal..." : "Buat Nominal Terpilih"}</button></div>}

        {productsError ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-center text-xs text-rose-300">Gagal memuat katalog. Pastikan API Key dan URL TopupKuy sudah benar.</div>
        ) : productsLoading ? (
          <div className="py-16 text-center text-xs text-slate-500"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-400" />Memuat katalog TopupKuy...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">Tidak ada produk ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-max min-w-full table-auto text-left text-xs">
              <thead><tr className="border-b border-slate-800 text-slate-400"><th className="px-3 py-3"><input type="checkbox" checked={filteredProducts.length > 0 && selectedCodes.length === filteredProducts.length} onChange={toggleAllProducts} /></th><th className="px-3 py-3">Produk</th><th className="px-3 py-3">Harga Modal</th><th className="px-3 py-3">SKU / Product Code</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.map((product) => (
                  <tr key={product.product_code} className="transition-colors hover:bg-slate-800/30">
                    <td className="px-3 py-3"><input type="checkbox" checked={selectedCodes.includes(product.product_code)} onChange={() => toggleProduct(product.product_code)} /></td>
                    <td className="max-w-[340px] px-3 py-3 font-medium text-slate-100"><span className="block truncate">{product.name || "-"}</span></td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-slate-200">{formatRupiah(product.base_price)}</td>
                    <td className="px-3 py-3"><span className="inline-flex max-w-[280px] items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 font-mono font-bold text-indigo-300"><Tag className="h-3 w-3 shrink-0 text-indigo-400" /><span className="truncate">{product.product_code}</span></span></td>
                    <td className="px-3 py-3"><span className={product.is_active ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400" : "rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-400"}>{product.is_active ? "Aktif" : "Nonaktif"}</span></td>
                    <td className="px-3 py-3 text-right"><button onClick={() => copyCode(product.product_code)} className={copiedCode === product.product_code ? "inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300" : "inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"}>{copiedCode === product.product_code ? <><Check className="h-3.5 w-3.5" />Tersalin</> : <><Copy className="h-3.5 w-3.5" />Salin SKU</>}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
