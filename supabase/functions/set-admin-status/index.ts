// Edge Function: set-admin-status
// Menonaktifkan atau mengaktifkan kembali akun admin.
// Akun tidak dihapus karena konten lama merujuk ke profilnya (created_by);
// yang dilakukan: login diblokir (ban) dan profiles.disabled_at diisi.
// Memakai service_role key yang HANYA hidup di server Supabase (Function Secrets).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Durasi ban maksimum praktis (~100 tahun); 'none' mencabut ban.
const BAN_FOREVER = '876000h';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return reply({ error: 'Tidak ada sesi.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) return reply({ error: 'Sesi tidak valid.' }, 401);
    const callerId = userData.user.id;

    const { user_id, active } = await req.json();
    if (!user_id || typeof active !== 'boolean') {
      return reply({ error: 'user_id dan active wajib diisi.' }, 400);
    }
    if (user_id === callerId) return reply({ error: 'Kamu tidak bisa menonaktifkan akunmu sendiri.' }, 400);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: profiles, error: profErr } = await adminClient
      .from('profiles')
      .select('id, role, disabled_at')
      .in('id', [callerId, user_id]);
    if (profErr) return reply({ error: profErr.message }, 500);

    const caller = profiles?.find((p) => p.id === callerId);
    const target = profiles?.find((p) => p.id === user_id);
    if (!caller || caller.disabled_at || !['admin', 'owner'].includes(caller.role)) {
      return reply({ error: 'Hanya admin aktif yang boleh mengubah status admin.' }, 403);
    }
    if (!target) return reply({ error: 'Admin tidak ditemukan.' }, 404);
    if (target.role === 'owner') return reply({ error: 'Akun owner tidak bisa dinonaktifkan.' }, 403);

    const { error: banErr } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: active ? 'none' : BAN_FOREVER,
    });
    if (banErr) return reply({ error: banErr.message }, 400);

    const { error: updErr } = await adminClient
      .from('profiles')
      .update({ disabled_at: active ? null : new Date().toISOString() })
      .eq('id', user_id);
    if (updErr) return reply({ error: updErr.message }, 500);

    return reply({ ok: true });
  } catch (e) {
    return reply({ error: String(e) }, 500);
  }
});
