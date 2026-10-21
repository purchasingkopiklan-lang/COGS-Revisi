import React, { useState } from 'react';
import { LogOut, KeyRound, User as UserIcon, X, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { logout, changeOwnPassword, authErrorMessage, MIN_PASSWORD_LENGTH } from '../services/authService';

const ROLE_LABEL: Record<UserProfile['role'], string> = {
  admin: 'Admin',
  manager: 'Manager Outlet',
  viewer: 'Viewer',
};

interface AccountMenuProps {
  profile: UserProfile;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ profile }) => {
  const [open, setOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const closePw = () => {
    setShowPw(false);
    setCurrent('');
    setNext('');
    setNext2('');
    setMsg(null);
  };

  const submitPw = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < MIN_PASSWORD_LENGTH) {
      return setMsg({ type: 'err', text: `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.` });
    }
    if (next !== next2) return setMsg({ type: 'err', text: 'Konfirmasi password baru tidak sama.' });
    setBusy(true);
    try {
      await changeOwnPassword(current, next);
      setMsg({ type: 'ok', text: 'Password berhasil diganti.' });
      setCurrent('');
      setNext('');
      setNext2('');
    } catch (err) {
      setMsg({ type: 'err', text: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
        title="Akun"
      >
        <UserIcon className="w-3.5 h-3.5 text-slate-600" />
        <span className="hidden sm:inline max-w-[110px] truncate">{profile.name || profile.userId}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
            <div className="pb-2 mb-2 border-b border-slate-100">
              <div className="text-sm font-bold text-slate-900 truncate">{profile.name || profile.userId}</div>
              <div className="text-[11px] text-slate-500 font-mono">{profile.userId}</div>
              <div className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                {ROLE_LABEL[profile.role]}
              </div>
              {profile.role !== 'admin' && (
                <div className="mt-1.5 text-[11px] text-slate-500">
                  {profile.outlets.length > 0 ? profile.outlets.join(', ') : 'Belum ada outlet'}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowPw(true);
              }}
              className="w-full flex items-center gap-2 px-2 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" /> Ganti Password
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full flex items-center gap-2 px-2 py-2 text-xs text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </>
      )}

      {showPw && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center px-4">
          <form onSubmit={submitPw} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Ganti Password</h3>
              <button type="button" onClick={closePw} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Password saat ini"
              autoComplete="current-password"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder={`Password baru (min. ${MIN_PASSWORD_LENGTH} karakter)`}
              autoComplete="new-password"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <input
              type="password"
              value={next2}
              onChange={(e) => setNext2(e.target.value)}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {msg && (
              <div
                role="alert"
                className={`text-xs rounded-lg px-3 py-2 border ${
                  msg.type === 'ok'
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}
              >
                {msg.text}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={closePw} className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                Tutup
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg cursor-pointer"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
