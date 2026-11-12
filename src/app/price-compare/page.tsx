"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { RefreshCw, Trophy } from "lucide-react";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);
const paginatedFetcher = (url: string) => api.get(url).then((res) => res.data);

type Cell = { price: number; sku: string } | null;

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);

export default function PriceComparePage() {
  const [selectedGame, setSelectedGame] = useState<string>("");

  const { data: games } = useSWR("/admin/games?limit=1000", fetcher);
  const sortedGames = useMemo(
  () =>
      Array.isArray(games)
        ? [...games].sort((a: any, b: any) =>
            String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base" })
          )
        : [],
    [games]
  );
  const { data: providers } = useSWR("/admin/providers", fetcher);
  const {
    data: resData,
    mutate,
    isLoading,
  } = useSWR(
    `/admin/nominals?page=1&limit=5000&game_id=${selectedGame}&sort_by=base_price&sort_dir=asc`,
    paginatedFetcher,
    { refreshInterval: 60000 }
  );

  const providerList: any[] = Array.isArray(providers) ? providers : [];
  const nominals: any[] = Array.isArray(resData?.data) ? resData.data : [];

  // Kelompokkan per game, urut nama game
  const groups = useMemo(() => {
    const map = new Map<number, { name: string; items: any[] }>();
    nominals.forEach((n) => {
      const key = n.game_id;
      if (!map.has(key)) {
        map.set(key, { name: n.game?.name || `Game #${key}`, items: [] });
      }
      map.get(key)!.items.push(n);
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nominals]);

  // Harga + SKU satu nominal untuk satu provider
  const getCell = (item: any, providerId: number): Cell => {
    const pp = (item.provider_products || []).find((p: any) => p.provider_id === providerId);
    if (pp && pp.cost_price != null && Number(pp.cost_price) > 0) {
      return { price: Number(pp.cost_price), sku: pp.product_code || "" };
    }
    // Data lama: belum ada provider_products, pakai harga modal provider aktif
    const activeId = item.provider_id || item.provider?.id || 0;
    if (!pp && activeId === providerId && Number(item.base_price) > 0) {
      return { price: Number(item.base_price), sku: item.provider_product_code || "" };
    }
    return null;
  };

  const isProviderUsable = (p: any) => p.is_active !== false;

  return (
    <div className="space-y-6">
      {/* Header & filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Perbandingan Harga Provider</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bandingkan harga modal tiap provider per nominal untuk memilih seller termurah
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Semua Game</option>
            {sortedGames.map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => mutate()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
          Harga termurah
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
            Aktif
          </span>
          Provider yang dipakai nominal saat ini
        </span>
        <span>Provider nonaktif tidak dihitung sebagai termurah</span>
      </div>

      {/* Tabel per game */}
      {groups.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-12 text-center text-slate-500 text-xs">
          {isLoading ? "Memuat data..." : "Belum ada nominal."}
        </div>
      ) : (
        groups.map((group) => {
          const itemsMeta = group.items.map((item) => {
            const cells = providerList.map((p) => ({ p, cell: getCell(item, p.id) }));
            const candidates = cells.filter((c) => c.cell && isProviderUsable(c.p));
            const cheapest = candidates.length
              ? Math.min(...candidates.map((c) => c.cell!.price))
              : null;
            const cheapestNames = candidates
              .filter((c) => c.cell!.price === cheapest)
              .map((c) => c.p.name);
            const activeId = item.provider_id || item.provider?.id || 0;
            const activeCell = cells.find((c) => c.p.id === activeId)?.cell || null;
            const diff =
              activeCell && cheapest !== null ? activeCell.price - cheapest : null;

            return { item, cheapest, cheapestNames, activeId, diff };
          });

          return (
            <div
              key={group.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
            >
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">{group.name}</h2>
                <span className="text-[11px] text-slate-500">{group.items.length} nominal</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                      <th className="py-3 px-4 min-w-[160px] sticky left-0 bg-slate-900 z-20 font-bold text-slate-200">
                        Provider
                      </th>
                      {group.items.map((item) => (
                        <th key={item.id} className="py-3 px-4 min-w-[150px]">
                          <span className="font-semibold text-slate-200 block">{item.name}</span>
                          {!item.is_active && (
                            <span className="block text-[10px] font-normal text-slate-500">nonaktif</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {providerList.map((p) => {
                      const isUsable = isProviderUsable(p);
                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-800/20 transition-colors ${
                            isUsable ? "" : "opacity-60"
                          }`}
                        >
                          {/* Samping: Nama Provider */}
                          <td className="py-3 px-4 sticky left-0 bg-slate-900 z-10">
                            <span className={`font-semibold block ${isUsable ? "text-white" : "text-slate-500"}`}>
                              {p.name}
                            </span>
                            {!isUsable && (
                              <span className="text-[10px] text-slate-500">nonaktif</span>
                            )}
                          </td>

                          {/* Kolom per Nominal */}
                          {itemsMeta.map(({ item, cheapest, activeId }) => {
                            const cell = getCell(item, p.id);
                            const isCheapest =
                              !!cell && isUsable && cheapest !== null && cell.price === cheapest;
                            const isActive = p.id === activeId;

                            return (
                              <td
                                key={item.id}
                                className={`py-3 px-4 ${
                                  isCheapest ? "bg-emerald-500/10" : ""
                                }`}
                              >
                                {cell ? (
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`font-semibold ${
                                          isCheapest ? "text-emerald-400" : "text-slate-200"
                                        }`}
                                      >
                                        {formatRupiah(cell.price)}
                                      </span>
                                      {isActive && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
                                          Aktif
                                        </span>
                                      )}
                                    </div>
                                    {cell.sku && (
                                      <span
                                        className="font-mono text-[10px] text-slate-500 block truncate max-w-[130px]"
                                        title={cell.sku}
                                      >
                                        {cell.sku}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-600">—</span>
                                    {isActive && (
                                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
                                        Aktif
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Baris Ringkasan: Termurah */}
                    <tr className="border-t-2 border-slate-700 bg-slate-950/60 font-medium">
                      <td className="py-3 px-4 sticky left-0 bg-slate-900 z-10">
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                          <Trophy className="w-3.5 h-3.5" /> Termurah
                        </span>
                      </td>
                      {itemsMeta.map(({ item, cheapest, cheapestNames }) => (
                        <td key={item.id} className="py-3 px-4">
                          {cheapest !== null ? (
                            <div>
                              <span
                                className="font-semibold text-emerald-400 block truncate max-w-[140px]"
                                title={cheapestNames.join(", ")}
                              >
                                {cheapestNames.join(", ")}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {formatRupiah(cheapest)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Baris Ringkasan: Selisih Aktif */}
                    <tr className="bg-slate-950/40">
                      <td className="py-3 px-4 sticky left-0 bg-slate-900 z-10 text-slate-400 font-semibold">
                        Selisih Aktif
                      </td>
                      {itemsMeta.map(({ item, diff }) => (
                        <td key={item.id} className="py-3 px-4">
                          {diff === null ? (
                            <span className="text-slate-600">—</span>
                          ) : diff > 0 ? (
                            <span className="text-amber-300 font-semibold block">
                              +{formatRupiah(diff)}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold block">Sudah termurah</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}