import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteMessageRequest {
  messageId: string;
  conversationId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: DeleteMessageRequest = await req.json();
    console.log('[delete-whatsapp-message] Request body:', body);

    const { messageId, conversationId } = body;

    if (!messageId || !conversationId) {
      throw new Error('messageId e conversationId são obrigatórios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch message with instance details
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .select(`
        *,
        conversation:whatsapp_conversations!inner(
          instance:whatsapp_instances!inner(*)
        )
      `)
      .eq('message_id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (messageError || !message) {
      console.error('[delete-whatsapp-message] Message not found:', messageError);
      throw new Error('Mensagem não encontrada');
    }

    // Validate that the message is from the user
    if (!message.is_from_me) {
      throw new Error('Só é possível apagar mensagens enviadas por você');
    }

    const instance = (message.conversation as any).instance;
    console.log('[delete-whatsapp-message] Instance:', instance.instance_name);

    // Call Evolution API to delete message
    let baseUrl = instance.api_url.endsWith('/') ? instance.api_url.slice(0, -1) : instance.api_url;
    baseUrl = baseUrl.replace(/\/manager$/, '');

    const endpoint = `${baseUrl}/chat/deleteMessageForEveryone/${instance.instance_name}`;
    const requestBody = {
      id: messageId,
      fromMe: true,
      remoteJid: message.remote_jid,
    };

    console.log('[delete-whatsapp-message] Evolution API endpoint:', endpoint);

    const evolutionResponse = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify(requestBody),
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error('[delete-whatsapp-message] Evolution API error:', errorText);
      throw new Error('Falha ao apagar mensagem no WhatsApp');
    }

    console.log('[delete-whatsapp-message] Message deleted from WhatsApp successfully');

    // Delete message reactions
    const { error: reactionsError } = await supabase
      .from('whatsapp_reactions')
      .delete()
      .eq('message_id', messageId);

    if (reactionsError) {
      console.error('[delete-whatsapp-message] Error deleting reactions:', reactionsError);
    }

    // Delete edit history
    const { error: historyError } = await supabase
      .from('whatsapp_message_edit_history')
      .delete()
      .eq('message_id', messageId);

    if (historyError) {
      console.error('[delete-whatsapp-message] Error deleting history:', historyError);
    }

    // Delete message from database
    const { error: deleteError } = await supabase
      .from('whatsapp_messages')
      .delete()
      .eq('message_id', messageId)
      .eq('conversation_id', conversationId);

    if (deleteError) {
      console.error('[delete-whatsapp-message] Error deleting message from DB:', deleteError);
      throw new Error('Falha ao remover mensagem do banco de dados');
    }

    // Check if deleted message was the last message and update conversation preview
    const { data: lastMessage } = await supabase
      .from('whatsapp_messages')
      .select('content, timestamp')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (lastMessage) {
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_preview: lastMessage.content,
          last_message_at: lastMessage.timestamp,
        })
        .eq('id', conversationId);
    } else {
      // No messages left, clear preview
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_preview: null,
          last_message_at: null,
        })
        .eq('id', conversationId);
    }

    console.log('[delete-whatsapp-message] Message deleted successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[delete-whatsapp-message] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
