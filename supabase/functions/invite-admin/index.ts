// Edge Function: invite-admin
// Dipanggil oleh admin yang sudah login untuk mengundang admin baru lewat email.
// Memakai service_role key yang HANYA hidup di server Supabase (Function Secrets),
// tidak pernah dikirim ke browser.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Browser mengirim preflight OPTIONS sebelum memanggil fungsi ini;
// tanpa header CORS, panggilan dari halaman admin ditolak browser.
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return reply({ error: 'Tidak ada sesi.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Pastikan pemanggil adalah admin yang sudah login (pakai anon key + token pemanggil)
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return reply({ error: 'Sesi tidak valid.' }, 401);
    }

    const { email, full_name } = await req.json();
    if (!email) {
      return reply({ error: 'Email wajib diisi.' }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name ?? email },
    });

    if (error) {
      return reply({ error: error.message }, 400);
    }

    return reply({ ok: true, user: data.user });
  } catch (e) {
    return reply({ error: String(e) }, 500);
  }
});
