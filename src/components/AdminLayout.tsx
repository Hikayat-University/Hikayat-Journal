import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../lib/usePageMeta';

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
  usePageMeta('Admin');
  const navigate = useNavigate();
  const location = useLocation();
  // Di layar kecil sidebar jadi laci yang dibuka lewat tombol menu.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const brand = (
    <>
      <img src="/logo.png" alt="Hikayat University" />
      Hikayat University Archive
    </>
  );

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <button
          className="admin-menu-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Buka menu"
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
        >
          <span />
          <span />
          <span />
        </button>
        <div className="admin-brand">{brand}</div>
      </header>

      {menuOpen && <div className="admin-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside id="admin-sidebar" className={`admin-sidebar${menuOpen ? ' open' : ''}`}>
        <div className="admin-brand" style={{ marginBottom: 32 }}>
          {brand}
          <button className="admin-close-btn" onClick={() => setMenuOpen(false)} aria-label="Tutup menu">
            ×
          </button>
        </div>
        <nav className="admin-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
          <Link to="/" target="_blank" className="admin-nav-external">
            Lihat situs ↗
          </Link>
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
      <main className="admin-main">{children}</main>
    </div>
  );
}
