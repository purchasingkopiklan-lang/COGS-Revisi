import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  query,
  where,
  writeBatch,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import {
  MonthlyReportEntry,
  CategoryAnalysisEntry,
  WasteLogEntry,
} from '../types';
import {
  INITIAL_MONTHLY_DATA,
  INITIAL_CATEGORY_DATA,
  INITIAL_WASTE_DATA,
} from '../data/initialData';
import { normalizeOutlet } from '../utils/outlets';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// ID login pengguna yang sedang aktif (dari email palsu <id>@kontrolcogs.app)
function currentUserId(): string {
  return auth.currentUser?.email?.split('@')[0] || 'unknown';
}

export function firestoreErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  if (code === 'permission-denied') {
    return 'Akses ditolak: akun Anda tidak punya izin untuk tindakan ini pada outlet tersebut.';
  }
  if (code === 'unavailable') {
    return 'Tidak bisa terhubung ke server. Periksa koneksi internet Anda.';
  }
  if (code === 'unauthenticated') {
    return 'Sesi login berakhir. Silakan login kembali.';
  }
  return error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses data.';
}

// Mencatat detail di console, lalu melempar error dengan pesan yang ramah untuk ditampilkan UI.
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  console.error('Firestore Error: ', JSON.stringify({
    error: error instanceof Error ? error.message : String(error),
    code: (error as { code?: string })?.code,
    operationType,
    path,
    userId: auth.currentUser?.email ?? null,
  }));
  throw new Error(firestoreErrorMessage(error));
}

// ----------------------------------------------------------------------
// Cakupan data per pengguna
//  - admin   : membaca seluruh koleksi
//  - lainnya : satu listener per outlet miliknya (where outlet == X), supaya
//              sesuai dengan Firestore rules. Hasil digabung di sini.
// ----------------------------------------------------------------------
export interface DataScope {
  isAdmin: boolean;
  outlets: string[];
}

type WithOutlet = { id: string; outlet: string; createdAt?: string };

function snapshotToItems<T extends WithOutlet>(snap: QuerySnapshot<DocumentData>): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
}

function sortNewestFirst<T extends WithOutlet>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ca = a.createdAt || '';
    const cb = b.createdAt || '';
    if (ca !== cb) return cb.localeCompare(ca);
    return a.id.localeCompare(b.id);
  });
}

function subscribeScoped<T extends WithOutlet>(
  path: string,
  scope: DataScope,
  onData: (items: T[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(db, path);
  const fail = (err: unknown) => {
    console.error(`Listener ${path} gagal:`, err);
    onError?.(err);
  };

  if (scope.isAdmin) {
    return onSnapshot(colRef, (snap) => onData(sortNewestFirst(snapshotToItems<T>(snap))), fail);
  }

  const outlets = scope.outlets;
  if (outlets.length === 0) {
    onData([]);
    return () => {};
  }

  const buckets = new Map<string, T[]>();
  const unsubs = outlets.map((outlet) =>
    onSnapshot(
      query(colRef, where('outlet', '==', outlet)),
      (snap) => {
        buckets.set(outlet, snapshotToItems<T>(snap));
        // Kirim hanya setelah semua outlet sempat melapor, supaya tidak berkedip
        if (buckets.size === outlets.length) {
          onData(sortNewestFirst(Array.from(buckets.values()).flat()));
        }
      },
      fail
    )
  );
  return () => unsubs.forEach((u) => u());
}

// Menulis dokumen baru / perubahan dengan penyeragaman outlet + jejak pengguna
function stamp<T extends { outlet?: string }>(data: T, isNew: boolean): T & Record<string, unknown> {
  const now = new Date().toISOString();
  const out: Record<string, unknown> = { ...data, updatedAt: now, updatedBy: currentUserId() };
  if (typeof data.outlet === 'string') out.outlet = normalizeOutlet(data.outlet);
  if (isNew) {
    out.createdAt = now;
    out.createdBy = currentUserId();
  }
  delete out.id;
  return out as T & Record<string, unknown>;
}

// ----------------------------------------------------------------------
// 1. Sheet Bulanan (Monthly Reports)
// ----------------------------------------------------------------------
const MONTHLY_PATH = 'monthly_reports';

export function subscribeToMonthlyReports(
  scope: DataScope,
  onData: (data: MonthlyReportEntry[]) => void,
  onError?: (err: unknown) => void
) {
  return subscribeScoped<MonthlyReportEntry>(MONTHLY_PATH, scope, onData, onError);
}

export async function addMonthlyReportDoc(entry: Omit<MonthlyReportEntry, 'id'>): Promise<string> {
  const newDocRef = doc(collection(db, MONTHLY_PATH));
  try {
    await setDoc(newDocRef, stamp(entry, true));
    return newDocRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${MONTHLY_PATH}/${newDocRef.id}`);
  }
}

export async function updateMonthlyReportDoc(id: string, updated: Partial<MonthlyReportEntry>): Promise<void> {
  try {
    await updateDoc(doc(db, MONTHLY_PATH, id), stamp(updated, false));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${MONTHLY_PATH}/${id}`);
  }
}

export async function deleteMonthlyReportDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, MONTHLY_PATH, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${MONTHLY_PATH}/${id}`);
  }
}

// ----------------------------------------------------------------------
// 2. Sheet Analisa Kategori (Category Analysis)
// ----------------------------------------------------------------------
const CATEGORY_PATH = 'category_analysis';

export function subscribeToCategoryAnalysis(
  scope: DataScope,
  onData: (data: CategoryAnalysisEntry[]) => void,
  onError?: (err: unknown) => void
) {
  return subscribeScoped<CategoryAnalysisEntry>(CATEGORY_PATH, scope, onData, onError);
}

export async function addCategoryAnalysisDoc(entry: Omit<CategoryAnalysisEntry, 'id'>): Promise<string> {
  const newDocRef = doc(collection(db, CATEGORY_PATH));
  try {
    await setDoc(newDocRef, stamp(entry, true));
    return newDocRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${CATEGORY_PATH}/${newDocRef.id}`);
  }
}

// Dipecah per 10 dokumen: setiap dokumen dicek rules (1 akses profil), dan Firestore
// membatasi jumlah akses dokumen per batch.
const BATCH_CHUNK = 10;

export async function addCategoryBatchDocs(entries: Omit<CategoryAnalysisEntry, 'id'>[]): Promise<void> {
  try {
    for (let i = 0; i < entries.length; i += BATCH_CHUNK) {
      const batch = writeBatch(db);
      entries.slice(i, i + BATCH_CHUNK).forEach((entry) => {
        batch.set(doc(collection(db, CATEGORY_PATH)), stamp(entry, true));
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, CATEGORY_PATH);
  }
}

export async function updateCategoryAnalysisDoc(id: string, updated: Partial<CategoryAnalysisEntry>): Promise<void> {
  try {
    await updateDoc(doc(db, CATEGORY_PATH, id), stamp(updated, false));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${CATEGORY_PATH}/${id}`);
  }
}

export async function deleteCategoryAnalysisDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CATEGORY_PATH, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${CATEGORY_PATH}/${id}`);
  }
}

// ----------------------------------------------------------------------
// 3. Sheet Log Waste
// ----------------------------------------------------------------------
const WASTE_PATH = 'waste_logs';

export function subscribeToWasteLogs(
  scope: DataScope,
  onData: (data: WasteLogEntry[]) => void,
  onError?: (err: unknown) => void
) {
  return subscribeScoped<WasteLogEntry>(WASTE_PATH, scope, onData, onError);
}

export async function addWasteLogDoc(entry: Omit<WasteLogEntry, 'id'>): Promise<string> {
  const newDocRef = doc(collection(db, WASTE_PATH));
  try {
    await setDoc(newDocRef, stamp(entry, true));
    return newDocRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${WASTE_PATH}/${newDocRef.id}`);
  }
}

export async function updateWasteLogDoc(id: string, updated: Partial<WasteLogEntry>): Promise<void> {
  try {
    await updateDoc(doc(db, WASTE_PATH, id), stamp(updated, false));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${WASTE_PATH}/${id}`);
  }
}

export async function deleteWasteLogDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, WASTE_PATH, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${WASTE_PATH}/${id}`);
  }
}

// ----------------------------------------------------------------------
// Pembersihan data contoh (khusus admin)
// Data contoh lama punya ID tetap (month-1.., cat-1.., waste-1..). Fungsi ini
// hanya menghapus dokumen dengan ID tersebut yang masih ada di cloud.
// ----------------------------------------------------------------------
export async function deleteSampleData(): Promise<number> {
  const targets: { path: string; id: string }[] = [
    ...INITIAL_MONTHLY_DATA.map((d) => ({ path: MONTHLY_PATH, id: d.id })),
    ...INITIAL_CATEGORY_DATA.map((d) => ({ path: CATEGORY_PATH, id: d.id })),
    ...INITIAL_WASTE_DATA.map((d) => ({ path: WASTE_PATH, id: d.id })),
  ];

  try {
    // Hanya hapus yang benar-benar ada (menghapus dokumen yang tidak ada akan ditolak rules)
    const existing: { path: string; id: string }[] = [];
    for (const t of targets) {
      const snap = await getDoc(doc(db, t.path, t.id));
      if (snap.exists()) existing.push(t);
    }

    for (let i = 0; i < existing.length; i += BATCH_CHUNK) {
      const batch = writeBatch(db);
      existing.slice(i, i + BATCH_CHUNK).forEach((t) => batch.delete(doc(db, t.path, t.id)));
      await batch.commit();
    }
    return existing.length;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'sample-data');
  }
}
