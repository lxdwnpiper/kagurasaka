---
title: 'Anatomi bypass validasi upload: dari ekstensi sampai eksekusi'
description: 'Membedah lapisan validasi pada fitur unggah berkas, pola kegagalan yang berulang, dan matriks uji yang dipakai untuk memverifikasinya di lingkungan berizin.'
abstract: 'Fitur unggah berkas hampir selalu divalidasi di beberapa tempat sekaligus — peramban, kode aplikasi, dan web server — dan hampir selalu gagal dengan cara yang sama. Tulisan ini memetakan titik-titik pemeriksaan itu, menunjukkan di mana trust boundary-nya salah ditempatkan, lalu menutup dengan matriks uji dan kontrol yang benar-benar mengurangi ruang gerak penyerang.'
date: 2026-10-20
tags: ['file-upload', 'php', 'waf', 'server-config']
severity: high
cve: []
draft: false
toc: true
---

Validasi unggah berkas terdengar seperti masalah satu baris kode: cek ekstensi, cek MIME, selesai. Kenyataannya setiap fitur unggah melewati setidaknya tiga mesin yang berbeda — peramban, runtime aplikasi, dan web server — dan masing-masing punya definisi sendiri tentang apa itu "berkas PHP". Penyerang tidak perlu menembus ketiganya. Cukup satu lapisan yang salah percaya pada lapisan lain, dan jarak antara "berkas tersimpan" dengan "kode dieksekusi" menjadi nol.

Artikel ini membedah pola kegagalan itu secara struktural: bukan daftar trik, melainkan peta di mana kontrol diletakkan, mengapa kontrol yang tampak benar sering tidak mengikat, dan bagaimana memverifikasi hasilnya dengan matriks uji yang bisa diulang. Pembahasannya terbatas pada asesmen berizin; semua contoh menyasar instance lab milik sendiri.

## Tiga permukaan yang sering disalahpahami

Sebelum bicara bypass, perlu jelas dulu apa yang sebenarnya diperiksa. Sebagian besar implementasi memeriksa nama berkas, lalu header `Content-Type`, lalu kadang isi berkas. Ketiganya berada di posisi yang sangat berbeda dalam rantai kepercayaan.

### Peramban bukan kontrol

Validasi di sisi klien — atribut `accept` pada `<input type="file">`, pemeriksaan ekstensi dengan JavaScript, pemotongan ukuran sebelum submit — hanya memengaruhi antarmuka. Permintaan HTTP dapat dikirim langsung dengan `curl` atau proxy, melewati seluruh kode JavaScript. Ini bukan temuan yang menarik secara teknis, tetapi tetap muncul di laporan asesmen karena banyak pengembang menganggapnya sebagai lapisan pertahanan. Nilainya nol terhadap penyerang, dan sedikit positif terhadap pengguna keliru.

### `Content-Type` adalah klaim, bukan bukti

Header `Content-Type` pada multipart body dikirim oleh klien. PHP mengeksposnya sebagai `$_FILES['berkas']['type']`, dan nilai itu persis string yang dikirim penyerang. Memeriksa `$_FILES['berkas']['type'] === 'image/png'` sama dengan meminta pelaku menyatakan niatnya sendiri. Untuk membuktikan tipe berkas, satu-satunya cara yang tersedia di sisi server adalah membaca isi: magic bytes lewat `finfo_file()`, atau `getimagesize()` bila targetnya benar-benar gambar.[^finfo]

### Ekstensi adalah keputusan web server, bukan aplikasi

Aplikasi boleh menolak `.php`, tetapi yang menentukan eksekusi adalah konfigurasi handler di Apache atau nginx. Sebuah berkas bernama `laporan.pdf` tetap dapat dieksekusi jika direktori unggahan diberi `AddHandler application/x-httpd-php .pdf`, dan berkas bernama `gambar.jpg` dapat dieksekusi lewat manipulasi `PATH_INFO` di PHP-FPM. Aplikasi dan web server memakai aturan berbeda untuk string yang sama; di celah perbedaan itulah bypass hidup.

Konsekuensi desainnya langsung terasa: setiap kali dua komponen menafsirkan satu string dengan cara berbeda, string itu berubah menjadi batas kepercayaan. Nama berkas diurai oleh `pathinfo()` di PHP, oleh modul `mod_mime` di Apache, dan oleh ekspresi reguler `location` di nginx — tiga parser dengan aturan sendiri tentang titik, garis miring, dan huruf besar. Selama ketiganya tidak sepakat, validasi di lapisan mana pun dapat dilangkahi tanpa menyentuh lapisan lain. Karena itu asesmen yang baik tidak bertanya "apakah validasinya ada", melainkan "parser siapa yang akhirnya mengambil keputusan", lalu menguji string yang sengaja dibuat ambigu untuk parser itu.

## Pola kegagalan yang berulang

Contoh berikut adalah bentuk yang paling sering ditemui: blacklist ekstensi, trust pada `Content-Type`, nama berkas asli dipakai apa adanya, dan direktori unggahan berada di dalam document root.

```php
// path: public/upload.php
<?php
$dir = __DIR__ . '/uploads/';
$blacklist = ['php', 'php3', 'php4', 'php5', 'phtml'];

$name = $_FILES['berkas']['name'];              // nama dari klien, apa adanya
$ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));
$mime = $_FILES['berkas']['type'];              // klaim klien

if (in_array($ext, $blacklist, true)) {
    http_response_code(415);
    exit('Ekstensi tidak diizinkan');
}
if ($mime !== 'image/jpeg' && $mime !== 'image/png') {
    http_response_code(415);
    exit('Tipe tidak diizinkan');
}

move_uploaded_file($_FILES['berkas']['tmp_name'], $dir . $name);
echo 'Tersimpan: /uploads/' . htmlspecialchars($name);
```

Ada empat masalah terpisah di tujuh belas baris itu, dan masing-masing cukup untuk lolos sendiri-sendiri. Blacklist selalu tertinggal satu langkah: `.phar`, `.pht`, `.phps`, dan varian huruf besar tidak ada di daftar. Pemeriksaan `type` hanya membaca klaim klien. Nama berkas asli dipakai sehingga penyerang mengendalikan path relatif dan ekstensi akhir. Dan direktori `uploads/` berada di bawah document root, sehingga berkas yang tersimpan langsung dapat diminta lewat URL.[^cwe]

Kombinasi pertama yang biasanya berhasil adalah ekstensi alternatif yang belum masuk daftar. Bila `.phar` juga diblokir, langkah berikutnya adalah polyglot: header PNG yang valid diikuti kode PHP, disimpan sebagai `foto.png`. `getimagesize()` akan menerimanya, `finfo_file()` akan melaporkan `image/png`, dan pemeriksaan isi berbasis signature ikut lolos — karena berkas itu memang gambar yang valid, hanya bukan *hanya* gambar.

> [!warn] Semua uji pada artikel ini hanya sah dilakukan terhadap sistem yang Anda miliki atau yang memberi izin tertulis. Mengunggah berkas yang dapat dieksekusi ke sistem orang lain adalah tindak pidana di hampir semua yurisdiksi, terlepas dari niatnya. Siapkan snapshot VM sebelum menguji, dan catat hash setiap berkas uji agar bukti dapat direproduksi.

## Memverifikasi dengan matriks uji

Asesmen yang berguna bukan yang menemukan satu payload berhasil, melainkan yang memetakan titik validasi mana yang gagal untuk kelas berkas mana. Matriks berikut dipakai pada instance lab dengan konfigurasi PHP 8.2 + Apache 2.4, seluruh permintaan dikirim lewat `curl` tanpa peramban.

| # | Berkas uji | Titik validasi yang diuji | Perilaku server | Status | Catatan |
|---|---|---|---|---|---|
| 1 | `shell.php` | blacklist ekstensi | ditolak | 415 | kontrol dasar bekerja |
| 2 | `shell.PHP` | normalisasi huruf | tersimpan | 200 | filesystem case-insensitive |
| 3 | `shell.phtml` | blacklist tidak lengkap | tersimpan | 200 | dieksekusi oleh handler Apache |
| 4 | `foto.png` + PHP polyglot | `getimagesize()` | tersimpan | 200 | signature valid, isi ganda |
| 5 | `arsip.zip` berisi `.htaccess` | ekstensi arsip | tersimpan | 200 | ekstraksi di luar konteks unggah |
| 6 | `x.jpg/../shell.php` | sanitasi path | ditolak | 400 | normalisasi path bekerja |
| 7 | `gambar.jpg/x.php` | `PATH_INFO` di PHP-FPM | dieksekusi | 200 | `cgi.fix_pathinfo=1` + tanpa `try_files` |
| 8 | `.htaccess` | dotfile | tersimpan | 200 | `AddType` mengaktifkan handler |

Baris 7 adalah kasus yang paling sering terlewat dalam kode review, karena tidak ada satu pun baris PHP yang salah. Permintaan `GET /uploads/gambar.jpg/x.php` tidak menunjuk berkas `x.php`; ia menunjuk `gambar.jpg` dengan `PATH_INFO` seolah-olah itu skrip. Bila `cgi.fix_pathinfo` aktif dan konfigurasi tidak memaksa `try_files`, PHP-FPM akan mengeksekusi `gambar.jpg` sebagai PHP. Sejak PHP 5.3.3 nilai default-nya `0` di banyak distribusi, tetapi konfigurasi lama dan image kontainer pihak ketiga masih sering mengaktifkannya.[^nginx]

Untuk mengulang matriks di atas secara konsisten, harness kecil lebih baik daripada sepuluh perintah `curl` manual:

```python
# path: tools/probe_upload.py
import hashlib
import sys
from pathlib import Path

import requests

TARGET = sys.argv[1].rstrip("/") + "/upload.php"
CASES = [
    ("shell.php", b"<?php echo 1;", "application/x-php"),
    ("shell.phtml", b"<?php echo 1;", "image/png"),
    ("foto.png", Path("payload/foto.png").read_bytes(), "image/png"),
    (".htaccess", b"AddType application/x-httpd-php .png\n", "text/plain"),
]

for name, body, mime in CASES:
    files = {"berkas": (name, body, mime)}
    r = requests.post(TARGET, files=files, timeout=10, allow_redirects=False)
    digest = hashlib.sha256(body).hexdigest()[:12]
    print(f"{name:<16} {r.status_code}  sha256:{digest}  {r.text[:60]!r}")
```

Harness semacam ini membuat hasil dapat dibandingkan antar-konfigurasi: jalankan pada build lama dan build setelah perbaikan, lalu bandingkan status per baris. Yang dicari bukan "ada yang 200", melainkan "baris mana yang berubah".

## Ketika web server mengeksekusi lebih dari yang Anda kira

Konfigurasi di bawah memetakan setiap `.php` ke PHP-FPM dan menambahkan `try_files` untuk menutup jalur `PATH_INFO`. Perhatikan urutan `fastcgi_split_path_info` dan `try_files` — membalik urutannya mengembalikan celah yang sama.

```nginx
# path: deploy/nginx/upload.conf
server {
    root /srv/app/public;

    location ^~ /uploads/ {
        # berkas unggahan tidak pernah dieksekusi
        location ~ \.(php|phtml|phar)$ { return 403; }
        try_files $uri =404;
    }

    location ~ ^/index\.php(/|$) {
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        try_files $fastcgi_script_name =404;
        fastcgi_pass unix:/run/php/php-fpm.sock;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
    }

    location / { try_files $uri /index.php$is_args$args; }
}
```

Dua detail menentukan: `^~` pada `/uploads/` menghentikan pencarian regex di level atas sehingga urutan `location` tidak bisa dibalik oleh penambahan rule lain, dan `return 403` untuk ekstensi skrip berlaku bahkan bila berkas benar-benar ada. Menyimpan unggahan di luar document root dan menyajikannya lewat controller yang memeriksa hak akses tetap lebih kuat, tetapi konfigurasi di atas menutup kelas kegagalan yang paling umum tanpa mengubah aplikasi.

## Kontrol yang benar-benar mempersempit ruang gerak

Perbaikan dilakukan berlapis, dan setiap lapisan harus mandiri — tidak boleh mengasumsikan lapisan lain sudah bekerja.

1. **Allowlist, bukan blacklist.** Terima hanya ekstensi yang eksplisit dibutuhkan, dan tentukan ekstensi akhir dari hasil deteksi isi, bukan dari nama kiriman klien.
2. **Nama berkas dibuat server.** Simpan sebagai `random_bytes(16)` + ekstensi hasil allowlist; nama asli hanya disimpan sebagai metadata di basis data. Ini sekaligus menutup path traversal dan tabrakan nama.
3. **Isi diverifikasi ulang setelah tersimpan.** `finfo_file()` pada berkas hasil `move_uploaded_file`, bukan pada `tmp_name`, agar tidak ada jendela antara pemeriksaan dan pemakaian.
4. **Direktori unggahan tidak dapat mengeksekusi.** `php_flag engine off` pada Apache, atau `location` tanpa FastCGI pada nginx; idealnya simpan di luar `public/`.
5. **Ukuran dan jumlah dibatasi** sebelum berkas ditulis ke disk, supaya validasi isi tidak menjadi vektor kehabisan sumber daya.

Lima kontrol itu tidak membuat fitur unggah menjadi aman secara absolut — tidak ada yang bisa. Yang mereka lakukan adalah memastikan bahwa satu kesalahan konfigurasi tidak otomatis berarti eksekusi kode. Sebagian besar insiden unggah yang berujung pada web shell bukan hasil eksploitasi rantai panjang; itu hasil dari dua atau tiga kontrol yang masing-masing mengasumsikan kontrol lain sudah menutup celah.

## Catatan penutup

Pola yang berulang di seluruh matriks di atas sederhana: validasi yang memeriksa *nama* akan kalah dari penyerang yang mengendalikan nama, dan validasi yang memeriksa *klaim* akan kalah dari penyerang yang mengendalikan klaim. Yang tersisa hanyalah memeriksa isi dan memastikan server tidak pernah memperlakukan berkas unggahan sebagai program. Dua hal itu, ditambah direktori yang terisolasi, menutup mayoritas jalur yang dibahas di sini. Bila satu berkas tetap berhasil dieksekusi setelah seluruh rantai dipetakan, kontrol yang gagal tersebut hampir selalu satu dan sama saja: kepercayaan pada nama yang dikirim klien.[^owasp]

[^finfo]: PHP Manual, `finfo_file()` — membaca tipe MIME dari isi berkas, bukan dari ekstensi. <https://www.php.net/manual/en/function.finfo-file.php>
[^nginx]: nginx, `fastcgi_split_path_info` dan interaksinya dengan `try_files`. <https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html#fastcgi_split_path_info>
[^owasp]: OWASP File Upload Cheat Sheet — daftar kontrol yang direkomendasikan untuk fitur unggah. <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>
[^cwe]: CWE-434: Unrestricted Upload of File with Dangerous Type. <https://cwe.mitre.org/data/definitions/434.html>
