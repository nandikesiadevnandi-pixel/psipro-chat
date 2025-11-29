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

    // 1. Store project credentials in project_config table
    console.log('[setup-project-config] Storing project credentials...');
    
    const { error: configError1 } = await supabase
      .from('project_config')
      .upsert({ key: 'project_url', value: supabaseUrl }, { onConflict: 'key' });

    const { error: configError2 } = await supabase
      .from('project_config')
      .upsert({ key: 'anon_key', value: supabaseAnonKey }, { onConflict: 'key' });

    if (configError1 || configError2) {
      console.error('[setup-project-config] Error storing config:', configError1 || configError2);
      throw new Error('Failed to store configuration');
    }

    // 2. Remove old hardcoded cron jobs (using direct SQL via service role)
    console.log('[setup-project-config] Removing old cron jobs...');
    
    try {
      // Try to delete old cron jobs - may fail if they don't exist
      await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          query: "DELETE FROM cron.job WHERE jobname IN ('sync-contact-profiles-daily', 'check-instances-status');"
        })
      });
      console.log('[setup-project-config] Old cron jobs removed (or didn\'t exist)');
    } catch (e) {
      console.log('[setup-project-config] Could not remove old cron jobs (may not have permissions)');
    }

    // 3. Create new dynamic cron jobs
    console.log('[setup-project-config] Creating new dynamic cron jobs...');

    let cronJobsCreated = false;

    try {
      // Create check-instances-status job (every 5 minutes)
      const cronSql1 = `
        SELECT cron.schedule(
          'check-instances-status',
          '*/5 * * * *',
          $$
          SELECT net.http_post(
            url := (SELECT value FROM public.project_config WHERE key = 'project_url') 
                   || '/functions/v1/check-instances-status',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT value FROM public.project_config WHERE key = 'anon_key')
            ),
            body := jsonb_build_object('time', now())
          );
          $$
        );
      `;

      await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({ query: cronSql1 })
      });

      console.log('[setup-project-config] ✓ check-instances-status cron job created');

      // Create sync-contact-profiles-daily job (daily at 3 AM)
      const cronSql2 = `
        SELECT cron.schedule(
          'sync-contact-profiles-daily',
          '0 3 * * *',
          $$
          SELECT net.http_post(
            url := (SELECT value FROM public.project_config WHERE key = 'project_url') 
                   || '/functions/v1/sync-contact-profiles',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT value FROM public.project_config WHERE key = 'anon_key')
            ),
            body := jsonb_build_object('time', now())
          );
          $$
        );
      `;

      await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({ query: cronSql2 })
      });

      console.log('[setup-project-config] ✓ sync-contact-profiles-daily cron job created');
      cronJobsCreated = true;

    } catch (e) {
      console.error('[setup-project-config] Error creating cron jobs:', e);
    }

    console.log('[setup-project-config] Configuration completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Project configuration completed successfully',
        cron_jobs_created: cronJobsCreated,
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
