# AGENTS.md — kagurasaka

Instruksi untuk agen AI (Codex, Claude Code, Hermes, Cursor, dsb.) yang bekerja di repo ini.
`CLAUDE.md` hanya menunjuk ke berkas ini — jangan menulis instruksi di sana.

<!-- omh:agent-instructions:begin -->

## Konteks proyek

Blog riset keamanan statis milik satu penulis. Astro 5 + CSS buatan sendiri, tanpa Tailwind dan
tanpa UI kit. Situs ter-deploy sebagai GitHub Pages *project site*:

- Repo: `github.com/lxdwnpiper/kagurasaka`, branch `main`
- Situs: https://lxdwnpiper.github.io/kagurasaka/
- **Base path `/kagurasaka` wajib** — semua tautan internal lewat helper `withBase()` di `src/lib/url.ts`

## Tugas utama: menulis artikel baru lalu push

Kalau pengguna memberi topik/brief, kerjakan seluruh alur ini sampai situs live, jangan berhenti di draf.

1. **Buat berkas** `src/content/research/<slug>.md`. Slug = nama berkas, huruf kecil, tanda hubung,
   tanpa tanggal, tanpa spasi. Contoh: `bypass-validasi-upload.md`.
2. **Isi frontmatter** (skema nyata ada di `src/content.config.ts`):

   | field | wajib | isi |
   |---|---|---|
   | `title` | ya | judul teknis spesifik, bukan klikbait |
   | `description` | ya | satu kalimat untuk daftar, RSS, dan meta deskripsi |
   | `abstract` | tidak | 2–3 kalimat ringkasan yang tampil di bawah judul |
   | `date` | ya | `YYYY-MM-DD` (tanggal terbit) |
   | `updated` | tidak | `YYYY-MM-DD` bila ada revisi |
   | `tags` | tidak | array slug huruf kecil, dipakai untuk halaman `/tags/<tag>/` |
   | `severity` | tidak | salah satu: `info`, `low`, `medium`, `high`, `critical` |
   | `cve` | tidak | array ID CVE yang benar-benar ada, mis. `['CVE-2024-1234']` |
   | `draft` | tidak | `true` = tidak ikut ter-build di produksi (default `false`) |
   | `toc` | tidak | `true` = tampilkan daftar isi (default `true`; pakai `false` untuk artikel pendek) |

   Contoh minimal:

   ```markdown
   ---
   title: 'Judul teknis artikel'
   description: 'Satu kalimat untuk daftar dan RSS.'
   date: 2026-11-02
   tags: ['file-upload', 'php']
   severity: medium
   draft: false
   toc: true
   ---
   ```

3. **Tulis isinya** dengan konvensi yang dikenali situs ini:

   - `##` dan `###` otomatis masuk daftar isi dan dapat anchor.
   - Baris pertama di dalam blok kode menjadi label nama berkas dan dihapus dari tampilan:
     `// path: tools/probe.py` (pakai `#` untuk shell/yaml, `--` untuk SQL).
   - Blockquote menjadi kotak sorotan; varian ditentukan marker di awal paragraf:
     `[!note]`, `[!warn]`, `[!poc]`.
   - Tabel lebar otomatis dibungkus wadah yang bisa digeser di layar sempit; tidak perlu HTML.
   - Footnote markdown biasa jalan: `teks[^1]` … `[^1]: isi catatan`.
   - Gambar: simpan berkas di `public/img/<slug>/foto.png`, lalu rujuk dengan path ber-base,
     `<img src="/kagurasaka/img/<slug>/foto.png" alt="...">` (sudah diuji: HTML mentah dan
     `![alt](/kagurasaka/...)` dua-duanya ter-render). Selalu isi `alt`.
   - Prosa Bahasa Indonesia dengan istilah teknis Inggris; nada laporan teknis, bukan pemasaran.
   - Mulai cepat: salin `TEMPLATE-artikel.md` ke `src/content/research/<slug>.md`.

4. **Jangan mengarang.** CVE, nomor versi, kutipan vendor, hasil eksperimen, dan output perintah
   harus nyata atau ditandai eksplisit sebagai contoh. Kalau belum bisa memverifikasi, tulis
   `[perlu verifikasi]` di tempatnya dan sebutkan di ringkasan akhir. Ini blog security: klaim
   palsu merusak kredibilitas penulis.
5. **Verifikasi** (lihat bagian *Build dan test* di bawah) sampai `npm run check` dan
   `npm run build` sama-sama hijau.
6. **Publish** dengan gaya commit yang ada (lihat *Konvensi*), lalu pastikan URL live merespons 200.

   ```bash
   cd /home/piper/blog
   git add src/content/research/<slug>.md public/img/<slug> 2>/dev/null
   git -c commit.gpgsign=false commit -m "feat(research): tambah artikel <topik>"
   GIT_SSH_COMMAND="ssh -i /home/piper/.ssh/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes" \
     git push origin main

   # push memicu workflow "Deploy ke GitHub Pages" (~1 menit). Cek hasilnya:
   curl -s "https://api.github.com/repos/lxdwnpiper/kagurasaka/actions/runs?per_page=1" \
     | python3 -c "import sys,json;r=json.load(sys.stdin)['workflow_runs'][0];print(r['status'],r['conclusion'])"
   # lalu buktikan halamannya hidup:
   curl -s -o /dev/null -w "%{http_code}\n" https://lxdwnpiper.github.io/kagurasaka/research/<slug>/
   ```

   Push yang sukses bukan bukti deploy sukses — tunggu `conclusion=success` dan URL `200`
   sebelum melaporkan artikel sudah terbit.

## Build dan test

Semua dijalankan dari akar repo.

| perintah | status | catatan |
|---|---|---|
| `npm ci` | verified (exit 0, 2026-10-30) | bersih tanpa `node_modules`, lockfile konsisten |
| `npm run build` | verified (exit 0, 2026-10-30) | menghasilkan `dist/`, lalu `postbuild` menjalankan Pagefind |
| `npm run check` | verified (exit 0, 2026-10-30) | harus `0 errors, 0 warnings`; sisa 1 hint `execCommand` sudah lama ada |
| `npx astro preview --port 4321` | verified (exit 0, 2026-10-30) | pratinjau hasil build; buka `http://localhost:4321/kagurasaka/` |
| `npm run dev` | unverified | dev server menampilkan artikel `draft: true`, build produksi tidak |

## Berkas yang dihasilkan — jangan diedit tangan

- `dist/` dan `dist/pagefind/` — keluaran `npm run build` (Astro + Pagefind). Sumbernya `src/` dan
  `src/content/research/`. Regenerate dengan `npm run build`. Gate: exit 0 dan jumlah halaman di log build.
- `package-lock.json` — diubah hanya oleh `npm install`/`npm ci`, bukan dengan tangan.

## Gates

- `npm run check` wajib `0 errors`. Error tipe baru berarti regresi, bukan gangguan.
- `npm run build` wajib exit 0; log berakhir dengan `[build] Complete!`.
- Setiap tautan internal wajib berawalan `/kagurasaka` (helper `withBase`). Periksa dengan
  `grep -rho 'href="/[^k#]' dist --include=*.html | grep -v '/kagurasaka'` — keluarannya harus kosong.
- Halaman artikel baru wajib punya `data-pagefind-body` pada wadah isinya, kalau tidak isinya tidak
  masuk indeks pencarian.

## Pitfalls (yang sudah memakan waktu)

- **Base path.** Tautan atau aset dengan path absolut (`/research/...`, `/fonts/...`) tampil benar di
  `astro dev` tapi 404 di GitHub Pages. Selalu `withBase()`. Ini penyebab kegagalan nomor satu.
- **Versi Astro terkunci di 5.** `npm install astro` polos akan menarik Astro 7 dan memecah
  `@astrojs/mdx@4`. Jangan naikkan versi tanpa izin eksplisit pengguna.
- **npm 12 memblokir postinstall** `esbuild`/`sharp`; tanpa `npm install-scripts approve esbuild sharp`
  lalu `npm rebuild`, toolchain tidak jalan.
- **Pagefind dibangun dari `dist/`**, jadi mengubah artikel tidak memperbarui indeks pencarian sampai
  `npm run build` dijalankan ulang.
- **Draft tidak tersaring di `dev`**, hanya di build produksi — artikel `draft: true` terlihat lokal
  tapi tidak akan muncul di situs live.
- **Push butuh kunci SSH.** Gunakan
  `GIT_SSH_COMMAND="ssh -i /home/piper/.ssh/id_ed25519 -o IdentitiesOnly=yes"`. Jangan minta kata sandi
  atau token; jangan pernah menaruh kredensial di repo.
- **Deploy jalan lewat Actions, bukan `gh-pages`.** `push` ke `main` memicu
  `.github/workflows/deploy.yml` (build → Pagefind → upload → `actions/deploy-pages`). Jangan membuat
  branch `gh-pages` manual.
- **GitHub Pages harus diaktifkan sekali oleh admin repo** (Settings → Pages → Source: *GitHub Actions*).
  `GITHUB_TOKEN` tidak berwenang mengaktifkannya, jadi langkah `actions/configure-pages` gagal dengan
  "Resource not accessible by integration" sebelum itu dilakukan. Itu masalah izin, bukan kode.

## Konvensi

- **Bahasa isi:** Indonesia untuk prosa, Inggris untuk istilah teknis, nama alat, dan kode.
- **Commit:** satu baris imperatif dengan awalan `feat:` / `fix:` / `docs:` / `chore:`, mis.
  `feat(research): tambah artikel bypass WAF`. Bahasa bebas, konsisten dengan riwayat.
- **Branch:** bekerja langsung di `main` untuk satu artikel; branch terpisah hanya untuk perubahan kode.
- **Desain:** token warna/tipografi di `src/styles/global.css` adalah kontrak — satu aksen, tanpa
  `box-shadow`, radius maksimal 2px, lebar baca `--measure`. Jangan menambah dependency UI.
- **Definisi selesai untuk satu artikel:** build hijau, halaman `/research/<slug>/` ada, muncul di
  `/research/`, di halaman tag-nya, di `rss.xml`, dan bisa ditemukan lewat `/search/`; setelah push,
  `https://lxdwnpiper.github.io/kagurasaka/research/<slug>/` merespons 200.

<!-- omh:agent-instructions:end -->
