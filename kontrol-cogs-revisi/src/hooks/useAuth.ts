import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../types';
import { isSetupInFlight } from '../services/authService';

export type AuthStatus =
  | 'loading'      // menunggu Firebase
  | 'signedOut'    // belum login
  | 'noProfile'    // login berhasil tetapi belum didaftarkan admin
  | 'disabled'     // akun dinonaktifkan
  | 'ready';       // siap dipakai

export function useAuth(): { status: AuthStatus; profile: UserProfile | null; user: User | null } {
  const [fbUser, setFbUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      if (!u) setProfile(undefined);
    });
  }, []);

  const uid = fbUser?.uid;
  useEffect(() => {
    if (!uid) return;
    setProfile(undefined);
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        setProfile(snap.exists() ? ({ uid, ...(snap.data() as Omit<UserProfile, 'uid'>) }) : null);
      },
      (err) => {
        console.error('Gagal memuat profil pengguna:', err);
        setProfile(null);
      }
    );
  }, [uid]);

  let status: AuthStatus;
  if (fbUser === undefined) status = 'loading';
  else if (fbUser === null) status = 'signedOut';
  else if (profile === undefined) status = 'loading';
  else if (profile === null) status = isSetupInFlight() ? 'loading' : 'noProfile';
  else if (!profile.active) status = 'disabled';
  else status = 'ready';

  return { status, profile: profile ?? null, user: fbUser ?? null };
}
