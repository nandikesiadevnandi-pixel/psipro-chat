import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EditMessageRequest {
  messageId: string;
  conversationId: string;
  newContent: string;
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

    const body: EditMessageRequest = await req.json();
    console.log('[edit-whatsapp-message] Request received:', { 
      messageId: body.messageId, 
      conversationId: body.conversationId 
    });

    // Validate request
    if (!body.messageId || !body.conversationId || !body.newContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'messageId, conversationId, and newContent are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get message with conversation and instance details
    const { data: message, error: msgError } = await supabase
      .from('whatsapp_messages')
      .select(`
        id,
        message_id,
        conversation_id,
        content,
        original_content,
        remote_jid,
        timestamp,
        is_from_me,
        whatsapp_conversations!inner (
          id,
          instance_id,
          whatsapp_instances!inner (
            id,
            api_url,
            api_key,
            instance_name
          )
        )
      `)
      .eq('message_id', body.messageId)
      .eq('conversation_id', body.conversationId)
      .single();

    if (msgError || !message) {
      console.error('[edit-whatsapp-message] Message not found:', msgError);
      return new Response(
        JSON.stringify({ success: false, error: 'Mensagem não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if message is from the user
    if (!message.is_from_me) {
      return new Response(
        JSON.stringify({ success: false, error: 'Você só pode editar suas próprias mensagens' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check 15-minute edit window
    const messageTime = new Date(message.timestamp).getTime();
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    if (now - messageTime > fifteenMinutes) {
      return new Response(
        JSON.stringify({ success: false, error: 'Mensagens só podem ser editadas em até 15 minutos após o envio' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conversation = (message as any).whatsapp_conversations;
    const instance = conversation.whatsapp_instances;

    console.log('[edit-whatsapp-message] Editing message via Evolution API');

    // Build Evolution API request
    let baseUrl = instance.api_url.endsWith('/') ? instance.api_url.slice(0, -1) : instance.api_url;
    baseUrl = baseUrl.replace(/\/manager$/, '');

    const endpoint = `${baseUrl}/chat/updateMessage/${instance.instance_name}`;
    
    // Extract phone number from remote_jid
    const phoneNumber = message.remote_jid.replace(/@.*$/, '');
    
    const requestBody = {
      number: phoneNumber,
      text: body.newContent,
      key: {
        remoteJid: message.remote_jid,
        fromMe: true,
        id: body.messageId,
      },
    };

    console.log('[edit-whatsapp-message] Evolution API endpoint:', endpoint);

    // Call Evolution API to edit message
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
      console.error('[edit-whatsapp-message] Evolution API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao editar mensagem no WhatsApp' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[edit-whatsapp-message] Message edited successfully in Evolution API');

    // Save previous version to edit history
    const { error: historyError } = await supabase
      .from('whatsapp_message_edit_history')
      .insert({
        message_id: body.messageId,
        conversation_id: body.conversationId,
        previous_content: message.content,
        edited_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error('[edit-whatsapp-message] Error saving edit history:', historyError);
    }

    // Update message in database
    const originalContent = message.original_content || message.content;
    
    const { data: updatedMessage, error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({
        content: body.newContent,
        original_content: originalContent,
        edited_at: new Date().toISOString(),
      })
      .eq('message_id', body.messageId)
      .eq('conversation_id', body.conversationId)
      .select()
      .single();

    if (updateError) {
      console.error('[edit-whatsapp-message] Error updating message:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar mensagem no banco de dados' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[edit-whatsapp-message] Message updated in database:', updatedMessage.id);

    return new Response(
      JSON.stringify({ success: true, message: updatedMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[edit-whatsapp-message] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
