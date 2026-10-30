---
title: 'MIME bukan bukti: catatan singkat soal sniffing'
description: 'Kenapa pemeriksaan Content-Type di sisi server tidak pernah menjadi kontrol keamanan, dan apa yang seharusnya menggantikannya.'
abstract: 'Catatan pendek tentang satu kesalahpahaman yang mahal: memperlakukan header Content-Type sebagai fakta.'
date: 2026-10-12
tags: ['file-upload', 'mime', 'php']
severity: info
draft: false
toc: true
---

Setiap kali sebuah fitur unggah diaudit, satu baris kode muncul dengan frekuensi yang mencurigakan: `if ($_FILES['berkas']['type'] === 'image/png')`. Baris itu terlihat seperti validasi. Secara teknis ia adalah pembacaan input yang dikendalikan sepenuhnya oleh pengirim.

## Header yang dikirim klien

`Content-Type` pada setiap bagian multipart ditulis oleh klien. Peramban mengisinya berdasarkan ekstensi berkas di sistem operasi pengguna — bukan berdasarkan isinya, dan bukan berdasarkan apa pun yang diperiksa server. Mengganti nilai itu satu baris di `curl` atau di proxy tidak memerlukan keahlian khusus:

```bash
# path: tools/spoof-mime.sh
curl -sS -o /dev/null -w '%{http_code}\n' \
  -F 'berkas=@payload.txt;filename=foto.png;type=image/png' \
  https://lab.internal/upload.php
```

Bila server menerima permintaan itu, satu-satunya hal yang dibuktikan adalah bahwa klien mampu mengetik `image/png`.

## Yang sebenarnya bisa diperiksa

Deteksi tipe berbasis isi bekerja pada byte awal berkas. `finfo_file()` membaca magic bytes dan mengembalikan label MIME; `getimagesize()` mem-parse header gambar dan menolak berkas yang tidak konsisten. Keduanya jauh lebih baik daripada membaca klaim, tetapi bukan jaminan: polyglot yang valid sebagai PNG sekaligus valid sebagai PHP akan lolos keduanya.

Karena itu deteksi isi bukan tujuan akhir, melainkan satu dari beberapa kontrol. Yang menentukan adalah kombinasi: allowlist ekstensi yang sempit, nama berkas yang dibuat server, penyimpanan di luar document root, dan direktori unggahan yang tidak memiliki handler eksekusi. Bila salah satu dari empat itu hilang, deteksi MIME yang paling ketat pun hanya menunda masalah.

## Konsekuensi praktis

Dalam laporan asesmen, temuan "validasi MIME dapat dipalsukan" sering ditulis sebagai risiko rendah karena membutuhkan satu langkah tambahan. Itu salah alamat. Nilainya bergantung pada apa yang ada di belakangnya: bila direktori unggahan dapat mengeksekusi skrip, pemalsuan MIME adalah langkah pertama dari rantai eksekusi, bukan cacat kosmetik. Bila direktori itu terisolasi, pemalsuan MIME memang tidak berbahaya — dan justru itu buktinya bahwa kontrol yang bekerja bukan yang diperiksa di kode aplikasi.

Aturan praktisnya sederhana: perlakukan setiap nilai yang datang dari klien sebagai deklarasi niat, lalu tanyakan kontrol mana yang tetap berdiri bila deklarasi itu bohong.
