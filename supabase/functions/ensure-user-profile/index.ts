import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('❌ Invalid token:', userError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Checking profile/role for user:', user.id);

    let profileCreated = false;
    let roleCreated = false;

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      console.log('⚠️ Profile missing, creating...');
      
      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
          email: user.email,
          is_active: true
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
      } else {
        profileCreated = true;
        console.log('✅ Profile created');
      }
    }

    // Check if role exists
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingRole) {
      console.log('⚠️ Role missing, assigning...');
      
      // Check if this is the first user (no other profiles)
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const assignedRole = (count === null || count <= 1) ? 'admin' : 'agent';
      console.log(`📝 Assigning role: ${assignedRole} (total profiles: ${count})`);

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: assignedRole
        });

      if (roleError) {
        console.error('❌ Error creating role:', roleError);
      } else {
        roleCreated = true;
        console.log(`✅ Role ${assignedRole} assigned`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      profileCreated,
      roleCreated,
      existingProfile: !!existingProfile,
      existingRole: !!existingRole
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
