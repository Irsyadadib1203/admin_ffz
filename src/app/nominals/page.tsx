"use client";

import { useState } from "react";
import useSWR from "swr";
import { createPortal } from "react-dom";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  ArrowRightLeft,
  Zap,
  Flame,
  Layers,
  Filter,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);
const paginatedFetcher = (url: string) => api.get(url).then((res) => res.data);
type PPEdit = { product_code: string; cost_price: string; auto_sync_price: boolean };
const EMPTY_PP: PPEdit = { product_code: "", cost_price: "", auto_sync_price: true };

const calcTierPrices = (base: number, marginPct: number) => {
  const margin = base * (marginPct / 100);
  return {
    price_public: Math.round(base + margin),
    price_member: Math.round(base + margin * 0.85),
    price_vip: Math.round(base + margin * 0.7),
    price_reseller: Math.round(base + margin * 0.5),
  };
};

const ppEqual = (a?: PPEdit, b?: PPEdit) => {
  const x = a || EMPTY_PP, y = b || EMPTY_PP;
  return (
    x.product_code.trim() === y.product_code.trim() &&
    x.cost_price === y.cost_price &&
    x.auto_sync_price === y.auto_sync_price
  );
};

const buildEdits = (item: any): Record<number, PPEdit> => {
  const edits: Record<number, PPEdit> = {};
  if (Array.isArray(item?.provider_products)) {
    item.provider_products.forEach((pp: any) => {
      edits[pp.provider_id] = {
        product_code: pp.product_code || "",
        cost_price: pp.cost_price != null ? String(pp.cost_price) : "",
        auto_sync_price: pp.auto_sync_price !== false,
      };
    });
  }
  // Data lama: provider_product_code = SKU provider aktif
  const activeId = item?.provider_id || item?.provider?.id || 0;
  if (activeId && !edits[activeId]?.product_code && item?.provider_product_code) {
    edits[activeId] = { ...(edits[activeId] || EMPTY_PP), product_code: item.provider_product_code };
  }
  return edits;
};

export default function NominalsPage() {
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState<"" | "name" | "base_price">("base_price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Klik 1: naik, klik 2: turun, klik 3: kembali ke default (harga termurah)
  const toggleSort = (key: "name" | "base_price") => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortBy("base_price");
      setSortDir("asc");
    }
    setPage(1);
  };

  const sortIcon = (key: "name" | "base_price") => {
    if (sortBy !== key) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 text-indigo-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-400" />
    );
  };

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNominal, setEditingNominal] = useState<any | null>(null);

  // Selected items for bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Switch Provider Modal state
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [switchTargetProvider, setSwitchTargetProvider] = useState<number>(1);
  const [switchScope, setSwitchScope] = useState<"game" | "selected">("game");
  const [switchGameId, setSwitchGameId] = useState<number>(1);
  const [isSwitching, setIsSwitching] = useState(false);

  // Switch Provider Result Modal state
  const [switchResult, setSwitchResult] = useState<{
    isOpen: boolean;
    totalRequested: number;
    switchedCount: number;
    skippedCount: number;
    skippedItems: string[];
    message: string;
    targetProviderName?: string;
  } | null>(null);

  // Confirm states
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    nominalId: number | null;
    nominalName: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    nominalId: null,
    nominalName: "",
    isLoading: false,
  });

  const [confirmEdit, setConfirmEdit] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false,
  });

  // State untuk edit SKU & harga modal per provider (dinamis)
  const [providerProductEdits, setProviderProductEdits] = useState<Record<number, PPEdit>>({});
  const [initialPP, setInitialPP] = useState<Record<number, PPEdit>>({});
  const [isCreating, setIsCreating] = useState(false);

  const changedProviderIds = Array.from(
    new Set([...Object.keys(providerProductEdits), ...Object.keys(initialPP)])
  )
    .map(Number)
    .filter((id) => !ppEqual(providerProductEdits[id], initialPP[id]));
  const isPPDirty = !!editingNominal && changedProviderIds.length > 0;
  const [isSavingPP, setIsSavingPP] = useState(false);
  const [ppSaveResult, setPpSaveResult] = useState<"success" | "error" | null>(null);


  const { data: games } = useSWR("/admin/games?limit=1000", fetcher);
  const sortedGames = Array.isArray(games)
  ? [...games].sort((a: any, b: any) =>
      String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base" })
    )
  : [];
  const { data: providers } = useSWR("/admin/providers", fetcher);
  const {
    data: resData,
    mutate,
    isLoading,
  } = useSWR(
    `/admin/nominals?page=${page}&limit=${limit}&game_id=${selectedGame}&provider_id=${selectedProvider}&search=${search}&is_active=${statusFilter}&sort_by=${sortBy}&sort_dir=${sortBy ? sortDir : ""}`,
    paginatedFetcher
  );

  const nominals = Array.isArray(resData?.data) ? resData.data : [];
  const totalItems = resData?.meta?.total ?? nominals.length;

  const [formData, setFormData] = useState({
    game_id: 1,
    provider_id: 1,
    name: "",
    description: "",
    base_price: 10000,
    margin_percent: 8,
    margin_flat: 0,
    price_public: 10800,
    price_member: 10600,
    price_vip: 10400,
    price_reseller: 10200,
    provider_product_code: "",
    kiosgamer_product_code: "",
    seller_product_code: "",
    is_active: true,
  });
  const originalProviderId: number = editingNominal
    ? editingNominal.provider_id || editingNominal.provider?.id || 0
    : 0;
  const isProviderChanged =
    !!editingNominal && originalProviderId !== 0 && formData.provider_id !== originalProviderId;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleBasePriceOrMarginChange = (base: number, marginPct: number) => {
    const margin = base * (marginPct / 100);
    setFormData((prev) => ({
      ...prev,
      base_price: base,
      margin_percent: marginPct,
      price_public: Math.round(base + margin),
      price_member: Math.round(base + margin * 0.85),
      price_vip: Math.round(base + margin * 0.7),
      price_reseller: Math.round(base + margin * 0.5),
    }));
  };

  const openCreateModal = () => {
    setEditingNominal(null);
    setFormData({
      game_id: games && games.length > 0 ? games[0].id : 1,
      provider_id: providers && providers.length > 0 ? providers[0].id : 1,
      name: "",
      description: "Proses instan 1-3 detik",
      base_price: 10000,
      margin_percent: 8,
      margin_flat: 0,
      price_public: 10800,
      price_member: 10600,
      price_vip: 10400,
      price_reseller: 10200,
      provider_product_code: "",
      kiosgamer_product_code: "",
      seller_product_code: "",
      is_active: true,
    });
    setProviderProductEdits({});
    setInitialPP({});
    setPpSaveResult(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingNominal(item);
    setFormData({
      game_id: item.game_id,
      provider_id: item.provider_id || (item.provider?.id ?? 1),
      name: item.name,
      description: item.description || "",
      base_price: item.base_price,
      margin_percent: item.margin_percent,
      margin_flat: item.margin_flat || 0,
      price_public: item.price_public,
      price_member: item.price_member,
      price_vip: item.price_vip,
      price_reseller: item.price_reseller,
      provider_product_code: item.provider_product_code,
      kiosgamer_product_code: item.kiosgamer_product_code || "",
      seller_product_code: item.seller_product_code || item.provider_product_code,
      is_active: item.is_active,
    });

    // Inisialisasi edits dari provider_products yang ada (data existing dari DB)
    const edits = buildEdits(item);
    setProviderProductEdits(edits);
    setInitialPP(edits);
    setPpSaveResult(null);
    setIsModalOpen(true);
  };


  const validateForm = (): string | null => {
  const activeId = editingNominal ? originalProviderId : formData.provider_id;
  const sku = (providerProductEdits[activeId]?.product_code || "").trim();
  if (!sku) return "SKU provider aktif wajib diisi.";
  // Cegah perubahan harga modal/toggle yang SKU-nya kosong (entry akan terbuang diam-diam)
  for (const id of changedProviderIds) {
    if (!(providerProductEdits[id]?.product_code || "").trim()) {
      const name = providers?.find((p: any) => p.id === id)?.name ?? `#${id}`;
      return `Provider ${name}: isi SKU dulu sebelum mengubah harga modal / auto-sync.`;
    }
  }
  return null;
};
const validateProviderSwitch = (): string | null => {
  if (!isProviderChanged) return null;
  const target = providerProductEdits[formData.provider_id];
  const name = providers?.find((p: any) => p.id === formData.provider_id)?.name ?? "provider tujuan";
  if (!(target?.product_code || "").trim()) {
    return `Untuk pindah ke ${name}, isi SKU ${name} dulu di bagian SKU & Harga Modal.`;
  }
  const cost = parseFloat(target?.cost_price || "");
  if (!(cost > 0)) {
    return `Untuk pindah ke ${name}, isi Harga Modal ${name} (harus lebih dari 0).`;
  }
  return null;
};

const buildChangedEntries = () =>
  changedProviderIds
    .map((id) => {
      const v = providerProductEdits[id] || EMPTY_PP;
      return {
        provider_id: id,
        product_code: v.product_code.trim(),
        cost_price: v.cost_price !== "" ? parseFloat(v.cost_price) : null,
        auto_sync_price: v.auto_sync_price,
      };
    })
    .filter((e) => e.product_code !== "");

// Simpan SKU/harga modal yang berubah, lalu ambil data terbaru dari server
const syncProviderProducts = async () => {
  const entries = buildChangedEntries();
  if (entries.length > 0) {
    await api.put(`/admin/nominals/${editingNominal.id}/provider-products`, entries);
  }
  const fresh = await mutate();
  const freshItem =
    (Array.isArray(fresh?.data) && fresh.data.find((n: any) => n.id === editingNominal.id)) || null;

  let newBase: number | null = null;
  if (freshItem?.base_price != null) newBase = Number(freshItem.base_price);
  else {
    const c = providerProductEdits[originalProviderId]?.cost_price;
    if (c) newBase = parseFloat(c);
  }
  if (newBase !== null && (Number.isNaN(newBase) || newBase === Number(formData.base_price))) {
    newBase = null;
  }
  if (freshItem) {
    const e = buildEdits(freshItem);
    setProviderProductEdits(e);
    setInitialPP(e);
    setEditingNominal(freshItem);
  }
  return newBase;
};

const buildNominalPayload = (data = formData) => {
  const pid = editingNominal ? originalProviderId : data.provider_id;
  const activeSku = (providerProductEdits[pid]?.product_code || "").trim();
  return {
    ...data,
    provider_id: pid,
    provider_product_code: activeSku || data.provider_product_code,
    seller_product_code: data.seller_product_code || activeSku,
  };
};

const handleFormSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const err = validateForm() || validateProviderSwitch();
  if (err) return alert(err);
  if (editingNominal) setConfirmEdit({ isOpen: true, isLoading: false });
  else executeSave();
};

const executeSave = async () => {
  try {
    if (editingNominal) {
      setConfirmEdit((p) => ({ ...p, isLoading: true }));
      // 1) SKU & harga modal dulu, supaya dual-write backend membaca cost price yang benar
      const newBase = await syncProviderProducts();
      const data =
        newBase !== null
          ? { ...formData, base_price: newBase, ...calcTierPrices(newBase, formData.margin_percent) }
          : formData;
      // 2) Data nominal
      await api.put(`/admin/nominals/${editingNominal.id}`, buildNominalPayload(data));

      // 3) Pindah provider (validasi, harga, dan SKU dihitung backend)
      if (isProviderChanged) {
        const res = await api.post("/admin/nominals/batch-switch-provider", {
          nominal_ids: [editingNominal.id],
          provider_id: formData.provider_id,
        });
        const r = res.data?.data;
        if (!r || (r.switched_count ?? 0) < 1) {
          setConfirmEdit({ isOpen: false, isLoading: false });
          alert(
            "Perubahan lain sudah tersimpan, tetapi provider TIDAK dipindah:\n" +
              ((r?.skipped_items || []).join("\n") || res.data?.message || "Alasan tidak diketahui.")
          );
          setIsModalOpen(false);
          mutate();
          return;
        }
      }
      setConfirmEdit({ isOpen: false, isLoading: false });
        } else {
      if (isCreating) return;
      setIsCreating(true);

      // Harga modal provider aktif (kalau diisi) jadi modal dasar + hitung ulang tier
      const activeCost = parseFloat(providerProductEdits[formData.provider_id]?.cost_price || "");
      const data =
        activeCost > 0
          ? { ...formData, base_price: activeCost, ...calcTierPrices(activeCost, formData.margin_percent) }
          : formData;

      const res = await api.post("/admin/nominals", buildNominalPayload(data));
      const newId = res.data?.data?.id;
      const entries = buildChangedEntries();
      if (newId && entries.length > 0) {
        try {
          await api.put(`/admin/nominals/${newId}/provider-products`, entries);
        } catch (ppErr: any) {
          alert(
            "Nominal sudah dibuat, tetapi SKU/harga modal provider gagal disimpan: " +
              (ppErr.response?.data?.message || ppErr.message) +
              "\nSilakan edit nominal tersebut dan simpan ulang SKU & harga."
          );
        }
      }
    }
    setIsModalOpen(false);
    mutate();
  } catch (err: any) {
    setConfirmEdit((p) => ({ ...p, isLoading: false }));
    alert("Error: " + (err.response?.data?.message || err.message));
  } finally {
    setIsCreating(false);
  }
};

const saveProviderProducts = async () => {
  if (!editingNominal) return;
  const err = validateForm();
  if (err) return alert(err);
  setIsSavingPP(true);
  setPpSaveResult(null);
  try {
    const newBase = await syncProviderProducts();
    if (newBase !== null) {
      setFormData((prev) => ({ ...prev, base_price: newBase, ...calcTierPrices(newBase, prev.margin_percent) }));
    }
    setPpSaveResult("success");
    setTimeout(() => setPpSaveResult(null), 3000);
  } catch (e: any) {
    setPpSaveResult("error");
    setTimeout(() => setPpSaveResult(null), 3000);
    alert("Gagal menyimpan: " + (e.response?.data?.message || e.message));
  } finally {
    setIsSavingPP(false);
  }
};

  const promptDelete = (id: number, name: string) => {
    setConfirmDelete({
      isOpen: true,
      nominalId: id,
      nominalName: name,
      isLoading: false,
    });
  };

  const executeDelete = async () => {
    if (!confirmDelete.nominalId) return;
    setConfirmDelete((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.delete(`/admin/nominals/${confirmDelete.nominalId}`);
      setConfirmDelete({ isOpen: false, nominalId: null, nominalName: "", isLoading: false });
      mutate();
    } catch (err: any) {
      setConfirmDelete((prev) => ({ ...prev, isLoading: false }));
      alert("Gagal menghapus: " + (err.response?.data?.message || err.message));
    }
  };


  // Open Switch Provider Modal
  const openSwitchProviderModal = (presetGameId?: number) => {
    if (presetGameId) {
      setSwitchGameId(presetGameId);
      setSwitchScope("game");
    } else if (selectedIds.length > 0) {
      setSwitchScope("selected");
    } else {
      setSwitchScope("game");
      if (selectedGame) {
        setSwitchGameId(parseInt(selectedGame));
      } else if (games && games.length > 0) {
        setSwitchGameId(games[0].id);
      }
    }

    if (providers && providers.length > 1) {
      // Pick first provider or opposite of current
      setSwitchTargetProvider(providers[0].id);
    }
    setIsSwitchModalOpen(true);
  };

  const executeSwitchProvider = async () => {
    if (!switchTargetProvider) return;
    setIsSwitching(true);
    try {
      let res;
      if (switchScope === "selected" && selectedIds.length > 0) {
        res = await api.post("/admin/nominals/batch-switch-provider", {
          nominal_ids: selectedIds,
          provider_id: switchTargetProvider,
        });
      } else {
        res = await api.post("/admin/nominals/batch-switch-provider", {
          game_id: switchGameId,
          provider_id: switchTargetProvider,
        });
      }
      setIsSwitchModalOpen(false);
      setSelectedIds([]);
      mutate();

      const resultData = res.data?.data;
      const targetProv = providers?.find((p: any) => p.id === switchTargetProvider);
      if (resultData) {
        setSwitchResult({
          isOpen: true,
          totalRequested: resultData.total_requested || 0,
          switchedCount: resultData.switched_count || 0,
          skippedCount: resultData.skipped_count || 0,
          skippedItems: resultData.skipped_items || [],
          message: res.data?.message || "Proses pemindahan provider selesai.",
          targetProviderName: targetProv ? `${targetProv.name} (${targetProv.code})` : "Provider Target",
        });
      }
    } catch (err: any) {
      alert("Gagal memindahkan provider: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSwitching(false);
    }
  };

  const toggleSelectAll = () => {
    if (!nominals) return;
    if (selectedIds.length === nominals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(nominals.map((n: any) => n.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Badge warna berputar berdasarkan hash ID provider agar setiap provider punya warna unik
  const PROVIDER_BADGE_COLORS = [
    "bg-sky-500/10 border-sky-500/30 text-sky-400",
    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    "bg-violet-500/10 border-violet-500/30 text-violet-400",
    "bg-amber-500/10 border-amber-500/30 text-amber-400",
    "bg-rose-500/10 border-rose-500/30 text-rose-400",
    "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
  ];
  const PROVIDER_BADGE_ICONS = [Zap, Flame, Layers, Zap, Flame, Layers];

  const getProviderBadge = (provider: any, providerId?: number) => {
    const name = provider?.name || provider?.code || `Provider #${providerId ?? "?"}`;
    const idx = ((provider?.id ?? providerId ?? 0) - 1 + PROVIDER_BADGE_COLORS.length) % PROVIDER_BADGE_COLORS.length;
    const colorClass = PROVIDER_BADGE_COLORS[idx];
    const Icon = PROVIDER_BADGE_ICONS[idx];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
        <Icon className="w-3 h-3" />
        {name}
      </span>
    );
  };


  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Nominal & Multi-Tier Pricing</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Atur harga jual, SKU, dan alokasi provider pemrosesan (Digiflazz / Kiosgamer)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch Provider Button */}
          <button
            onClick={() => openSwitchProviderModal()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Pindah Provider {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</span>
          </button>

          {/* Create Nominal Button */}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah Nominal
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Game Filter */}
          <div className="flex-1 sm:flex-initial">
            <select
              value={selectedGame}
              onChange={(e) => {
                setSelectedGame(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Semua Game</option>
              {sortedGames.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Provider Filter */}
          <div className="flex-1 sm:flex-initial">
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Semua Provider</option>
              {providers?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  Provider: {p.name}
                </option>
              ))}
            </select>
          </div>
          {/* Status Filter */}
          <div className="flex-1 sm:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "" | "true" | "false");
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-60">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari item / SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Pricing Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      nominals && nominals.length > 0 && selectedIds.length === nominals.length
                    }
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                </th>
                  <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors"
                    title="Urutkan berdasarkan nama item"
                  >
                    Game & Item {sortIcon("name")}
                  </button>
                </th>
                <th className="py-3.5 px-3">Provider</th>
                <th className="py-3.5 px-3">SKU Provider / Seller</th>
                  <th className="py-3.5 px-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("base_price")}
                    className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors"
                    title="Urutkan berdasarkan modal dasar"
                  >
                    Modal Dasar {sortIcon("base_price")}
                  </button>
                </th>
                <th className="py-3.5 px-3">Harga Publik</th>
                <th className="py-3.5 px-3">Harga Member</th>
                <th className="py-3.5 px-3">Reseller H2H</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {nominals && nominals.length > 0 ? (
                nominals.map((item: any) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/20 transition-colors ${
                        isChecked ? "bg-indigo-950/20" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(item.id)}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="text-[10px] text-indigo-400 font-semibold block">
                            {item.game?.name || "Game ID #" + item.game_id}
                          </span>
                          <span className="font-semibold text-white text-xs sm:text-sm">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {getProviderBadge(item.provider, item.provider_id)}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-300">
                    {(() => {
                      const activeId = item.provider_id || item.provider?.id || 0;
                      const activePP = Array.isArray(item.provider_products)
                        ? item.provider_products.find((pp: any) => pp.provider_id === activeId)
                        : null;
                      // Fallback ke provider_product_code untuk data lama yang belum punya provider_products
                      const activeSku = activePP?.product_code || item.provider_product_code || "—";
                      const activeName = activePP?.provider?.name || item.provider?.name || `#${activeId}`;
                      return (
                        <div className="space-y-0.5">
                          <span className="block text-[10px] text-slate-400">
                            <span className="text-slate-500">{activeName}:</span>{" "}
                            <span className="text-slate-200">{activeSku}</span>
                          </span>
                          <span className="text-amber-400 font-medium text-[11px] block">
                            H2H: {item.seller_product_code || activeSku}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                      <td className="py-3.5 px-3 font-medium text-slate-400">
                        {formatRupiah(item.base_price)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-emerald-400">
                        {formatRupiah(item.price_public)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-sky-400">
                        {formatRupiah(item.price_member)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-amber-300">
                        {formatRupiah(item.price_reseller)}
                      </td>
                      <td className="py-3.5 px-3">
                        {item.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <Check className="w-3.5 h-3.5" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                            <X className="w-3.5 h-3.5" /> Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Edit Nominal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => promptDelete(item.id, item.name)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Hapus Nominal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    {isLoading ? "Memuat data nominal..." : "Belum ada nominal produk."}
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

      {/* Modal Add / Edit Nominal */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {editingNominal
                    ? "Edit Nominal: " + editingNominal.name
                    : "Tambah Nominal Produk"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                {/* Game and Provider Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Pilih Game *</label>
                    <select
                      value={formData.game_id}
                      onChange={(e) =>
                        setFormData({ ...formData, game_id: parseInt(e.target.value) })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {games?.map((g: any) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Provider Pemrosesan *</label>
                    <select
                      value={formData.provider_id}
                      onChange={(e) => setFormData({ ...formData, provider_id: parseInt(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold text-indigo-300"
                    >
                      {providers?.map((p: any) => (
                        <option key={p.id} value={p.id} disabled={!p.is_active}>
                          {p.name} ({p.code}){!p.is_active ? " — belum dikonfigurasi" : ""}
                        </option>
                      ))}
                    </select>
                    {isProviderChanged && (
                      <p className="text-[10px] text-amber-400 mt-1">
                        Provider akan dipindah saat klik <strong>Simpan Perubahan</strong>. Harga modal, harga jual, dan SKU
                        mengikuti provider tujuan, jadi pastikan SKU dan harga modalnya sudah terisi di bagian bawah.
                      </p>
                    )}
                  </div>
                </div>
                {/* Nama Nominal & SKU Seller */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nama Nominal *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 86 Diamonds / Free Fire 140 DM"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-amber-300 font-medium mb-1">
                      SKU Seller / H2H
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: MLBB_86, FF_140DM"
                      value={formData.seller_product_code}
                      onChange={(e) =>
                        setFormData({ ...formData, seller_product_code: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-amber-500/30 rounded-xl py-2 px-3 text-amber-200 focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Kode untuk customer H2H/reseller. Kosong = pakai SKU provider utama.
                    </p>
                  </div>
                </div>

                {/* Warning if Kiosgamer selected on non-supported game */}
                {(() => {
                  const selectedProv = providers?.find((p: any) => p.id === formData.provider_id);
                  const isKios = selectedProv?.code?.toUpperCase() === "KIOSGAMER";
                  const curGame = games?.find((g: any) => g.id === formData.game_id);
                  const gSlug = (curGame?.slug || "").toLowerCase();
                  const gName = (curGame?.name || "").toLowerCase();
                  const isGarena =
                    gSlug.includes("free-fire") || gSlug.includes("freefire") || gName.includes("free fire") ||
                    gSlug.includes("codm") || gSlug.includes("call-of-duty") ||
                    gName.includes("call of duty") || gName.includes("codm");


                  if (isKios && !isGarena) {
                    return (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                        <span>
                          <strong>Peringatan Kompatibilitas:</strong> Game <u>{curGame?.name || "ini"}</u> tidak didukung oleh Kiosgamer. Kiosgamer hanya melayani game Garena (Free Fire & CODM). Transaksi akan otomatis fallback/gagal jika tetap dipaksakan.
                        </span>
                      </div>
                    );
                  }
                  if (isKios && !(providerProductEdits[formData.provider_id]?.product_code || "").trim()) {
                    return (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                        <span>
                          <strong>Wajib Diisi:</strong> Anda memilih Provider Kiosgamer. Pastikan kolom <strong>SKU Kiosgamer</strong> di bawah telah diisi dengan <code>item_id</code> produk resmi Kiosgamer.
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                

                {/* SKU Provider — Dynamic per provider */}
                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">SKU & Harga Modal per Provider</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {editingNominal
                          ? "Edit SKU dan harga modal lalu klik \"Simpan SKU & Harga\" untuk menyimpan."
                          : "SKU provider utama wajib diisi. Provider lain opsional. Semua tersimpan otomatis saat nominal dibuat."}
                      </p>
                      {isPPDirty && (
                        <p className="text-[10px] text-amber-400 mt-1">
                          Ada perubahan SKU/harga modal yang belum disimpan. Akan ikut tersimpan saat klik "Simpan Perubahan".
                        </p>
                      )}
                    </div>
                    {editingNominal && (
                      <button
                        type="button"
                        onClick={saveProviderProducts}
                        disabled={isSavingPP || !isPPDirty}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                          ppSaveResult === "success"
                            ? "bg-emerald-600 text-white"
                            : ppSaveResult === "error"
                            ? "bg-rose-600 text-white"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                        } disabled:opacity-50`}
                      >
                        {isSavingPP ? "Menyimpan..." : ppSaveResult === "success"
                          ? <><Check className="w-3.5 h-3.5" /> Tersimpan!</>
                          : isPPDirty ? "Simpan SKU & Harga •" : "Simpan SKU & Harga"}
                      </button>
                    )}
                  </div>

                  {/* Loop per provider */}
                                    <div className="space-y-2.5">
                    {(providers || []).map((prov: any) => {
                      const isSelected = formData.provider_id === prov.id;
                      const ppEdit = providerProductEdits[prov.id] || EMPTY_PP;
                      const cardColors = [
                        "border-sky-500/40 bg-sky-950/30",
                        "border-emerald-500/40 bg-emerald-950/30",
                        "border-violet-500/40 bg-violet-950/30",
                        "border-amber-500/40 bg-amber-950/30",
                        "border-rose-500/40 bg-rose-950/30",
                        "border-cyan-500/40 bg-cyan-950/30",
                      ];
                      const labelColors = ["text-sky-300", "text-emerald-300", "text-violet-300", "text-amber-300", "text-rose-300", "text-cyan-300"];
                      const colorIdx = (prov.id - 1 + cardColors.length) % cardColors.length;
                      return (
                        <div
                          key={prov.id}
                          className={`rounded-xl border p-3 ${cardColors[colorIdx]} ${isSelected ? "ring-1 ring-indigo-500/50" : ""}`}
                        >
                          {/* Header: nama, badge, toggle */}
                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className={`text-xs font-bold ${labelColors[colorIdx]}`}>{prov.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">({prov.code})</span>
                              {isSelected && (
                                <span className="text-[10px] bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-full font-semibold">
                                  {isProviderChanged ? "Provider Tujuan" : "Provider Aktif"}
                                </span>
                              )}
                              {isProviderChanged && prov.id === originalProviderId && (
                                <span className="text-[10px] text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded-full">
                                  Saat ini
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className="text-[10px] text-slate-400"
                                title={ppEdit.auto_sync_price ? "Harga modal ikut sync otomatis dari provider" : "Harga modal dikunci"}
                              >
                                Auto-sync
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={ppEdit.auto_sync_price}
                                onClick={() =>
                                  setProviderProductEdits((prev) => ({
                                    ...prev,
                                    [prov.id]: {
                                      ...(prev[prov.id] || EMPTY_PP),
                                      auto_sync_price: !(prev[prov.id] || EMPTY_PP).auto_sync_price,
                                    },
                                  }))
                                }
                                className={`relative w-9 h-5 rounded-full transition-colors ${
                                  ppEdit.auto_sync_price ? "bg-emerald-500" : "bg-slate-700"
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                    ppEdit.auto_sync_price ? "translate-x-4" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Input SKU & harga modal */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">
                                SKU / Kode Produk {isSelected ? "*" : ""}
                              </label>
                              <input
                                type="text"
                                placeholder={`Kode ${prov.name}`}
                                value={ppEdit.product_code}
                                onChange={(e) =>
                                  setProviderProductEdits((prev) => ({
                                    ...prev,
                                    [prov.id]: { ...(prev[prov.id] || EMPTY_PP), product_code: e.target.value },
                                  }))
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Harga Modal (Rp)</label>
                              <input
                                type="number"
                                placeholder="Harga beli dari provider"
                                value={ppEdit.cost_price}
                                onChange={(e) =>
                                  setProviderProductEdits((prev) => ({
                                    ...prev,
                                    [prov.id]: { ...(prev[prov.id] || EMPTY_PP), cost_price: e.target.value },
                                  }))
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                              />
                            </div>
                          </div>

                          {prov.code?.toUpperCase() === "KIOSGAMER" && (
                            <p className="text-[10px] text-amber-400/70 mt-2">
                              💡 SKU Kiosgamer berupa angka item_id (mis: 1, 2, 14, 103). Khusus game Garena (FF & CODM).
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>



                {/* Pricing Calculation Box */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <h4 className="font-semibold text-indigo-400">
                    Kalkulasi Harga & Margin Bertingkat
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                     <label className="block text-slate-400 mb-1">Harga Modal Dasar (Rp)</label>
                    {editingNominal ? (
                      <div className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 font-bold text-slate-300 cursor-not-allowed">
                        {formatRupiah(formData.base_price)}
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={formData.base_price}
                        onChange={(e) =>
                          handleBasePriceOrMarginChange(
                            parseFloat(e.target.value) || 0,
                            formData.margin_percent
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none font-medium"
                      />
                    )}
                    {editingNominal && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Otomatis mengikuti harga modal provider saat pemindahan provider.
                      </p>
                    )}
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Markup Margin (%)</label>
                      <input
                        type="number"
                        value={formData.margin_percent}
                        onChange={(e) =>
                          handleBasePriceOrMarginChange(
                            formData.base_price,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                    <div className="bg-slate-900 p-2 rounded-lg text-center">
                      <span className="text-[10px] text-slate-400 block">Publik</span>
                      <span className="font-bold text-emerald-400 text-xs">
                        {formatRupiah(formData.price_public)}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg text-center">
                      <span className="text-[10px] text-slate-400 block">Member</span>
                      <span className="font-bold text-sky-400 text-xs">
                        {formatRupiah(formData.price_member)}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg text-center">
                      <span className="text-[10px] text-slate-400 block">VIP</span>
                      <span className="font-bold text-violet-400 text-xs">
                        {formatRupiah(formData.price_vip)}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg text-center">
                      <span className="text-[10px] text-slate-400 block">Reseller H2H</span>
                      <span className="font-bold text-amber-300 text-xs">
                        {formatRupiah(formData.price_reseller)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="nom_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <label htmlFor="nom_active" className="text-slate-300 font-medium cursor-pointer">
                    Aktifkan item ini untuk dijual
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
                    disabled={isCreating}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {isCreating ? "Menyimpan..." : editingNominal ? "Simpan Perubahan" : "Buat Nominal"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Pindah / Switch Provider */}
      {isSwitchModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => {
              if (!isSwitching) setIsSwitchModalOpen(false);
            }}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Pindah Provider Produk</h3>
                    <p className="text-xs text-slate-400">
                      Alihkan pemrosesan produk ke Provider lain (Digiflazz &harr; Kiosgamer)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSwitchModalOpen(false)}
                  disabled={isSwitching}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs pt-2">
                {/* Scope Selection */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Metode Pemindahan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSwitchScope("game")}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        switchScope === "game"
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      Berdasarkan Game
                    </button>
                    <button
                      type="button"
                      onClick={() => setSwitchScope("selected")}
                      disabled={selectedIds.length === 0}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        switchScope === "selected"
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 disabled:opacity-40"
                      }`}
                    >
                      Item Terpilih ({selectedIds.length})
                    </button>
                  </div>
                </div>

                {switchScope === "game" && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Pilih Game Target
                    </label>
                    <select
                      value={switchGameId}
                      onChange={(e) => setSwitchGameId(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {games?.map((g: any) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Pindahkan ke Provider Tujuan *
                  </label>
                  <select
                    value={switchTargetProvider}
                    onChange={(e) => setSwitchTargetProvider(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 font-bold text-amber-300"
                  >
                    {providers?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  Semua transaksi mendatang untuk item yang dialihkan akan langsung diproses
                  melalui provider yang dipilih.
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSwitchModalOpen(false)}
                  disabled={isSwitching}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeSwitchProvider}
                  disabled={isSwitching}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {isSwitching ? "Memindahkan..." : "Terapkan Pemindahan"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Confirmation Modal - Delete Nominal */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() =>
          setConfirmDelete({ isOpen: false, nominalId: null, nominalName: "", isLoading: false })
        }
        onConfirm={executeDelete}
        title="Hapus Nominal Item?"
        message={
          <>
            Apakah Anda yakin ingin menghapus item nominal{" "}
            <strong className="text-white font-semibold">{confirmDelete.nominalName}</strong>?
          </>
        }
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        isLoading={confirmDelete.isLoading}
      />

      {/* Modal Laporan Hasil Pemindahan Provider */}
      {switchResult?.isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setSwitchResult(null)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    switchResult.skippedCount === 0
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : switchResult.switchedCount > 0
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                      : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                  }`}
                >
                  {switchResult.skippedCount === 0 ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : switchResult.switchedCount > 0 ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <AlertCircle className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white">
                    {switchResult.skippedCount === 0
                      ? "Pemindahan Provider Berhasil"
                      : switchResult.switchedCount > 0
                      ? "Pemindahan Sebagian & Fallback Otomatis"
                      : "Pemindahan Provider Dibatalkan"}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {switchResult.message}
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Total Diproses</span>
                  <span className="font-bold text-slate-200 text-sm">{switchResult.totalRequested}</span>
                </div>
                <div className="bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-xl">
                  <span className="text-[10px] text-emerald-400 block font-medium">Dialihkan</span>
                  <span className="font-bold text-emerald-400 text-sm">+{switchResult.switchedCount}</span>
                </div>
                <div className="bg-amber-950/30 border border-amber-500/20 p-2.5 rounded-xl">
                  <span className="text-[10px] text-amber-400 block font-medium">Fallback (Tetap)</span>
                  <span className="font-bold text-amber-400 text-sm">{switchResult.skippedCount}</span>
                </div>
              </div>

              {/* Fallback Details List if any */}
              {switchResult.skippedItems && switchResult.skippedItems.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Info className="w-3.5 h-3.5" />
                    <span>Daftar Nominal yang Tetap di Provider Lama:</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-[11px] custom-scrollbar">
                    {switchResult.skippedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 flex items-start gap-2"
                      >
                        <span className="text-amber-400 font-bold">•</span>
                        <span className="leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    💡 Nominal di atas tetap aktif dan aman melayani transaksi melalui provider sebelumnya.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSwitchResult(null)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Tutup & Selesai
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Confirmation Modal - Edit Nominal */}
      <ConfirmModal
        isOpen={confirmEdit.isOpen}
        onClose={() => setConfirmEdit({ isOpen: false, isLoading: false })}
        onConfirm={executeSave}
        title="Simpan Perubahan Harga & Nominal?"
        message={
          <>
            Apakah Anda yakin ingin memperbarui konfigurasi harga, provider, dan SKU untuk{" "}
            <strong className="text-white font-semibold">{formData.name}</strong>?
            {isProviderChanged && (
              <span className="block mt-2 text-amber-300">
                Provider akan dipindah ke{" "}
                <strong>{providers?.find((p: any) => p.id === formData.provider_id)?.name}</strong>. Transaksi
                berikutnya diproses lewat provider ini.
              </span>
            )}
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
