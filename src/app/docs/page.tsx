"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BellRing,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  Hash,
  KeyRound,
  Layers,
  LayoutGrid,
  Lock,
  Package,
  RefreshCw,
  Server,
  ShieldCheck,
  Tag,
  Wallet,
  Zap,
} from "lucide-react";

const BASE_URL = "https://api1235.irxplay.com";

type Parameter = { field: string; type: string; required: string; description: string };

/* ------------------------------------------------------------------ */
/* Parameter tables                                                    */
/* ------------------------------------------------------------------ */

const balanceParams: Parameter[] = [
  { field: "apikey", type: "string", required: "Ya", description: "API Key akun Anda." },
  { field: "sign", type: "string", required: "Ya", description: 'md5(apikey + "balance")' },
];

const categoryParams: Parameter[] = [
  { field: "apikey", type: "string", required: "Ya", description: "API Key akun Anda." },
  { field: "sign", type: "string", required: "Ya", description: 'md5(apikey + "category")' },
];

const priceListParams: Parameter[] = [
  { field: "apikey", type: "string", required: "Ya", description: "API Key akun Anda." },
  { field: "sign", type: "string", required: "Ya", description: 'md5(apikey + "pricelist")' },
];

const productParams: Parameter[] = [
  { field: "apikey", type: "string", required: "Ya", description: "API Key akun Anda." },
  { field: "sign", type: "string", required: "Ya", description: 'md5(apikey + "product")' },
  { field: "brand", type: "string", required: "Ya", description: "Nama brand sesuai hasil endpoint Daftar Brand, misalnya Mobile Legends: Bang Bang (tidak case-sensitive)." },
];

const transactionParams: Parameter[] = [
  { field: "apikey", type: "string", required: "Ya", description: "API Key akun Anda." },
  { field: "sku_code", type: "string", required: "Ya", description: "Kode SKU dari Price List (field sku_code), misalnya MLBB_86." },
  { field: "user_id", type: "string", required: "Ya", description: "ID akun/player tujuan, misalnya 12345678." },
  { field: "server_id", type: "string", required: "Opsional", description: "Zone/Server ID, misalnya 2001. Kosongkan atau hilangkan jika game tidak memerlukannya." },
  { field: "ref_id", type: "string", required: "Ya", description: "ID referensi unik dari sistem Anda. Pengiriman ulang ID yang sama tidak akan charge ganda." },
  { field: "sign", type: "string", required: "Ya", description: "md5(apikey + ref_id)" },
  { field: "testing", type: "boolean", required: "Opsional", description: "Set true untuk sandbox tanpa potong saldo nyata." },
  { field: "callback_url", type: "string", required: "Opsional", description: "URL webhook untuk menerima notifikasi hasil transaksi. Jika kosong, memakai Webhook URL pada API Key." },
];

const checkStatusParams: Parameter[] = [
  { field: "apikey", type: "string", required: "Ya", description: "API Key akun Anda." },
  { field: "ref_id", type: "string", required: "Ya", description: "ref_id transaksi yang ingin dicek." },
  { field: "sign", type: "string", required: "Ya", description: "md5(apikey + ref_id)" },
];

/* ------------------------------------------------------------------ */
/* Request / response samples                                          */
/* ------------------------------------------------------------------ */

const balanceRequest = `{
  "apikey": "YOUR_API_KEY",
  "sign": "md5(apikey + 'balance')"
}`;

const balanceResponse = `{
  "data": {
    "balance": 1250000
  }
}`;

const categoryRequest = `{
  "apikey": "YOUR_API_KEY",
  "sign": "md5(apikey + 'category')"
}`;

const categoryResponse = `{
  "data": [
    {
      "brand": "Free Fire",
      "category": "Games",
      "total_product": 18
    },
    {
      "brand": "Mobile Legends: Bang Bang",
      "category": "Games",
      "total_product": 24
    }
  ]
}`;

const priceRequest = `{
  "apikey": "YOUR_API_KEY",
  "sign": "md5(apikey + 'pricelist')"
}`;

const priceResponse = `{
  "data": [
    {
      "product_name": "Mobile Legends 86 Diamonds",
      "category": "Games",
      "brand": "Mobile Legends: Bang Bang",
      "price": 19200,
      "sku_code": "MLBB_86",
      "buyer_product_status": true,
      "seller_product_status": true
    }
  ]
}`;

const productRequest = `{
  "apikey": "YOUR_API_KEY",
  "sign": "md5(apikey + 'product')",
  "brand": "Mobile Legends: Bang Bang"
}`;

const productResponse = `{
  "data": [
    {
      "product_name": "Mobile Legends 86 Diamonds",
      "category": "Games",
      "brand": "Mobile Legends: Bang Bang",
      "price": 19200,
      "sku_code": "MLBB_86"
    }
  ]
}`;

const transactionRequest = `{
  "apikey": "YOUR_API_KEY",
  "sku_code": "MLBB_86",
  "user_id": "12345678",
  "server_id": "2001",
  "ref_id": "REF-20260901-001",
  "sign": "md5(apikey + ref_id)",
  "testing": false,
  "callback_url": "https://domain-partner.com/api/callback"
}`;

const transactionResponse = `{
  "data": {
    "ref_id": "REF-20260901-001",
    "invoice_number": "INV-20261009-000001",
    "user_id": "12345678",
    "server_id": "2001",
    "sku_code": "MLBB_86",
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "rc": "00",
    "sn": "Josjis. RefId : REF-20260901-001",
    "price": 19200,
    "sign": "md5(apikey + ref_id)"
  }
}`;

const checkStatusRequest = `{
  "apikey": "YOUR_API_KEY",
  "ref_id": "REF-20260901-001",
  "sign": "md5(apikey + ref_id)"
}`;

const callbackPayload = `{
  "data": {
    "ref_id": "REF-20260901-001",
    "invoice_number": "INV-20261009-000001",
    "user_id": "12345678",
    "server_id": "2001",
    "sku_code": "MLBB_86",
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "rc": "00",
    "sn": "Josjis. RefId : REF-20260901-001",
    "price": 19200,
    "sign": "md5(ref_id + apikey + status)"
  }
}`;

const errorSample = `// 401 Unauthorized (API key / signature salah, akun nonaktif)
{
  "data": [],
  "message": "invalid signature"
}

// 404 Not Found (brand tidak ditemukan pada endpoint /product)
{
  "data": [],
  "message": "brand not found"
}`;

const curlSample = `curl -X POST ${BASE_URL}/api/v1/h2h/transaction \\
  -H "Content-Type: application/json" \\
  -d '${transactionRequest}'`;

const nodeSample = `const crypto = require("crypto");

const apikey = "YOUR_API_KEY";
const refId = "REF-" + Date.now();
const sign = crypto.createHash("md5")
  .update(apikey + refId)
  .digest("hex");

const response = await fetch("${BASE_URL}/api/v1/h2h/transaction", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    apikey,
    sku_code: "MLBB_86",
    user_id: "12345678",
    server_id: "2001", // opsional
    ref_id: refId,
    sign,
    testing: false,
    callback_url: "https://yourwebsite.com/api/callback"
  })
});
console.log(await response.json());`;

const phpSample = `<?php
$apikey = "YOUR_API_KEY";
$refId = "REF-" . time();
$sign = md5($apikey . $refId);

$payload = [
  "apikey" => $apikey,
  "sku_code" => "MLBB_86",
  "user_id" => "12345678",
  "server_id" => "2001", // opsional
  "ref_id" => $refId,
  "sign" => $sign,
  "testing" => false,
  "callback_url" => "https://yourwebsite.com/api/callback"
];

$ch = curl_init("${BASE_URL}/api/v1/h2h/transaction");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);`;

/* ------------------------------------------------------------------ */
/* UI helpers                                                          */
/* ------------------------------------------------------------------ */

function CopyButton({ value, label = "Salin" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors"
      type="button"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Tersalin" : label}
    </button>
  );
}

function CodeBlock({ title, value, tone = "text-slate-300" }: { title: string; value: string; tone?: string }) {
  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-300">
        <span>{title}</span>
        <CopyButton value={value} />
      </div>
      <pre className={`max-h-80 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed ${tone}`}>
        {value}
      </pre>
    </div>
  );
}

function ParameterTable({ params }: { params: Parameter[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="border-b border-slate-800 bg-slate-950 font-mono text-slate-400">
          <tr>
            <th className="px-4 py-2.5">Field</th>
            <th className="px-4 py-2.5">Tipe</th>
            <th className="px-4 py-2.5">Wajib?</th>
            <th className="px-4 py-2.5">Keterangan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-slate-300">
          {params.map((param) => (
            <tr key={param.field}>
              <td className="px-4 py-2.5 font-mono text-indigo-300">{param.field}</td>
              <td className="px-4 py-2.5 font-mono text-slate-400">{param.type}</td>
              <td className={`px-4 py-2.5 font-medium ${param.required === "Ya" ? "text-emerald-400" : "text-slate-400"}`}>
                {param.required}
              </td>
              <td className="px-4 py-2.5">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionTitle({ id, icon: Icon, title, description }: { id: string; icon: typeof BookOpen; title: string; description: string }) {
  return (
    <div id={id} className="scroll-mt-24 border-b border-slate-800 pb-3">
      <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
        <Icon className="h-5 w-5 text-indigo-400" />
        {title}
      </h2>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function EndpointCard({
  method = "POST",
  endpoint,
  alias,
  params,
  request,
  response,
}: {
  method?: string;
  endpoint: string;
  alias?: string;
  params?: Parameter[];
  request: string;
  response: string;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
          {method}
        </span>
        <code className="break-all text-sm font-bold text-white">{BASE_URL}{endpoint}</code>
        {alias && <span className="text-[11px] font-mono text-slate-400">(alias: {BASE_URL}{alias})</span>}
      </div>
      {params && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Parameter Body (JSON)</h3>
          <ParameterTable params={params} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CodeBlock title="Contoh Request Body (JSON)" value={request} />
        <CodeBlock title="Contoh Response Sukses (200 OK)" value={response} tone="text-emerald-400" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function AdminApiDocsPage() {
  const [language, setLanguage] = useState<"node" | "php" | "curl">("node");
  const samples = { node: nodeSample, php: phpSample, curl: curlSample };

  const navItems = [
    { href: "#auth", title: "Autentikasi", detail: "API Key & signature", icon: Lock },
    { href: "#check-balance", title: "Cek Saldo", detail: "Sisa deposit", icon: Wallet },
    { href: "#category", title: "Daftar Brand", detail: "Seluruh brand", icon: LayoutGrid },
    { href: "#price-list", title: "Daftar Harga", detail: "Semua SKU", icon: Tag },
    { href: "#product", title: "Produk per Brand", detail: "SKU by brand", icon: Package },
    { href: "#transaction", title: "Transaksi", detail: "Order & callback", icon: Zap },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 pb-24 text-slate-200">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-7 shadow-2xl md:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
            <BookOpen className="h-4 w-4" />
            Dokumentasi Resmi Reseller & H2H API v2.0
          </div>
          <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">
            Integrasi API Top-Up Game & Voucher IRXPlay
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
            Dokumentasi referensi konektivitas API Top-Up IRXPlay. Integrasikan website, aplikasi, bot, atau POS Anda untuk cek saldo, daftar brand, daftar harga, transaksi otomatis, dan callback status real-time.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2 font-mono text-xs">
              <span className="text-slate-500">BASE URL:</span>
              <span className="font-bold text-indigo-400">{BASE_URL}/api/v1</span>
              <CopyButton value={`${BASE_URL}/api/v1`} label="" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Uptime Server 99.9% · Instan 1 Detik
            </span>
          </div>
        </div>
      </section>

      <nav aria-label="Navigasi dokumentasi" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {navItems.map(({ href, title, detail, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className="group rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:-translate-y-0.5 hover:border-indigo-500/50"
          >
            <Icon className="mb-2 h-5 w-5 text-indigo-400" />
            <h2 className="text-xs font-bold text-white group-hover:text-indigo-300">{title}</h2>
            <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
          </a>
        ))}
      </nav>

      <section className="space-y-6">
        <SectionTitle
          id="overview"
          icon={Layers}
          title="Alur Kerja Integrasi"
          description="Langkah memulai transaksi otomatis menggunakan API."
        />
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["1", "Dapatkan API Key", "Login sebagai Member/Reseller dan buka menu API Key untuk memperoleh API Key Anda."],
            ["2", "Whitelist IP Server", "Daftarkan IP publik server Anda ke Admin. Request dari IP di luar whitelist ditolak."],
            ["3", "Isi Saldo Deposit", "Lakukan deposit melalui Dashboard. Saldo dipotong otomatis pada transaksi sukses."],
            ["4", "Kirim API & Callback", "Kirim order ke endpoint. Sistem akan memproses lalu mengirim callback saat status berubah."],
          ].map(([number, title, description]) => (
            <div key={number} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white">
                {number}
              </span>
              <h3 className="mt-3 text-sm font-bold text-white">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle
          id="auth"
          icon={ShieldCheck}
          title="Autentikasi & Pembuatan Signature MD5"
          description="Keamanan payload menggunakan API Key dan MD5 signature."
        />
        <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
          <p className="text-xs leading-relaxed text-slate-300">
            Setiap request H2H wajib menyertakan <code className="font-bold text-indigo-300">apikey</code> dan{" "}
            <code className="font-bold text-amber-400">sign</code>. Signature dibuat dari API Key digabung dengan kata kunci
            endpoint (atau <code className="text-slate-100">ref_id</code> untuk transaksi). Tidak ada secret key terpisah.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-bold text-white">Transaksi & cek status</p>
              <code className="mt-3 block rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs font-bold text-amber-400">
                sign = md5(apikey + ref_id)
              </code>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-bold text-white">Saldo, brand, harga & produk</p>
              <div className="mt-3 space-y-2">
                <code className="block rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-xs font-bold text-emerald-400">
                  md5(apikey + "balance")
                </code>
                <code className="block text-xs font-bold text-sky-400">md5(apikey + "category")</code>
                <code className="block text-xs font-bold text-sky-400">md5(apikey + "pricelist")</code>
                <code className="block text-xs font-bold text-sky-400">md5(apikey + "product")</code>
              </div>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Response transaksi dan cek status juga menyertakan <code className="text-amber-400">sign = md5(apikey + ref_id)</code> yang dapat Anda verifikasi.
          </p>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-xs text-indigo-100">
            <KeyRound className="mr-2 inline h-4 w-4 text-indigo-300" />
            API Key bersifat rahasia. Simpan hanya di server Anda (environment variable), jangan ditaruh di frontend atau dibagikan ke pihak lain. Jika bocor, segera buat ulang dari menu API Key.
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle
          id="check-balance"
          icon={Wallet}
          title="1. Cek Sisa Saldo Akun"
          description="Memeriksa saldo deposit yang tersedia untuk bertransaksi."
        />
        <EndpointCard
          endpoint="/api/v1/h2h/check-balance"
          alias="/v1/cek-saldo"
          params={balanceParams}
          request={balanceRequest}
          response={balanceResponse}
        />
      </section>

      <section className="space-y-6">
        <SectionTitle
          id="category"
          icon={LayoutGrid}
          title="2. Daftar Brand"
          description="Menampilkan seluruh brand beserta kategori dan jumlah produknya."
        />
        <EndpointCard
          endpoint="/api/v1/h2h/category"
          alias="/v1/category"
          params={categoryParams}
          request={categoryRequest}
          response={categoryResponse}
        />
      </section>

      <section className="space-y-6">
        <SectionTitle
          id="price-list"
          icon={Tag}
          title="3. Cek Daftar Harga & SKU Produk"
          description="Mengambil seluruh katalog aktif, sku_code, dan harga sesuai tier akun Anda."
        />
        <EndpointCard
          endpoint="/api/v1/h2h/price-list"
          alias="/v1/price-list"
          params={priceListParams}
          request={priceRequest}
          response={priceResponse}
        />
      </section>

      <section className="space-y-6">
        <SectionTitle
          id="product"
          icon={Package}
          title="4. Daftar Produk Berdasarkan Brand"
          description="Mengambil produk dan harga untuk satu brand tertentu."
        />
        <EndpointCard
          endpoint="/api/v1/h2h/product"
          alias="/v1/product"
          params={productParams}
          request={productRequest}
          response={productResponse}
        />
      </section>

      <section className="space-y-6">
        <SectionTitle
          id="transaction"
          icon={Zap}
          title="5. Melakukan Transaksi Top-Up"
          description="Mengeksekusi order item game atau voucher secara instan."
        />
        <EndpointCard
          endpoint="/api/v1/h2h/transaction"
          alias="/v1/transaction"
          params={transactionParams}
          request={transactionRequest}
          response={transactionResponse}
        />
      </section>

      <section className="space-y-6">
        <SectionTitle
          id="check-status"
          icon={RefreshCw}
          title="6. Cek Status Transaksi"
          description="Memeriksa status pesanan manual tanpa menunggu callback."
        />
        <EndpointCard
          endpoint="/api/v1/h2h/check-status"
          params={checkStatusParams}
          request={checkStatusRequest}
          response={transactionResponse}
        />
      </section>

      <section className="space-y-6">
        <SectionTitle
          id="webhook"
          icon={BellRing}
          title="7. Webhook Callback Real-Time"
          description="Format notifikasi yang dikirim ke server Anda ketika status order berubah."
        />
        <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
          <p className="text-xs leading-relaxed text-slate-300">
            Jika Anda mengisi <code className="text-slate-100">callback_url</code> (atau Webhook URL pada API Key), IRXPlay mengirim HTTP{" "}
            <code className="font-bold text-emerald-400">POST</code> berisi hasil transaksi ke URL tersebut.
          </p>
          <CodeBlock title="Payload JSON Callback" value={callbackPayload} tone="text-indigo-300" />
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs">
            <h3 className="font-bold text-white">Ketentuan webhook</h3>
            <ul className="mt-2 list-inside list-disc space-y-1.5 leading-relaxed text-slate-400">
              <li>
                Signature callback: <code className="text-amber-400">md5(ref_id + apikey + status)</code>. Hitung ulang di server Anda dan cocokkan dengan <code>data.sign</code> atau header <code>X-Callback-Signature</code>.
              </li>
              <li>Callback memiliki timeout 15 detik. Respons dengan HTTP <code className="text-emerald-400">200 OK</code> secepat mungkin.</li>
              <li>Sebagai cadangan, gunakan endpoint Cek Status bila callback tidak diterima.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle
          id="response-codes"
          icon={Hash}
          title="8. Response Code (RC) & Status HTTP"
          description="Gunakan kode ini untuk logika transaksi pada sistem Anda."
        />
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950 font-mono text-slate-400">
              <tr>
                <th className="px-5 py-3">RC</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Penjelasan</th>
                <th className="px-5 py-3">Saldo Deposit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {[
                ["00", "Sukses", "Transaksi berhasil; serial number terbit.", "Terpotong", "text-emerald-400"],
                ["03", "Pending", "Sedang diproses. Tunggu callback atau cek status berkala.", "Terpotong sementara", "text-amber-400"],
                ["07", "Gagal", "Produk gangguan/cut-off atau SKU tidak ditemukan.", "Tidak terpotong", "text-rose-400"],
                ["17", "Gagal", "Saldo deposit tidak mencukupi.", "Tidak terpotong", "text-rose-400"],
                ["40", "Gagal", "API Key/signature tidak valid, IP tidak di-whitelist, atau parameter tidak valid.", "Tidak terpotong", "text-rose-400"],
              ].map(([code, status, note, balance, color]) => (
                <tr key={code}>
                  <td className={`px-5 py-3 text-sm font-black ${color}`}>{code}</td>
                  <td className="px-5 py-3 font-bold">{status}</td>
                  <td className="px-5 py-3">{note}</td>
                  <td className="px-5 py-3 text-slate-400">{balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
          <p className="text-xs leading-relaxed text-slate-300">
            Endpoint transaksi dan cek status selalu mengembalikan HTTP <code className="text-emerald-400">200</code> dengan hasil pada <code>status</code> dan <code>rc</code>. Endpoint saldo, brand, harga, dan produk memakai status HTTP berikut:
          </p>
          <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
            <li><code className="text-slate-200">400</code> parameter request tidak valid</li>
            <li><code className="text-slate-200">401</code> API Key atau signature salah, atau akun nonaktif</li>
            <li><code className="text-slate-200">404</code> brand tidak ditemukan (endpoint produk per brand)</li>
          </ul>
          <CodeBlock title="Contoh Response Error" value={errorSample} tone="text-rose-300" />
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle
          id="code-samples"
          icon={Code2}
          title="9. Contoh Kode Integrasi Siap Pakai"
          description="Pilih bahasa pemrograman lalu salin contoh transaksi H2H."
        />
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {(["node", "php", "curl"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLanguage(item)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  language === item ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                {item === "node" ? "Node.js" : item === "php" ? "PHP" : "cURL"}
              </button>
            ))}
          </div>
          <CodeBlock
            title={`Contoh ${language === "node" ? "Node.js" : language === "php" ? "PHP" : "cURL"}`}
            value={samples[language]}
          />
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Server className="h-4 w-4 text-indigo-400" />
            Simpan API Key hanya di environment variable server.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-6 text-center">
        <h2 className="text-lg font-bold text-white">Kelola Mitra & Integrasi H2H</h2>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-slate-300">
          Admin dapat mengelola member/reseller, memeriksa kuota API, dan mendaftarkan IP whitelist mitra melalui panel admin.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            href="/users"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
          >
            Kelola Pengguna & Reseller
          </Link>
          <Link
            href="/ip-whitelist"
            className="inline-flex items-center gap-1 rounded-xl border border-indigo-400/40 px-4 py-2.5 text-xs font-bold text-indigo-200 hover:bg-indigo-500/10"
          >
            Whitelist IP Mitra <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
