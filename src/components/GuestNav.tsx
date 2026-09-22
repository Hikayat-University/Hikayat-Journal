import { Link, NavLink } from 'react-router-dom';

export function GuestNav() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(250, 249, 246, 0.92)',
        backdropFilter: 'blur(6px)',
        borderBottom: '1px solid var(--paper-mid)',
      }}
    >
      <div
        className="container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}
      >
        <Link
          to="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 600 }}
        >
          <img src="/logo.png" alt="Hikayat University" style={{ width: 36, height: 36 }} />
          Hikayat Journal
        </Link>
        <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <NavLink to="/jurnal" style={{ color: 'var(--ink-light)' }}>
            Jurnal
          </NavLink>
          <NavLink to="/artikel" style={{ color: 'var(--ink-light)' }}>
            Artikel
          </NavLink>
          <NavLink to="/admin/login" className="btn btn-outline">
            Masuk Admin
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
