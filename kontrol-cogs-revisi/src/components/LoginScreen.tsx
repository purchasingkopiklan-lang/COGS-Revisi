import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import {
  loginWithId,
  bootstrapFirstAdmin,
  isSetupDone,
  validateIdPassword,
  authErrorMessage,
  MIN_PASSWORD_LENGTH,
} from '../services/authService';

type Mode = 'login' | 'setup';

export const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Tawarkan "Setup admin pertama" hanya bila belum pernah dilakukan
  useEffect(() => {
    isSetupDone().then((done) => {
      setSetupAvailable(!done);
      if (!done) setMode('setup');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'setup') {
      const problem = validateIdPassword(userId, password);
      if (problem) return setError(problem);
      if (password !== password2) return setError('Konfirmasi password tidak sama.');
    } else if (!userId.trim() || !password) {
      return setError('Isi ID dan password.');
    }

    setBusy(true);
    try {
      if (mode === 'setup') {
        await bootstrapFirstAdmin(userId, name, password);
      } else {
        await loginWithId(userId, password);
      }
      // Berhasil: useAuth otomatis memindahkan ke dashboard
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Kontrol COGS & Purchasing</h1>
            <p className="text-xs text-slate-500">Kopi Klan Multi-Outlet</p>
          </div>
        </div>

        {mode === 'setup' && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <b>Setup awal.</b> Belum ada admin. Buat akun admin pertama sekarang. Setelah ini, akun lain
              hanya bisa dibuat oleh admin dari menu Admin.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="contoh: admin.purchasing"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {mode === 'setup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama tampilan"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                placeholder={mode === 'setup' ? `Minimal ${MIN_PASSWORD_LENGTH} karakter` : ''}
                className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'setup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ulangi Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}

          {error && (
            <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg cursor-pointer"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'setup' ? 'Buat Admin Pertama' : 'Masuk'}
          </button>
        </form>

        {setupAvailable && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === 'setup' ? 'login' : 'setup');
            }}
            className="mt-4 w-full text-xs text-blue-700 hover:underline cursor-pointer"
          >
            {mode === 'setup' ? 'Sudah punya akun? Masuk' : 'Belum ada admin? Setup admin pertama'}
          </button>
        )}

        {mode === 'login' && (
          <p className="mt-4 text-[11px] text-slate-400 text-center">
            Belum punya akun? Minta admin membuatkan ID untuk outlet Anda.
          </p>
        )}
      </div>
    </div>
  );
};
