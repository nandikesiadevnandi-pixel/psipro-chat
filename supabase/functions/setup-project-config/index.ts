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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[setup-project-config] Starting automatic project configuration...');

    // 1. Populate Vault with project credentials
    console.log('[setup-project-config] Populating Vault with project credentials...');
    
    const { error: vaultError } = await supabase.rpc('vault.create_secret', {
      secret: supabaseUrl,
      name: 'project_url'
    }).then(() => supabase.rpc('vault.create_secret', {
      secret: supabaseAnonKey,
      name: 'anon_key'
    }));

    // Note: vault.create_secret might fail if secrets already exist, which is fine
    if (vaultError) {
      console.log('[setup-project-config] Vault secrets may already exist:', vaultError.message);
    }

    // 2. Remove old hardcoded cron jobs
    console.log('[setup-project-config] Removing old hardcoded cron jobs...');
    
    const { error: deleteError } = await supabase.rpc('exec_sql', {
      sql: `
        DELETE FROM cron.job 
        WHERE jobname IN ('sync-contact-profiles-daily', 'check-instances-status');
      `
    });

    if (deleteError) {
      console.error('[setup-project-config] Error removing old cron jobs:', deleteError);
    }

    // 3. Create new dynamic cron jobs
    console.log('[setup-project-config] Creating new dynamic cron jobs...');

    // Create check-instances-status job (every 5 minutes)
    const { error: cronError1 } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT cron.schedule(
          'check-instances-status',
          '*/5 * * * *',
          $$
          SELECT net.http_post(
            url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') 
                   || '/functions/v1/check-instances-status',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            ),
            body := jsonb_build_object('time', now())
          );
          $$
        );
      `
    });

    if (cronError1) {
      console.error('[setup-project-config] Error creating check-instances-status cron:', cronError1);
    } else {
      console.log('[setup-project-config] ✓ check-instances-status cron job created');
    }

    // Create sync-contact-profiles-daily job (daily at 3 AM)
    const { error: cronError2 } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT cron.schedule(
          'sync-contact-profiles-daily',
          '0 3 * * *',
          $$
          SELECT net.http_post(
            url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') 
                   || '/functions/v1/sync-contact-profiles',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            ),
            body := jsonb_build_object('time', now())
          );
          $$
        );
      `
    });

    if (cronError2) {
      console.error('[setup-project-config] Error creating sync-contact-profiles-daily cron:', cronError2);
    } else {
      console.log('[setup-project-config] ✓ sync-contact-profiles-daily cron job created');
    }

    console.log('[setup-project-config] Configuration completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Project configuration completed successfully',
        cron_jobs_created: !cronError1 && !cronError2,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[setup-project-config] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 200, // Always return 200 to avoid retries
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
