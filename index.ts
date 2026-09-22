// Edge Function: invite-admin
// Dipanggil oleh admin yang sudah login untuk mengundang admin baru lewat email.
// Memakai service_role key yang HANYA hidup di server Supabase (Function Secrets),
// tidak pernah dikirim ke browser.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Tidak ada sesi.' }), { status: 401 });
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
      return new Response(JSON.stringify({ error: 'Sesi tidak valid.' }), { status: 401 });
    }

    const { email, full_name } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email wajib diisi.' }), { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name ?? email },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true, user: data.user }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
