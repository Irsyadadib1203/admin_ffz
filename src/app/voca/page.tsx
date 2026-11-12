"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Layers,
  Search,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Tag,
  Zap,
  Gamepad2,
  DollarSign,
  Package,
} from "lucide-react";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

interface VocaProduct {
  id: number;
  title: string;
  code: string;
  type: string;
}

interface VocaItem {
  id: number;
  name: string;
  price: number;
  sku: string;
}

export default function VocaCenterPage() {
  const [selectedProduct, setSelectedProduct] = useState<VocaProduct | null>(null);
  const [searchGame, setSearchGame] = useState("");
  const [searchItem, setSearchItem] = useState("");
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Status & Saldo
  const {
    data: status,
    mutate: refreshStatus,
    isLoading: statusLoading,
  } = useSWR("/admin/voca/status", fetcher, {
    revalidateOnFocus: false,
  });

  // Daftar Produk Game dari Voca
  const {
    data: productsData,
    error: productsError,
    isLoading: productsLoading,
    mutate: refreshProducts,
  } = useSWR<VocaProduct[]>("/admin/voca/products", fetcher, {
    revalidateOnFocus: false,
    onSuccess: (data) => {
      if (data && data.length > 0 && !selectedProduct) {
        setSelectedProduct(data[0]);
      }
    },
  });

  // Daftar Item / Nominal untuk produk terpilih
  const {
    data: itemsData,
    error: itemsError,
    isLoading: itemsLoading,
    mutate: refreshItems,
  } = useSWR<{ product_id: number; items: VocaItem[] }>(
    selectedProduct ? `/admin/voca/products/${selectedProduct.id}/items` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const formatRupiah = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleCopy = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => {
      setCopiedSku((curr) => (curr === sku ? null : curr));
    }, 2000);
  };

  const filteredProducts = useMemo(() => {
    if (!productsData || !Array.isArray(productsData)) return [];
    if (!searchGame.trim()) return productsData;
    const q = searchGame.toLowerCase();
    return productsData.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        String(p.id).includes(q)
    );
  }, [productsData, searchGame]);

  const filteredItems = useMemo(() => {
    const list = itemsData?.items || [];
    if (!searchItem.trim()) return list;
    const q = searchItem.toLowerCase();
    return list.filter(
      (it) =>
        (it.name && it.name.toLowerCase().includes(q)) ||
        String(it.id).includes(q) ||
        (it.sku && it.sku.toLowerCase().includes(q))
    );
  }, [itemsData, searchItem]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              <Layers className="h-3.5 w-3.5" />
              Provider Center
            </span>
            <span className="text-slate-500 text-xs">/</span>
            <span className="text-slate-300 text-xs font-medium">Voca Game</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Voca Center
            {status?.is_active ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Aktif
              </span>
            ) : status?.configured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                Nonaktif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20">
                Belum Terhubung
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Katalog produk Voca Game, pengecekan Product ID, Product Item ID, dan salin SKU instan untuk pemetaan nominal.
          </p>
        </div>

        {/* Saldo & Quick Settings */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 shadow-sm">
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Saldo Voca
              </div>
              <div className="font-mono text-sm font-bold text-white">
                {statusLoading ? (
                  <span className="text-slate-500">Memuat...</span>
                ) : status?.balance !== null && status?.balance !== undefined ? (
                  formatRupiah(status.balance)
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                )}
              </div>
            </div>
            <button
              onClick={() => refreshStatus()}
              disabled={statusLoading}
              title="Perbarui Saldo"
              className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <Link
            href="/providers"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <span>Kredensial</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Info SKU Guidance Card */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400 shrink-0">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div className="space-y-1 text-xs text-indigo-200">
            <div className="font-semibold text-white">Format SKU Voca Game:</div>
            <p className="text-slate-300">
              SKU Voca tersusun dari format <code className="rounded bg-indigo-950 px-1.5 py-0.5 font-mono text-indigo-300 border border-indigo-800/50">productId:productItemId</code>.
              Contoh: Jika Produk Game memiliki <strong className="text-white">Product ID: 2</strong> dan nominal memiliki <strong className="text-white">Product Item ID: 6</strong>, maka SKU-nya adalah <code className="rounded bg-indigo-950 px-1.5 py-0.5 font-mono text-emerald-400 border border-emerald-800/50 font-bold">2:6</code>.
            </p>
            <p className="text-slate-400 text-[11px]">
              Klik tombol <strong>"Salin SKU"</strong> pada item di bawah untuk menyalin langsung dan menempelkannya ke kolom SKU Provider di menu{" "}
              <Link href="/nominals" className="text-indigo-400 underline hover:text-indigo-300">
                Nominals & Prices
              </Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Products Explorer + Items SKU Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Game / Product Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Daftar Game & Produk</h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {filteredProducts.length} Produk
              </span>
            </div>

            {/* Search Game */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cari nama game / ID..."
                value={searchGame}
                onChange={(e) => setSearchGame(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Products List */}
            <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
              {productsLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-indigo-400" />
                  Mengambil daftar game dari Voca...
                </div>
              ) : productsError ? (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs text-rose-300 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                    Gagal Terhubung ke Voca
                  </div>
                  <p className="text-[11px] text-rose-200/80">
                    Pastikan Merchant ID dan Secret Key Voca sudah benar di halaman Provider.
                  </p>
                  <button
                    onClick={() => refreshProducts()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/30 transition"
                  >
                    <RefreshCw className="h-3 w-3" /> Coba Lagi
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Tidak ada produk ditemukan.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setSearchItem("");
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition border flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:text-white"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                          {p.title || `Produk #${p.id}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>Code: {p.code || "-"}</span>
                          {p.type && (
                            <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300">
                              {p.type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isSelected
                              ? "bg-indigo-500 text-white"
                              : "bg-slate-800 text-indigo-300"
                          }`}
                        >
                          ID: {p.id}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Items & Generated SKU Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            {selectedProduct ? (
              <div className="space-y-4">
                {/* Header selected product */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">
                        {selectedProduct.title}
                      </h2>
                      <span className="rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-xs font-mono font-bold text-indigo-300">
                        Product ID: {selectedProduct.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Daftar nominal dan kalkulasi SKU resmi untuk transaksi Voca.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Search inside items */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Cari item / nominal / SKU..."
                        value={searchItem}
                        onChange={(e) => setSearchItem(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => refreshItems()}
                      disabled={itemsLoading}
                      title="Segarkan Item"
                      className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:text-white transition disabled:opacity-40"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${itemsLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  {itemsLoading ? (
                    <div className="py-16 text-center text-xs text-slate-500">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
                      Memuat item & kalkulasi SKU dari Voca...
                    </div>
                  ) : itemsError ? (
                    <div className="p-6 rounded-xl border border-rose-500/20 bg-rose-500/10 text-center text-xs text-rose-300 space-y-2">
                      <AlertCircle className="h-6 w-6 text-rose-400 mx-auto" />
                      <div className="font-semibold text-white">Gagal Memuat Item Produk</div>
                      <p className="text-rose-200/80">
                        {itemsError?.response?.data?.message || itemsError.message || "Terjadi kesalahan saat memuat item produk"}
                      </p>
                      <button
                        onClick={() => refreshItems()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/30 transition"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang
                      </button>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-500">
                      <Package className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                      Tidak ada item atau nominal ditemukan pada produk ini.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-medium">
                          <th className="pb-3 pr-3">Product Item ID</th>
                          <th className="pb-3 px-3">Nama Nominal / Item</th>
                          <th className="pb-3 px-3">Harga Modal</th>
                          <th className="pb-3 px-3">Generated SKU</th>
                          <th className="pb-3 pl-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredItems.map((item) => {
                          const isCopied = copiedSku === item.sku;
                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="py-3 pr-3 font-mono text-slate-300">
                                <span className="inline-block rounded-md bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-slate-300 border border-slate-700/50">
                                  #{item.id}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-medium text-white">{item.name}</span>
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-200">
                                {formatRupiah(item.price)}
                              </td>
                              <td className="py-3 px-3">
                                <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 font-mono text-xs font-bold text-indigo-300">
                                  <Tag className="h-3 w-3 text-indigo-400" />
                                  <span>{item.sku}</span>
                                </div>
                              </td>
                              <td className="py-3 pl-3 text-right">
                                <button
                                  onClick={() => handleCopy(item.sku)}
                                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                                    isCopied
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                      : "bg-indigo-600 text-white hover:bg-indigo-500"
                                  }`}
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                      <span>Tersalin!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5" />
                                      <span>Salin SKU</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-500 space-y-2">
                <Gamepad2 className="h-8 w-8 mx-auto text-slate-600" />
                <div className="text-slate-300 font-semibold text-sm">Pilih Game di Kolom Kiri</div>
                <p>Klik salah satu game untuk menampilkan daftar item dan kode SKU resminya.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
