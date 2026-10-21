import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

// ----------------------------------------------------------------------
// Login memakai "ID" (bukan email). Di belakang layar Firebase Auth butuh
// format email, jadi ID diubah menjadi  <id>@kontrolcogs.app  (email palsu,
// tidak pernah dikirimi email).
// ----------------------------------------------------------------------
const EMAIL_DOMAIN = 'kontrolcogs.app';
export const ID_PATTERN = /^[a-z0-9._-]{3,30}$/;
export const MIN_PASSWORD_LENGTH = 8;

export const normalizeUserId = (id: string) => id.trim().toLowerCase();
export const idToEmail = (id: string) => `${normalizeUserId(id)}@${EMAIL_DOMAIN}`;

export function validateIdPassword(id: string, password: string): string | null {
  if (!ID_PATTERN.test(normalizeUserId(id))) {
    return 'ID harus 3-30 karakter: huruf kecil, angka, titik, strip, atau underscore (tanpa spasi).';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  return null;
}

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'ID atau password salah.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan gagal. Tunggu beberapa menit lalu coba lagi.';
    case 'auth/email-already-in-use':
      return 'ID tersebut sudah dipakai. Gunakan ID lain.';
    case 'auth/weak-password':
      return `Password terlalu lemah (minimal ${MIN_PASSWORD_LENGTH} karakter).`;
    case 'auth/operation-not-allowed':
      return 'Login Email/Password belum diaktifkan di Firebase Console (Authentication > Sign-in method).';
    case 'auth/network-request-failed':
      return 'Koneksi internet bermasalah. Coba lagi.';
    case 'auth/requires-recent-login':
      return 'Sesi sudah lama. Keluar lalu login kembali sebelum mengganti password.';
    case 'permission-denied':
      return 'Akses ditolak oleh aturan keamanan (Firestore rules).';
    default:
      return (err as Error)?.message || 'Terjadi kesalahan. Coba lagi.';
  }
}

// Penanda agar UI tidak sempat menampilkan "akun belum terdaftar" saat setup admin berjalan
let setupInFlight = false;
export const isSetupInFlight = () => setupInFlight;

// ----------------------------------------------------------------------
// Login / Logout
// ----------------------------------------------------------------------
export async function loginWithId(id: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, idToEmail(id), password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

// ----------------------------------------------------------------------
// Setup admin pertama (hanya bisa SEKALI, dijaga Firestore rules via meta/bootstrap)
// ----------------------------------------------------------------------
export async function isSetupDone(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'meta', 'bootstrap'));
    return snap.exists();
  } catch {
    // Jika gagal dibaca, anggap sudah setup supaya tidak menawarkan setup yang akan gagal
    return true;
  }
}

export async function bootstrapFirstAdmin(id: string, name: string, password: string): Promise<void> {
  const userId = normalizeUserId(id);
  setupInFlight = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, idToEmail(userId), password);
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);
      batch.set(doc(db, 'meta', 'bootstrap'), { createdAt: now, by: userId });
      batch.set(doc(db, 'users', cred.user.uid), {
        userId,
        name: name.trim() || userId,
        role: 'admin',
        outlets: [],
        active: true,
        createdAt: now,
        createdBy: userId,
      });
      await batch.commit();
    } catch (e) {
      // Setup gagal (mis. admin sudah ada): hapus akun login yang barusan terbentuk
      await deleteUser(cred.user).catch(() => {});
      throw e;
    }
  } finally {
    setupInFlight = false;
  }
}

// ----------------------------------------------------------------------
// Kelola akun (khusus admin)
// ----------------------------------------------------------------------
export interface NewUserInput {
  userId: string;
  name: string;
  password: string;
  role: UserRole;
  outlets: string[];
}

export async function createUserAccount(input: NewUserInput, createdBy: string): Promise<void> {
  const userId = normalizeUserId(input.userId);

  // Pakai instance Firebase sementara supaya admin TIDAK ikut ter-logout
  const secondary = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  let uid = '';
  try {
    const secAuth = getAuth(secondary);
    const cred = await createUserWithEmailAndPassword(secAuth, idToEmail(userId), input.password);
    uid = cred.user.uid;
    await signOut(secAuth);
  } finally {
    await deleteApp(secondary).catch(() => {});
  }

  try {
    await setDoc(doc(db, 'users', uid), {
      userId,
      name: input.name.trim() || userId,
      role: input.role,
      outlets: input.role === 'admin' ? [] : input.outlets,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy,
    });
  } catch (e) {
    throw new Error(
      'Akun login terbentuk tetapi profilnya gagal disimpan, sehingga belum bisa dipakai. ' +
        'Hapus akun "' + userId + '" di Firebase Console > Authentication lalu buat ulang. (' +
        authErrorMessage(e) + ')'
    );
  }
}

export function subscribeToUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const list: UserProfile[] = snap.docs.map(
        (d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) })
      );
      list.sort((a, b) => a.userId.localeCompare(b.userId));
      onData(list);
    },
    (err) => {
      console.error('Gagal memuat daftar akun:', err);
      onError?.(err);
    }
  );
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, 'name' | 'role' | 'outlets' | 'active'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), patch);
}

// ----------------------------------------------------------------------
// Ganti password sendiri
// ----------------------------------------------------------------------
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Sesi login tidak ditemukan.');
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`);
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
