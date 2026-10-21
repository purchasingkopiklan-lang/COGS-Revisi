import React from 'react';
import { Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { LoginScreen } from './components/LoginScreen';
import Dashboard from './Dashboard';
import { setAllowedOutlets } from './data/outletScope';
import { INITIAL_OUTLETS } from './data/initialData';
import { logout } from './services/authService';

const CenteredCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-h-screen bg-slate-100/70 flex items-center justify-center px-4">
    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xs p-6 text-center">
      <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto mb-3" />
      <h1 className="text-base font-bold text-slate-900 mb-2">{title}</h1>
      <div className="text-xs text-slate-600 space-y-3">{children}</div>
      <button
        type="button"
        onClick={() => logout()}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" /> Keluar
      </button>
    </div>
  </div>
);

export default function App() {
  const { status, profile } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
      </div>
    );
  }

  if (status === 'signedOut') return <LoginScreen />;

  if (status === 'noProfile') {
    return (
      <CenteredCard title="Akun belum terdaftar">
        <p>ID Anda berhasil login, tetapi belum didaftarkan oleh admin sehingga belum bisa membuka data.</p>
        <p>Hubungi admin untuk didaftarkan ke outlet Anda.</p>
      </CenteredCard>
    );
  }

  if (status === 'disabled' || !profile) {
    return (
      <CenteredCard title="Akun dinonaktifkan">
        <p>Akun ini tidak aktif. Hubungi admin bila ini keliru.</p>
      </CenteredCard>
    );
  }

  // Dropdown outlet di seluruh form/sheet mengikuti hak akses akun ini.
  // Dipanggil sebelum Dashboard dirender agar nilai awal form sudah benar.
  setAllowedOutlets(profile.role === 'admin' ? [...INITIAL_OUTLETS] : profile.outlets);

  // key=uid: ganti akun => Dashboard dibuat ulang, tidak ada sisa data akun sebelumnya
  return <Dashboard key={profile.uid} profile={profile} />;
}
