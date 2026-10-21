import React, { useEffect, useState } from 'react';
import { UserPlus, Save, X, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_OUTLETS } from '../data/initialData';
import {
  subscribeToUsers,
  createUserAccount,
  updateUserProfile,
  validateIdPassword,
  authErrorMessage,
  MIN_PASSWORD_LENGTH,
} from '../services/authService';
import { deleteSampleData } from '../services/firebaseService';

interface AdminPanelProps {
  currentUid: string;
  currentUserId: string;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: 'manager', label: 'Manager Outlet', hint: 'Input, ubah, hapus data outlet miliknya' },
  { value: 'viewer', label: 'Viewer', hint: 'Hanya melihat data outlet miliknya' },
  { value: 'admin', label: 'Admin', hint: 'Semua outlet + kelola akun' },
];

const roleLabel = (r: UserRole) => ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r;

const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600';

const OutletCheckboxes: React.FC<{
  value: string[];
  onChange: (v: string[]) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {INITIAL_OUTLETS.map((o) => {
      const checked = value.includes(o);
      return (
        <label
          key={o}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border cursor-pointer ${
            checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold' : 'bg-white border-slate-300 text-slate-600'
          }`}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onChange(checked ? value.filter((x) => x !== o) : [...value, o])}
            className="accent-blue-700"
          />
          {o}
        </label>
      );
    })}
  </div>
);

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUid, currentUserId, onToast }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Form akun baru
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('manager');
  const [newOutlets, setNewOutlets] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit akun
  const [editUid, setEditUid] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftRole, setDraftRole] = useState<UserRole>('manager');
  const [draftOutlets, setDraftOutlets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Data contoh
  const [confirmSample, setConfirmSample] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    const unsub = subscribeToUsers(
      (list) => {
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        onToast(authErrorMessage(err), 'error');
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const problem = validateIdPassword(newId, newPw);
    if (problem) return setFormError(problem);
    if (newRole !== 'admin' && newOutlets.length === 0) {
      return setFormError('Pilih minimal satu outlet untuk akun ini.');
    }
    setCreating(true);
    try {
      await createUserAccount(
        { userId: newId, name: newName, password: newPw, role: newRole, outlets: newOutlets },
        currentUserId
      );
      onToast(`Akun "${newId.trim().toLowerCase()}" berhasil dibuat.`);
      setNewId('');
      setNewName('');
      setNewPw('');
      setNewRole('manager');
      setNewOutlets([]);
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (u: UserProfile) => {
    setEditUid(u.uid);
    setDraftName(u.name);
    setDraftRole(u.role);
    setDraftOutlets(u.outlets || []);
  };

  const saveEdit = async (u: UserProfile) => {
    if (draftRole !== 'admin' && draftOutlets.length === 0) {
      return onToast('Pilih minimal satu outlet.', 'error');
    }
    setSaving(true);
    try {
      await updateUserProfile(u.uid, {
        name: draftName.trim() || u.userId,
        role: draftRole,
        outlets: draftRole === 'admin' ? [] : draftOutlets,
      });
      onToast(`Akun "${u.userId}" diperbarui.`);
      setEditUid(null);
    } catch (err) {
      onToast(authErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: UserProfile) => {
    try {
      await updateUserProfile(u.uid, { active: !u.active });
      onToast(`Akun "${u.userId}" ${u.active ? 'dinonaktifkan' : 'diaktifkan kembali'}.`);
    } catch (err) {
      onToast(authErrorMessage(err), 'error');
    }
  };

  const handleCleanSample = async () => {
    setCleaning(true);
    try {
      const n = await deleteSampleData();
      onToast(n > 0 ? `${n} baris data contoh dihapus dari Cloud.` : 'Tidak ada data contoh yang tersisa.');
      setConfirmSample(false);
    } catch (err) {
      onToast((err as Error).message, 'error');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Daftar akun */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Users className="w-4 h-4 text-slate-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Akun Pengguna ({users.length})</h3>
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500">Memuat akun...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => {
              const isMe = u.uid === currentUid;
              const editing = editUid === u.uid;
              return (
                <div key={u.uid} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">
                        {u.name}{' '}
                        <span className="font-mono font-normal text-xs text-slate-500">({u.userId})</span>
                        {isMe && <span className="ml-2 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">Anda</span>}
                        {!u.active && <span className="ml-2 text-[10px] font-semibold text-red-800 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">Nonaktif</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {roleLabel(u.role)}
                        {u.role !== 'admin' && ` · ${(u.outlets || []).join(', ') || 'Tanpa outlet'}`}
                      </div>
                    </div>
                    {!editing && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          disabled={isMe}
                          title={isMe ? 'Akun sendiri tidak bisa diubah di sini' : 'Ubah role / outlet'}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" /> Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(u)}
                          disabled={isMe}
                          className={`px-2.5 py-1.5 text-xs rounded-lg cursor-pointer disabled:opacity-40 ${
                            u.active ? 'text-red-700 bg-red-50 hover:bg-red-100' : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </div>
                    )}
                  </div>

                  {editing && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                      <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Nama" className={inputCls} />
                      <select value={draftRole} onChange={(e) => setDraftRole(e.target.value as UserRole)} className={inputCls}>
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label} - {o.hint}</option>
                        ))}
                      </select>
                      {draftRole !== 'admin' && <OutletCheckboxes value={draftOutlets} onChange={setDraftOutlets} />}
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditUid(null)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer">
                          <X className="w-3 h-3" /> Batal
                        </button>
                        <button type="button" onClick={() => saveEdit(u)} disabled={saving} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg cursor-pointer">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Simpan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          Lupa password? Admin tidak bisa melihat atau mengganti password orang lain dari aplikasi. Nonaktifkan akun lama
          lalu buat ID baru, atau reset lewat Firebase Console &gt; Authentication.
        </p>
      </section>

      {/* Tambah akun */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <UserPlus className="w-4 h-4 text-slate-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Tambah Akun Baru</h3>
        </div>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="ID login (mis. beo.manager)" autoCapitalize="none" spellCheck={false} className={inputCls} />
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama tampilan" className={inputCls} />
            <input type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder={`Password awal (min. ${MIN_PASSWORD_LENGTH} karakter)`} autoComplete="off" className={inputCls} />
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} className={inputCls}>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label} - {o.hint}</option>
              ))}
            </select>
          </div>
          {newRole !== 'admin' && (
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1.5">Outlet yang boleh diakses</div>
              <OutletCheckboxes value={newOutlets} onChange={setNewOutlets} />
            </div>
          )}
          {formError && (
            <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={creating} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg cursor-pointer">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Buat Akun
            </button>
          </div>
        </form>
      </section>

      {/* Data contoh */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Trash2 className="w-4 h-4 text-red-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Data Contoh Bawaan</h3>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Menghapus permanen baris data contoh bawaan aplikasi (ID <span className="font-mono">month-*</span>,{' '}
          <span className="font-mono">cat-*</span>, <span className="font-mono">waste-*</span>) dari Cloud. Data yang Anda
          input sendiri tidak ikut terhapus.
        </p>
        <div className="mt-3 flex items-center gap-2">
          {!confirmSample ? (
            <button type="button" onClick={() => setConfirmSample(true)} className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer">
              Hapus Data Contoh
            </button>
          ) : (
            <>
              <span className="text-xs text-red-700 font-semibold">Yakin? Tindakan ini tidak bisa dibatalkan.</span>
              <button type="button" onClick={handleCleanSample} disabled={cleaning} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg cursor-pointer">
                {cleaning && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Ya, Hapus
              </button>
              <button type="button" onClick={() => setConfirmSample(false)} className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                Batal
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
