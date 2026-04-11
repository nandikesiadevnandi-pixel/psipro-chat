import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getEvolutionAuthHeaders(apiKey: string): Record<string, string> {
  return {
    apikey: apiKey,
    "Content-Type": "application/json",
  };
}

/** Base da API sem barra final (evita //instance/...). */
function normalizeApiBase(url: string): string {
  return String(url).trim().replace(/\/+$/, "");
}

/** Evolution GO (Go): GET /instance/status + apikey. Ignora 200 HTML (SPA /manager). */
function isJsonApiResponse(res: Response): boolean {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  return res.ok && !ct.includes("text/html");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido no corpo da requisição" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const api_url = body.api_url != null ? String(body.api_url) : "";
    const api_key = body.api_key != null ? String(body.api_key) : "";
    const instance_name = body.instance_name != null ? String(body.instance_name) : "";
    const instance_id_external =
      body.instance_id_external != null ? String(body.instance_id_external) : "";
    const provider_type = body.provider_type != null ? String(body.provider_type) : "self_hosted";

    console.log("🔍 Testing Evolution connection:", {
      provider_type,
      api_url,
      instance_name,
      instance_id_external: instance_id_external
        ? `${instance_id_external.substring(0, 8)}...`
        : null,
    });

    if (!api_url || !api_key || !instance_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: api_url, api_key, instance_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const instanceIdentifier =
      provider_type === "cloud" && instance_id_external ? instance_id_external : instance_name;

    const base = normalizeApiBase(api_url);
    const pathSeg = encodeURIComponent(instanceIdentifier);

    const probes: { label: string; url: string; headers: Record<string, string> }[] = [
      {
        label: "Evolution GO /instance/status",
        url: `${base}/instance/status`,
        headers: { apikey: api_key },
      },
      {
        label: "Evolution API /instance/connectionState",
        url: `${base}/instance/connectionState/${pathSeg}`,
        headers: getEvolutionAuthHeaders(api_key),
      },
    ];

    let response: Response | null = null;
    let fullUrl = "";
    let usedLabel = "";

    for (const p of probes) {
      fullUrl = p.url;
      usedLabel = p.label;
      console.log("📡 Calling Evolution API:", {
        label: p.label,
        url: fullUrl,
        apikey_preview: `${api_key.substring(0, 10)}...`,
      });
      try {
        const res = await fetch(fullUrl, { method: "GET", headers: p.headers });
        if (isJsonApiResponse(res)) {
          response = res;
          break;
        }
        if (p.label.includes("/instance/status")) {
          console.log(`↪️ ${p.label} -> ${res.status}, tentando próximo endpoint`);
          continue;
        }
        response = res;
        break;
      } catch (fetchErr: unknown) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.error("❌ Fetch Evolution failed:", msg);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Rede/SSL ao contactar Evolution: ${msg}`,
            details: { fullUrl, label: usedLabel },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (!response) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível contactar a Evolution (nenhum endpoint respondeu com JSON válido).",
          details: { tried: probes.map((x) => x.url) },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const responseText = await response.text();
    console.log("📥 Evolution API Response:", {
      label: usedLabel,
      status: response.status,
      statusText: response.statusText,
      body: responseText.substring(0, 500),
    });

    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    const dataObj = responseData as { message?: string };

    if (!response.ok) {
      console.error("❌ Evolution API error:", responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: dataObj?.message || responseText || "Connection test failed",
          status: response.status,
          details: responseData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("✅ Connection test successful:", responseData);

    const rd = responseData as {
      instance?: { state?: string };
      state?: string;
      data?: { connected?: boolean; loggedIn?: boolean };
    };

    const connectionState =
      rd?.instance?.state ||
      rd?.state ||
      (rd?.data?.connected === true ? "open" : undefined) ||
      "unknown";

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        connectionState,
        testedWith: usedLabel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("❌ Error testing connection:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
