import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Parse body safely
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. Coerce all fields to strings
  const api_url = body.api_url ? String(body.api_url) : '';
  const api_key = body.api_key ? String(body.api_key) : '';
  const instance_name = body.instance_name ? String(body.instance_name) : '';
  const instance_id_external = body.instance_id_external ? String(body.instance_id_external) : '';
  const provider_type = body.provider_type ? String(body.provider_type) : 'self_hosted';

  if (!api_url || !api_key || !instance_name) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: api_url, api_key, instance_name' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 3. Normalize URL: trim + remove trailing slashes
  const normalizedUrl = api_url.trim().replace(/\/+$/, '');

  // 4. Build identifier with encodeURIComponent
  const identifier = provider_type === 'cloud' && instance_id_external
    ? instance_id_external
    : instance_name;

  const fullUrl = `${normalizedUrl}/instance/connectionState/${encodeURIComponent(identifier)}`;

  const keyPrefix = api_key.length > 10 ? `${api_key.substring(0, 10)}...` : api_key;

  console.log('🔍 Testing Evolution connection:', {
    provider_type,
    api_url: normalizedUrl,
    instance_name,
    instance_id_external: instance_id_external || null,
  });

  console.log('📡 Calling Evolution API:', {
    url: fullUrl,
    headers: { apikey: keyPrefix, 'Content-Type': 'application/json' },
  });

  // 5. Fetch with its own try/catch
  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'apikey': api_key,
        'Content-Type': 'application/json',
      },
    });
  } catch (fetchError: unknown) {
    const msg = fetchError instanceof Error ? fetchError.message : 'Network error';
    console.error('❌ Fetch failed (network/SSL):', msg);
    return new Response(
      JSON.stringify({ success: false, error: `Failed to connect to Evolution API: ${msg}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const responseText = await response.text();
  console.log('📥 Evolution API Response:', {
    status: response.status,
    statusText: response.statusText,
    body: responseText.substring(0, 500),
  });

  let responseData: Record<string, unknown>;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = { raw: responseText };
  }

  // 6. Non-OK: return HTTP 200 with success:false (supabase-js convention)
  if (!response.ok) {
    console.error('❌ Evolution API error:', responseData);
    return new Response(
      JSON.stringify({
        success: false,
        error: (responseData as any)?.message || responseText || 'Connection test failed',
        status: response.status,
        details: responseData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('✅ Connection test successful:', responseData);

  return new Response(
    JSON.stringify({
      success: true,
      data: responseData,
      connectionState: (responseData as any)?.instance?.state || (responseData as any)?.state || 'unknown',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
