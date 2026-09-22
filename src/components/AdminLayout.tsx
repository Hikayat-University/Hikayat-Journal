import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/admin', label: 'Ringkasan', end: true },
  { to: '/admin/jurnal', label: 'Jurnal' },
  { to: '/admin/artikel', label: 'Artikel' },
  { to: '/admin/notulensi', label: 'Notulensi Kelas' },
  { to: '/admin/angket', label: 'Angket Riset' },
  { to: '/admin/pengguna', label: 'Kelola Admin' },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          background: 'var(--ink)',
          color: 'var(--white)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--f-display)', fontSize: 18, marginBottom: 32, padding: '0 8px' }}>
          <img src="/logo.png" alt="Hikayat University" style={{ width: 32, height: 32 }} />
          Hikayat Journal
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              style={({ isActive }) => ({
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 14,
                color: isActive ? 'var(--ink)' : 'rgba(255,255,255,0.8)',
                background: isActive ? 'var(--white)' : 'transparent',
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 16, marginTop: 16 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', padding: '0 8px', marginBottom: 8 }}>
            {profile?.full_name ?? 'Admin'}
          </div>
          <button onClick={handleSignOut} className="btn btn-outline" style={{ width: '100%', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
            Keluar
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, background: 'var(--paper)' }}>{children}</main>
    </div>
  );
}
