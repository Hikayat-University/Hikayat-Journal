import { useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { AdminLayout } from '../../components/AdminLayout';
import { Notice, type NoticeState } from '../../components/Notice';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import type { Profile } from '../../lib/types';

/** Memanggil Edge Function dan mengambil pesan error dari badan respons kalau gagal. */
async function callFunction(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      return payload?.error ?? error.message;
    }
    return error.message;
  }
  return data?.error ?? null;
}

export function AdminManage() {
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (error) {
      setNotice({ type: 'error', text: `Gagal memuat daftar admin: ${error.message}` });
      return;
    }
    setProfiles((data as Profile[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite() {
    if (!email.trim()) return;
    setSending(true);
    setNotice(null);
    const err = await callFunction('invite-admin', { email: email.trim(), full_name: fullName.trim() || email.trim() });
    setSending(false);
    if (err) {
      setNotice({ type: 'error', text: `Gagal mengundang: ${err}` });
      return;
    }
    setNotice({ type: 'success', text: `Undangan terkirim ke ${email.trim()}.` });
    setEmail('');
    setFullName('');
    load();
  }

  async function setActive(p: Profile, active: boolean) {
    const name = p.full_name ?? 'admin ini';
    const question = active
      ? `Aktifkan lagi ${name}? Ia bisa login kembali dengan kata sandinya.`
      : `Nonaktifkan ${name}? Ia tidak bisa login lagi. Jurnal, artikel, dan angket yang pernah ia buat tetap ada.`;
    if (!confirm(question)) return;

    setBusyId(p.id);
    setNotice(null);
    const err = await callFunction('set-admin-status', { user_id: p.id, active });
    setBusyId(null);
    if (err) {
      setNotice({ type: 'error', text: `Gagal mengubah status ${name}: ${err}` });
      return;
    }
    setNotice({
      type: 'success',
      text: active
        ? `${name} aktif kembali.`
        : `${name} dinonaktifkan. Kalau ia sedang login, sesinya berakhir paling lambat dalam satu jam.`,
    });
    load();
  }

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Kelola Admin</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 24 }}>
        Admin baru menerima email undangan untuk mengatur kata sandi sendiri.
      </p>
      <Notice notice={notice} />

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
        <button className="btn btn-accent" onClick={handleInvite} disabled={sending || !email.trim()}>
          {sending ? 'Mengirim…' : 'Kirim Undangan'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {profiles.map((p) => {
          const isSelf = p.id === session?.user.id;
          const disabled = !!p.disabled_at;
          return (
            <div key={p.id} className="card admin-row" style={{ opacity: disabled ? 0.6 : 1 }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {p.full_name}
                  {isSelf && <span style={{ fontWeight: 400, color: 'var(--ink-light)' }}> (kamu)</span>}
                </div>
                <span className="badge">{p.role === 'owner' ? 'Owner' : p.role === 'admin' ? 'Admin' : 'Bukan admin'}</span>{' '}
                {disabled && (
                  <span className="badge" title={`Sejak ${new Date(p.disabled_at!).toLocaleDateString('id-ID')}`}>
                    Nonaktif
                  </span>
                )}
              </div>
              {!isSelf && p.role !== 'owner' && (
                <button className="btn btn-outline" onClick={() => setActive(p, disabled)} disabled={busyId === p.id}>
                  {busyId === p.id ? 'Memproses…' : disabled ? 'Aktifkan lagi' : 'Nonaktifkan'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
