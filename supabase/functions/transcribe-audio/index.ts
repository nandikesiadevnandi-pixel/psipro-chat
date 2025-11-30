import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId } = await req.json();

    if (!messageId) {
      throw new Error('messageId is required');
    }

    console.log(`[transcribe-audio] Starting transcription for message: ${messageId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch message
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    // Only transcribe audio messages
    if (message.message_type !== 'audio') {
      console.log(`[transcribe-audio] Message ${messageId} is not audio, skipping`);
      return new Response(
        JSON.stringify({ success: false, reason: 'not_audio' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already transcribed
    if (message.audio_transcription) {
      console.log(`[transcribe-audio] Message ${messageId} already transcribed`);
      return new Response(
        JSON.stringify({ success: true, transcription: message.audio_transcription }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as processing
    await supabase
      .from('whatsapp_messages')
      .update({ transcription_status: 'processing' })
      .eq('id', messageId);

    // Download audio file
    if (!message.media_url) {
      throw new Error('No media URL found for audio message');
    }

    // Clean URL by removing any codec/encoding suffixes
    const cleanMediaUrl = message.media_url.split(';')[0];
    console.log(`[transcribe-audio] Downloading audio from: ${cleanMediaUrl}`);
    const audioResponse = await fetch(cleanMediaUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    // Call Lovable AI Gateway for transcription
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`[transcribe-audio] Sending to Lovable AI (GPT-5 with input_audio) for transcription`);
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcreva o áudio em português brasileiro. Retorne apenas o texto transcrito, sem comentários adicionais.'
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: base64Audio,
                  format: 'wav'
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[transcribe-audio] AI API error:`, errorText);

      if (aiResponse.status === 429) {
        await supabase
          .from('whatsapp_messages')
          .update({ transcription_status: 'failed' })
          .eq('id', messageId);

        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (aiResponse.status === 402) {
        await supabase
          .from('whatsapp_messages')
          .update({ transcription_status: 'failed' })
          .eq('id', messageId);

        return new Response(
          JSON.stringify({ error: 'Insufficient credits' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const transcription = aiData.choices?.[0]?.message?.content?.trim();

    if (!transcription) {
      throw new Error('No transcription returned from AI');
    }

    console.log(`[transcribe-audio] Transcription completed: ${transcription.substring(0, 50)}...`);

    // Save transcription
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({
        audio_transcription: transcription,
        transcription_status: 'completed'
      })
      .eq('id', messageId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, transcription }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[transcribe-audio] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
