import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import type { Profile } from '../../lib/types';

export function AdminManage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    setProfiles((data as Profile[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite() {
    if (!email.trim()) return;
    setSending(true);
    setStatus(null);
    const { data, error } = await supabase.functions.invoke('invite-admin', {
      body: { email, full_name: fullName || email },
    });
    setSending(false);
    if (error || data?.error) {
      setStatus(`Gagal mengundang: ${data?.error ?? error?.message}`);
      return;
    }
    setStatus(`Undangan terkirim ke ${email}.`);
    setEmail('');
    setFullName('');
    load();
  }

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Kelola Admin</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 24 }}>
        Admin baru menerima email undangan untuk mengatur kata sandi sendiri.
      </p>

      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Undang Admin Baru</h3>
        <div className="field">
          <label>Nama</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {status && <p style={{ fontSize: 13, marginBottom: 12, color: 'var(--ink-light)' }}>{status}</p>}
        <button className="btn btn-accent" onClick={handleInvite} disabled={sending}>
          {sending ? 'Mengirim…' : 'Kirim Undangan'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {profiles.map((p) => (
          <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>{p.full_name}</div>
            <span className="badge">{p.role}</span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
