import { Link, NavLink } from 'react-router-dom';

export function GuestNav() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to="/" className="brand">
          <img src="/logo.png" alt="Hikayat University" />
          Hikayat Journal
        </Link>
        <nav className="site-nav">
          <NavLink to="/jurnal">Jurnal</NavLink>
          <NavLink to="/artikel">Artikel</NavLink>
        </nav>
      </div>
    </header>
  );
}

export function GuestFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <span>© {new Date().getFullYear()} Hikayat University</span>
        <Link to="/admin/login">Masuk admin</Link>
      </div>
    </footer>
  );
}
