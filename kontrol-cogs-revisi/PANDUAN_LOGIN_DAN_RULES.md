# Panduan Login ID + Password & Keamanan Data

## Yang berubah di revisi ini
- Login memakai **ID + password** (dibuat langsung di aplikasi, tanpa email asli).
- Akses data **dibatasi per outlet** lewat Firestore rules. Tanpa akun, data tidak bisa dibaca/diubah/dihapus.
- Data contoh **tidak lagi dibuat otomatis**. Data sample lama bisa dihapus dari menu **Admin**.
- Perubahan (tambah/ubah/hapus) mengikuti Cloud secara real-time untuk semua pengguna.
  Bila ditolak atau gagal, muncul pesan error merah (tidak ada lagi "berhasil" palsu).

## Langkah pemasangan (urut)
1. **Aktifkan login**: Firebase Console > Authentication > Sign-in method > **Email/Password** > Enable.
   (ID Anda diubah otomatis menjadi `id@kontrolcogs.app` di belakang layar; tidak ada email yang dikirim.)
2. **Pasang rules**: Firebase Console > Firestore Database > Rules > tempel isi `firestore.rules` > Publish.
   Pilih database yang sama dengan `firestoreDatabaseId` di `firebase-applet-config.json`.
3. Jalankan/deploy aplikasi, buka halaman login. Karena belum ada admin, muncul **Setup awal**.
   Buat **admin pertama** SEGERA (sebelum link aplikasi dibagikan ke orang lain).
4. Masuk > menu **Admin** > **Tambah Akun Baru** untuk tiap outlet (role Manager/Viewer + pilih outlet).
5. Menu Admin > **Hapus Data Contoh** untuk membersihkan data sample lama di Cloud.

## Role
| Role | Lihat | Tambah/Ubah | Hapus | Kelola akun |
|---|---|---|---|---|
| Admin | semua outlet | semua outlet | ya | ya |
| Manager Outlet | outlet miliknya | outlet miliknya | outlet miliknya | tidak |
| Viewer | outlet miliknya | tidak | tidak | tidak |

Ingin hapus hanya oleh admin? Di `firestore.rules`, ubah tiga baris `allow delete: if canWrite(...)`
menjadi `allow delete: if isAdmin();` lalu Publish.

## Catatan penting
- **Lupa password**: admin tidak bisa melihat/mengganti password orang lain dari aplikasi.
  Pilihan: nonaktifkan akun lama dan buat ID baru, atau reset di Firebase Console > Authentication.
- Pengguna bisa ganti password sendiri lewat menu akun (pojok kanan atas).
- Akun yang login tetapi belum didaftarkan admin hanya melihat layar "Akun belum terdaftar".
- Data lama yang tersimpan dengan nama outlet tidak baku (mis. "Beo") dibaca sebagai "KOPI KLAN BEO"
  di layar, tetapi rules membandingkan nama persis. Bila ada manager yang tidak melihat data lamanya,
  perbaiki field `outlet` dokumen tersebut menjadi nama baku (admin bisa mengeditnya dari sheet).
- Uji rules lebih dulu di Firebase Console > Rules Playground bila Anda mengubahnya.

## File yang dibuat/diubah
- BARU: `src/services/authService.ts`, `src/hooks/useAuth.ts`, `src/components/LoginScreen.tsx`,
  `src/components/AccountMenu.tsx`, `src/components/AdminPanel.tsx`, `src/data/outletScope.ts`, `src/utils/outlets.ts`
- `src/Dashboard.tsx` = isi lama `App.tsx` yang direvisi; `src/App.tsx` kini penjaga login.
- DIUBAH: `firestore.rules`, `src/services/firebaseService.ts`, `src/firebase/config.ts`, `src/types/index.ts`,
  `src/components/Navbar.tsx`, dropdown outlet di `DynamicInputForm`, `SheetBulananView`,
  `SheetAnalisaKategoriView`, `SheetLogWasteView`, `firebase-blueprint.json`
