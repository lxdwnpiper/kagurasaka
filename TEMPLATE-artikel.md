---
title: 'Judul artikel yang spesifik dan teknis'
description: 'Satu kalimat untuk daftar, RSS, dan meta Google (60–160 karakter).'
abstract: 'Opsional. 2–3 kalimat ringkasan yang tampil di bawah judul artikel. Kalau dihapus, bagian ini tidak muncul.'
date: 2026-11-01
# updated: 2026-11-05
tags: ['file-upload', 'php']
severity: medium        # info | low | medium | high | critical — hapus baris ini kalau tidak relevan
cve: ['CVE-2026-0000']   # opsional, boleh dikosongkan: []
draft: true              # true = tidak ikut ter-build di produksi, aman untuk tulisan setengah jadi
toc: true                # false = sembunyikan daftar isi untuk artikel pendek
---

Paragraf pembuka. Tulis prosa biasa; tidak perlu HTML.

## Sub-judul pertama

Isi. Heading `##` dan `###` otomatis masuk daftar isi dan dapat anchor sendiri.

### Sub-sub-judul

- daftar pakai tanda minus
- tabel pakai sintaks markdown biasa (otomatis bisa digeser di HP)

| Kolom | Nilai | Catatan |
|---|---|---|
| contoh | 1 | baris tabel |

Blok kode: baris pertama di dalam blok menentukan label nama file yang tampil di atas blok.

```bash
# path: tools/cek.sh
echo "label di atas blok diambil dari komentar '# path: ...'"
```

> [!warn] Peringatan: kalau butuh kotak peringatan, cukup blockquote yang diawali
> `[!warn]`. Varian lain: `[!note]` dan `[!poc]`.

Footnote juga jalan.[^1]

Gambar: simpan di `public/img/<slug>/`, rujuk dengan path ber-base.

<img src="/kagurasaka/img/<slug>/gambar.png" alt="deskripsi gambar">

[^1]: Teks catatan kaki.
