import { INITIAL_OUTLETS } from './initialData';

// Daftar outlet yang BOLEH dipakai pengguna yang sedang login.
// Array ini diisi ulang saat login (lihat App.tsx) sehingga dropdown outlet di semua
// form/sheet otomatis hanya menampilkan outlet milik pengguna. Admin melihat semua outlet.
export const ALLOWED_OUTLETS: string[] = [...INITIAL_OUTLETS];

export function setAllowedOutlets(list: string[]) {
  ALLOWED_OUTLETS.splice(0, ALLOWED_OUTLETS.length, ...list);
}
