import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  conversationId: string;
  content?: string;
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document';
  mediaUrl?: string;
  mediaBase64?: string;
  mediaMimetype?: string;
  fileName?: string;
  quotedMessageId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: SendMessageRequest = await req.json();
    console.log('[send-whatsapp-message] Request received:', { 
      conversationId: body.conversationId, 
      messageType: body.messageType 
    });

    // Validate request
    if (!body.conversationId || !body.messageType) {
      return new Response(
        JSON.stringify({ success: false, error: 'conversationId and messageType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.messageType === 'text' && !body.content) {
      return new Response(
        JSON.stringify({ success: false, error: 'content is required for text messages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.messageType !== 'text' && !body.mediaUrl && !body.mediaBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'mediaUrl or mediaBase64 is required for media messages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get conversation with contact and instance
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        contact_id,
        instance_id,
        whatsapp_contacts!inner (
          id,
          phone_number,
          name
        ),
        whatsapp_instances!inner (
          id,
          api_url,
          api_key,
          instance_name
        )
      `)
      .eq('id', body.conversationId)
      .single();

    if (convError || !conversation) {
      console.error('[send-whatsapp-message] Conversation not found:', convError);
      return new Response(
        JSON.stringify({ success: false, error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contact = (conversation as any).whatsapp_contacts;
    const instance = (conversation as any).whatsapp_instances;

    console.log('[send-whatsapp-message] Sending to:', contact.phone_number);

    // Determine destination number format
    const destinationNumber = getDestinationNumber(contact.phone_number);

    // Build request for Evolution API
    const { endpoint, requestBody } = buildEvolutionRequest(
      instance.api_url,
      instance.instance_name,
      destinationNumber,
      body
    );

    console.log('[send-whatsapp-message] Evolution API endpoint:', endpoint);

    // Send to Evolution API
    const evolutionResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify(requestBody),
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error('[send-whatsapp-message] Evolution API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send message via Evolution API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const evolutionData = await evolutionResponse.json();
    console.log('[send-whatsapp-message] Evolution API response:', evolutionData);

    // Extract message ID from Evolution API response
    const messageId = evolutionData.key?.id || `msg_${Date.now()}`;

    // Save message to database
    const messageContent = body.messageType === 'text' 
      ? (body.content || '') 
      : (body.content || `Sent ${body.messageType}`);

    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: body.conversationId,
        message_id: messageId,
        remote_jid: contact.phone_number,
        content: messageContent,
        message_type: body.messageType,
        media_url: body.mediaUrl || null,
        media_mimetype: body.mediaMimetype || null,
        status: 'sent',
        is_from_me: true,
        timestamp: new Date().toISOString(),
        quoted_message_id: body.quotedMessageId || null,
        metadata: {
          fileName: body.fileName,
        },
      })
      .select()
      .single();

    if (saveError) {
      console.error('[send-whatsapp-message] Error saving message:', saveError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update conversation metadata
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: messageContent.substring(0, 100),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.conversationId);

    console.log('[send-whatsapp-message] Message sent and saved:', savedMessage.id);

    return new Response(
      JSON.stringify({ success: true, message: savedMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-whatsapp-message] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getDestinationNumber(phoneNumber: string): string {
  // If phone ends with @lid (LinkedIn format), use complete format
  if (phoneNumber.includes('@lid')) {
    return phoneNumber;
  }
  // Otherwise, use only digits
  return phoneNumber.replace(/\D/g, '');
}

function buildEvolutionRequest(
  apiUrl: string,
  instanceName: string,
  number: string,
  body: SendMessageRequest
): { endpoint: string; requestBody: any } {
  // Remove trailing slash
  let baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  
  // Remove /manager suffix if present (message endpoints are at root level)
  baseUrl = baseUrl.replace(/\/manager$/, '');

  switch (body.messageType) {
    case 'text': {
      const requestBody: any = {
        number,
        text: body.content,
      };

      if (body.quotedMessageId) {
        requestBody.quoted = {
          key: {
            id: body.quotedMessageId,
          },
        };
      }

      return {
        endpoint: `${baseUrl}/message/sendText/${instanceName}`,
        requestBody,
      };
    }

    case 'audio': {
      // Format audio data: if it's base64 without data URI prefix, add it
      let audioData = body.mediaBase64 || body.mediaUrl;
      
      if (body.mediaBase64 && !body.mediaBase64.startsWith('data:') && !body.mediaBase64.startsWith('http')) {
        // Add data URI prefix for base64 audio
        const mimetype = body.mediaMimetype || 'audio/ogg';
        audioData = `data:${mimetype};base64,${body.mediaBase64}`;
      }
      
      return {
        endpoint: `${baseUrl}/message/sendWhatsAppAudio/${instanceName}`,
        requestBody: {
          number,
          audio: audioData,
        },
      };
    }

    case 'image':
    case 'video':
    case 'document': {
      const requestBody: any = {
        number,
        mediatype: body.messageType,
        media: body.mediaBase64 || body.mediaUrl,
      };

      if (body.content) {
        requestBody.caption = body.content;
      }

      if (body.messageType === 'document' && body.fileName) {
        requestBody.fileName = body.fileName;
      }

      return {
        endpoint: `${baseUrl}/message/sendMedia/${instanceName}`,
        requestBody,
      };
    }

    default:
      throw new Error(`Unsupported message type: ${body.messageType}`);
  }
}
