import { Link } from 'react-router-dom';
import { GuestFooter, GuestNav } from '../../components/GuestNav';
import { usePageMeta } from '../../lib/usePageMeta';

export function NotFound() {
  usePageMeta('Halaman tidak ditemukan');

  return (
    <div className="guest-shell">
      <GuestNav />
      <section className="container page" style={{ flex: 1 }}>
        <div className="eyebrow">404</div>
        <h1 className="page-title" style={{ marginBottom: 16 }}>Halaman tidak ditemukan</h1>
        <p style={{ color: 'var(--ink-light)', lineHeight: 1.6, maxWidth: 520, marginBottom: 32 }}>
          Alamat yang kamu buka tidak ada, mungkin salah ketik atau halamannya sudah dipindah.
        </p>
        <div className="btn-row">
          <Link to="/" className="btn btn-accent">
            Ke beranda
          </Link>
          <Link to="/jurnal" className="btn btn-outline">
            Lihat jurnal
          </Link>
        </div>
      </section>
      <GuestFooter />
    </div>
  );
}
