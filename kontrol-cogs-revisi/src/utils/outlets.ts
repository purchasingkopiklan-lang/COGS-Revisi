// Menyeragamkan nama outlet agar cocok dengan daftar outlet pada profil pengguna & Firestore rules.
export const normalizeOutlet = (outlet: string): string => {
  if (!outlet) return 'KOPI KLAN CIHEULEUT';
  const lower = outlet.toLowerCase().trim();
  if (lower === 'beo' || lower === 'kopi klan beo') return 'KOPI KLAN BEO';
  if (lower === 'ciheuleut' || lower === 'kopi klan ciheuleut') return 'KOPI KLAN CIHEULEUT';
  if (lower.includes('pama') || lower === 'kopi klan pama persada') return 'KOPI KLAN PAMA PERSADA';
  if (lower.includes('kanitra') || lower === 'kopi klan x kanitra') return 'KOPI KLAN X KANITRA';
  return outlet;
};
