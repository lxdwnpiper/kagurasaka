# PLAN — Security Research Blog (GitHub Pages)

Status: **draft, menunggu go-ahead eksekusi**
Tanggal: 2026-10-30

## Keputusan yang sudah dikunci

| Item | Nilai |
|---|---|
| Arah visual | **B — Academic Swiss** (light-first, serif heading, dark mode setara) |
| Stack | Astro 5 + CSS buatan sendiri (tanpa Tailwind/UI kit) |
| Repo | `github.com/lxdwnpiper/kagurasaka` (project site) |
| URL | `https://lxdwnpiper.github.io/kagurasaka/` |
| Deploy | GitHub Actions → Pages, **ditunda sampai situs jadi** |

Konsekuensi teknis dari repo project site (bukan `<user>.github.io`):

```js
// astro.config.mjs
site: 'https://lxdwnpiper.github.io',
base: '/kagurasaka',
```

Semua link internal wajib lewat helper (`import.meta.env.BASE_URL` atau `new URL(path, Astro.site)`),
kalau tidak CSS/gambar 404 di production meski lokal terlihat benar. Kalau nanti pakai domain
sendiri, cukup ubah `site` dan hapus `base`.

## Non-goals (fase ini)

- CMS/editor web (Decap, Keystatic) — nanti kalau nulis dari browser jadi kebutuhan.
- Kolom komentar backend (opsi termurah: GitHub Discussions).
- Analytics, newsletter, multi-bahasa.
- Template tema pihak ketiga.

## Arsitektur konten

```
src/content/research/*.md(x)   → koleksi artikel
frontmatter: title, description, date, tags[], severity?, cve?, draft, toc
```

```
/                       Beranda: intro 2 baris + daftar riset terbaru
/research               Index + filter tag
/research/<slug>        Artikel
/tags/<tag>             Arsip per tag
/about                  Bio, kontak, PGP key
/rss.xml  /sitemap-index.xml  /404
```

## Design system (Academic Swiss)

Token warna:

```css
:root{
  --bg:#FAFAF8; --surface:#FFFFFF; --ink:#14161A; --muted:#5A6069;
  --rule:#E3E1DB; --accent:#21456E;
  --serif:"Newsreader",Georgia,serif;
  --sans:"Inter",system-ui,sans-serif;
  --mono:"JetBrains Mono",ui-monospace,monospace;
  --measure:68ch;
}
@media (prefers-color-scheme:dark){ :root{
  --bg:#101215; --surface:#16181C; --ink:#E8E6E1; --muted:#9AA0A8;
  --rule:#262A30; --accent:#8FB4DC;
}}
```

Aturan:
- Skala spasi 4/8/12/16/24/32/48/64/96. Tidak ada nilai acak.
- Satu aksen saja; link pakai `--ink` + underline 1px offset 3px, bukan warna aksen.
- Tanpa border-radius > 2px, tanpa box-shadow. Hierarki dari garis `--rule` 1px.
- Heading serif dengan `text-wrap: balance`, body `text-wrap: pretty`, lebar `--measure`.
- TOC sticky di margin kanan ≥1080px; di bawah itu jadi `<details>` collapsible.
- `prefers-reduced-motion` mematikan semua transisi.

Komponen: `Header` (nama + nav minimal), `PostList`, `PostMeta` (tanggal · waktu baca · tag),
`Toc`, `CodeBlock` (Shiki, nama file, tombol copy), `Callout` (note/warn/poc),
`Footnotes`, `ThemeToggle`, `Footer`.

## Milestone & verifikasi

| M | Pekerjaan | Bukti selesai |
|---|---|---|
| M0 | `npm create astro`, git init, config `site`/`base`, `.gitignore` | `npm run build` sukses, `dist/index.html` ada |
| M1 | Token CSS, layout shell, header/footer, dark-light, tipografi | Lighthouse mobile ≥95 di 4 kategori |
| M2 | Koleksi artikel, halaman artikel, TOC, code block, 1 artikel contoh panjang (PoC + tabel IOC) | Render benar di 360/768/1440px, tabel tidak overflow |
| M3 | Index + filter tag, RSS, sitemap, Pagefind search, 404, OG image | Feed valid, search menemukan artikel |
| M4 | A11y: focus ring, skip link, kontras ≥4.5, navigasi Tab penuh | Tab-only walkthrough lolos |
| M5 | Push + Actions workflow + aktifkan Pages | URL live 200, deploy hijau |

## Risiko

1. **Base path** — paling sering bikin rusak; ditangani helper link sejak M0.
2. **Konten sedikit terasa kosong** di desain editorial — dijawab dengan index yang padat metadata, bukan hero besar.
3. **Font** — self-host `.woff2` (2 weight per family) supaya tanpa request ke Google dan tanpa FOUT.
