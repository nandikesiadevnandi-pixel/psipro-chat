import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function upgrades the first active admin@psipro.app user to admin role
// It is protected by a shared secret to prevent misuse
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Require valid JWT to call this function
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if this user's email is an admin email OR if there's no active admin with a profile
    const { data: activeAdmins } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .in('user_id', supabaseAdmin.from('profiles').select('id'));

    // Count admins that actually have profiles (active admins)
    const { data: adminsWithProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('id',
        (await supabaseAdmin.from('user_roles').select('user_id').eq('role', 'admin')).data?.map(r => r.user_id) ?? []
      );

    const hasActiveAdmin = adminsWithProfiles && adminsWithProfiles.length > 0;

    if (hasActiveAdmin) {
      // There's already an active admin, check if this user is one
      const { data: isAdmin } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!isAdmin) {
        return new Response(JSON.stringify({
          error: 'An active admin already exists. Cannot promote this user automatically.',
          hasActiveAdmin: true
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'User is already admin',
        upgraded: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // No active admin with profile — promote this user to admin
    console.log(`[fix-admin-role] No active admin found. Promoting user ${user.id} to admin...`);

    // Delete existing agent role
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user.id)
      .eq('role', 'agent');

    // Insert admin role
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id,role' });

    if (insertError) {
      console.error('[fix-admin-role] Error inserting admin role:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[fix-admin-role] User ${user.id} (${user.email}) successfully promoted to admin`);

    return new Response(JSON.stringify({
      success: true,
      message: `User ${user.email} promoted to admin`,
      upgraded: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[fix-admin-role] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
