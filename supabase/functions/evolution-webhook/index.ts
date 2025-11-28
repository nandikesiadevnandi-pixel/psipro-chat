import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Auto sentiment analysis threshold (number of client messages to trigger analysis)
const AUTO_SENTIMENT_THRESHOLD = 5;

// Auto categorization threshold (number of client messages to trigger categorization)
const AUTO_CATEGORIZATION_THRESHOLD = 5;

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: any;
}

// Normalize phone number by removing WhatsApp suffixes
function normalizePhoneNumber(remoteJid: string): { phone: string; isGroup: boolean } {
  const isGroup = remoteJid.includes('@g.us');
  const phone = remoteJid
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@lid', '')
    .replace(/:\d+/, ''); // Remove device suffix if present
  
  return { phone, isGroup };
}

// Detect message type from Evolution API message object
function getMessageType(message: any): string {
  if (message.reactionMessage) return 'reaction';
  if (message.conversation || message.extendedTextMessage) return 'text';
  if (message.imageMessage) return 'image';
  if (message.audioMessage) return 'audio';
  if (message.videoMessage) return 'video';
  if (message.documentMessage) return 'document';
  if (message.stickerMessage) return 'sticker';
  return 'text';
}

// Detect if message is an edited message
function isEditedMessage(message: any): boolean {
  return !!(message?.editedMessage || message?.protocolMessage?.editedMessage);
}

// Extract content/caption from message
function getMessageContent(message: any, type: string): string {
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  
  // For media messages, try to get caption
  const mediaMessage = message[`${type}Message`];
  if (mediaMessage?.caption) return mediaMessage.caption;
  
  // Fallback descriptions
  const descriptions: Record<string, string> = {
    image: '📷 Imagem',
    audio: '🎵 Áudio',
    video: '🎥 Vídeo',
    document: '📄 Documento',
    sticker: '🎨 Sticker',
  };
  
  return descriptions[type] || 'Mensagem';
}

// Download media from Evolution API and upload to Supabase Storage
async function downloadAndUploadMedia(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  messageKey: any,
  supabase: any,
  mimetype: string
): Promise<string | null> {
  try {
    console.log('[evolution-webhook] Downloading media from Evolution API...');
    
    const response = await fetch(
      `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({ message: { key: messageKey } }),
      }
    );

    if (!response.ok) {
      console.error('[evolution-webhook] Failed to download media:', response.status);
      return null;
    }

    const data = await response.json();
    const base64Data = data.base64;
    
    if (!base64Data) {
      console.error('[evolution-webhook] No base64 data in response');
      return null;
    }

    // Convert base64 to blob
    const base64String = base64Data.split(',')[1] || base64Data;
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimetype });

    // Generate unique filename
    const extension = mimetype.split('/')[1] || 'bin';
    const filename = `${Date.now()}-${messageKey.id}.${extension}`;
    const filePath = `${instanceName}/${filename}`;

    console.log('[evolution-webhook] Uploading to Supabase Storage:', filePath);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, blob, {
        contentType: mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('[evolution-webhook] Storage upload error:', uploadError);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(filePath);

    console.log('[evolution-webhook] Media uploaded successfully:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('[evolution-webhook] Error in downloadAndUploadMedia:', error);
    return null;
  }
}

// Find or create contact - only update name if message is FROM contact
async function findOrCreateContact(
  supabase: any,
  instanceId: string,
  phoneNumber: string,
  name: string,
  isGroup: boolean,
  isFromMe: boolean
): Promise<string | null> {
  try {
    // First check if contact exists
    const { data: existingContact } = await supabase
      .from('whatsapp_contacts')
      .select('id, name')
      .eq('instance_id', instanceId)
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (existingContact) {
      // Only update name if:
      // 1. Message is NOT from me (avoid setting contact name to instance owner)
      // 2. We have a real name (not just phone number)
      // 3. Current name is the phone number
      const shouldUpdateName = !isFromMe && 
                               name !== phoneNumber && 
                               existingContact.name === phoneNumber;
      
      if (shouldUpdateName) {
        await supabase
          .from('whatsapp_contacts')
          .update({ 
            name: name,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingContact.id);
        
        console.log(`[evolution-webhook] Contact name updated: ${existingContact.id} -> ${name}`);
      }
      
      return existingContact.id;
    }

    // Create new contact
    // If message is from me, use phone number as name (to avoid using instance owner's name)
    const contactName = isFromMe ? phoneNumber : (name || phoneNumber);
    
    const { data: newContact, error } = await supabase
      .from('whatsapp_contacts')
      .insert({
        instance_id: instanceId,
        phone_number: phoneNumber,
        name: contactName,
        is_group: isGroup,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[evolution-webhook] Error creating contact:', error);
      return null;
    }

    console.log(`[evolution-webhook] Contact created: ${newContact.id} Name: ${name}`);
    return newContact.id;
  } catch (error) {
    console.error('[evolution-webhook] Error in findOrCreateContact:', error);
    return null;
  }
}

// Apply auto-assignment rules
async function applyAutoAssignment(
  supabase: any,
  instanceId: string,
  conversationId: string
): Promise<void> {
  try {
    // 1. Buscar regra ativa para a instância
    const { data: rule } = await supabase
      .from('assignment_rules')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('is_active', true)
      .maybeSingle();

    if (!rule) {
      console.log('[auto-assignment] No active rule found for instance:', instanceId);
      return; // Sem regra, conversa fica na fila
    }

    let assignedTo: string | null = null;

    if (rule.rule_type === 'fixed') {
      // Atribuição fixa
      assignedTo = rule.fixed_agent_id;
      console.log('[auto-assignment] Fixed assignment to:', assignedTo);
    } else if (rule.rule_type === 'round_robin') {
      // Round-robin
      const agents = rule.round_robin_agents || [];
      if (agents.length === 0) {
        console.log('[auto-assignment] No agents in round-robin list');
        return;
      }

      const nextIndex = (rule.round_robin_last_index + 1) % agents.length;
      assignedTo = agents[nextIndex];
      console.log(`[auto-assignment] Round-robin assignment to: ${assignedTo} (index: ${nextIndex})`);

      // Atualizar índice para próxima vez
      await supabase
        .from('assignment_rules')
        .update({ round_robin_last_index: nextIndex })
        .eq('id', rule.id);
    }

    if (assignedTo) {
      // Atribuir conversa
      await supabase
        .from('whatsapp_conversations')
        .update({ assigned_to: assignedTo })
        .eq('id', conversationId);

      // Registrar no histórico
      await supabase
        .from('conversation_assignments')
        .insert({
          conversation_id: conversationId,
          assigned_to: assignedTo,
          reason: `Auto-atribuição: ${rule.name}`,
        });

      console.log('[auto-assignment] Conversation assigned successfully');
    }
  } catch (error) {
    console.error('[auto-assignment] Error applying auto-assignment:', error);
  }
}

// Find or create conversation
async function findOrCreateConversation(
  supabase: any,
  instanceId: string,
  contactId: string
): Promise<string | null> {
  try {
    // Try to find existing conversation
    const { data: existingConversation, error: findError } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('instance_id', instanceId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (findError) {
      console.error('[evolution-webhook] Error finding conversation:', findError);
    }

    if (existingConversation) {
      console.log('[evolution-webhook] Conversation found:', existingConversation.id);
      return existingConversation.id;
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('whatsapp_conversations')
      .insert({
        instance_id: instanceId,
        contact_id: contactId,
        status: 'active',
      })
      .select('id')
      .single();

    if (createError) {
      console.error('[evolution-webhook] Error creating conversation:', createError);
      return null;
    }

    console.log('[evolution-webhook] Conversation created:', newConversation.id);
    
    // Apply auto-assignment for new conversations
    await applyAutoAssignment(supabase, instanceId, newConversation.id);
    
    return newConversation.id;
  } catch (error) {
    console.error('[evolution-webhook] Error in findOrCreateConversation:', error);
    return null;
  }
}

// Check and trigger automatic sentiment analysis
async function checkAndTriggerAutoSentiment(
  supabase: any,
  conversationId: string,
  supabaseUrl: string
) {
  try {
    // 1. Buscar última análise de sentimento
    const { data: lastAnalysis } = await supabase
      .from('whatsapp_sentiment_analysis')
      .select('created_at')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    // 2. Contar mensagens do cliente desde última análise
    let query = supabase
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('is_from_me', false);

    // Se há análise anterior, contar apenas mensagens mais recentes
    if (lastAnalysis?.created_at) {
      query = query.gt('timestamp', lastAnalysis.created_at);
    }

    const { count } = await query;

    console.log(`[auto-sentiment] Messages since last analysis: ${count}`);

    // 3. Se atingiu threshold, disparar análise (async, não bloqueia)
    if (count && count >= AUTO_SENTIMENT_THRESHOLD) {
      console.log(`[auto-sentiment] Triggering auto analysis for ${conversationId}`);
      
      // Chamar edge function de análise de sentimento (fire and forget)
      fetch(`${supabaseUrl}/functions/v1/analyze-whatsapp-sentiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ conversationId }),
      }).catch(err => console.error('[auto-sentiment] Error triggering:', err));
    }
  } catch (error) {
    console.error('[auto-sentiment] Error checking sentiment:', error);
  }
}

// Check and trigger automatic categorization
async function checkAndTriggerAutoCategorization(
  supabase: any,
  conversationId: string,
  supabaseUrl: string
) {
  try {
    // 1. Buscar metadata da conversa para ver última categorização
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('metadata')
      .eq('id', conversationId)
      .maybeSingle();

    const lastCategorizedAt = conversation?.metadata?.categorized_at;

    // 2. Contar mensagens do cliente desde última categorização
    let query = supabase
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('is_from_me', false);

    // Se há categorização anterior, contar apenas mensagens mais recentes
    if (lastCategorizedAt) {
      query = query.gt('timestamp', lastCategorizedAt);
    }

    const { count } = await query;

    console.log(`[auto-categorization] Messages since last categorization: ${count}`);

    // 3. Se atingiu threshold, disparar categorização (async, não bloqueia)
    if (count && count >= AUTO_CATEGORIZATION_THRESHOLD) {
      console.log(`[auto-categorization] Triggering auto categorization for ${conversationId}`);
      
      // Chamar edge function de categorização (fire and forget)
      fetch(`${supabaseUrl}/functions/v1/categorize-whatsapp-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ conversationId }),
      }).catch(err => console.error('[auto-categorization] Error triggering:', err));
    }
  } catch (error) {
    console.error('[auto-categorization] Error checking categorization:', error);
  }
}

// Process reaction message
async function processReaction(payload: EvolutionWebhookPayload, supabase: any) {
  try {
    const { data } = payload;
    const { key, message } = data;
    const reaction = message.reactionMessage;
    
    if (!reaction?.key?.id) {
      console.log('[evolution-webhook] Invalid reaction data');
      return;
    }
    
    const targetMessageId = reaction.key.id;
    const emoji = reaction.text;
    const reactorJid = key.remoteJid;
    
    console.log('[evolution-webhook] Processing reaction:', emoji || '(removed)', 'on message:', targetMessageId);
    
    // Find the target message to get conversation_id
    const { data: targetMessage } = await supabase
      .from('whatsapp_messages')
      .select('conversation_id')
      .eq('message_id', targetMessageId)
      .maybeSingle();
    
    if (!targetMessage) {
      console.log('[evolution-webhook] Target message not found:', targetMessageId);
      return;
    }
    
    // If emoji is empty, it's a reaction removal
    if (!emoji || emoji === '') {
      const { error } = await supabase
        .from('whatsapp_reactions')
        .delete()
        .eq('message_id', targetMessageId)
        .eq('reactor_jid', reactorJid);
      
      if (error) {
        console.error('[evolution-webhook] Error removing reaction:', error);
      } else {
        console.log('[evolution-webhook] Reaction removed successfully');
      }
      return;
    }
    
    // UPSERT: update if exists, insert if not
    const { error } = await supabase
      .from('whatsapp_reactions')
      .upsert({
        message_id: targetMessageId,
        conversation_id: targetMessage.conversation_id,
        emoji,
        reactor_jid: reactorJid,
        is_from_me: key.fromMe,
      }, { 
        onConflict: 'message_id,reactor_jid',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('[evolution-webhook] Error saving reaction:', error);
    } else {
      console.log('[evolution-webhook] Reaction saved successfully');
    }
  } catch (error) {
    console.error('[evolution-webhook] Error in processReaction:', error);
  }
}

// Process message upsert event
async function processMessageUpsert(payload: EvolutionWebhookPayload, supabase: any) {
  try {
    const { instance, data } = payload;
    const { key, pushName, message, messageTimestamp } = data;

    console.log('[evolution-webhook] Processing message:', key.id);

    // Get instance data
    const { data: instanceData, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('id, api_url, api_key, instance_name')
      .eq('instance_name', instance)
      .maybeSingle();

    if (instanceError || !instanceData) {
      console.error('[evolution-webhook] Instance not found:', instance);
      return;
    }

    // Normalize phone number
    const { phone, isGroup } = normalizePhoneNumber(key.remoteJid);
    console.log('[evolution-webhook] Normalized phone:', phone, 'isGroup:', isGroup);

    // Find or create contact
    // If message is from me, use phone number instead of pushName (which would be the instance owner's name)
    const contactId = await findOrCreateContact(
      supabase,
      instanceData.id,
      phone,
      pushName || phone,
      isGroup,
      key.fromMe
    );

    if (!contactId) {
      console.error('[evolution-webhook] Failed to create/find contact');
      return;
    }

    // Find or create conversation
    const conversationId = await findOrCreateConversation(
      supabase,
      instanceData.id,
      contactId
    );

    if (!conversationId) {
      console.error('[evolution-webhook] Failed to create/find conversation');
      return;
    }

    // Detect message type and content
    const messageType = getMessageType(message);
    
    // If it's a reaction, process it separately
    if (messageType === 'reaction') {
      await processReaction(payload, supabase);
      return;
    }
    
    const content = getMessageContent(message, messageType);
    console.log('[evolution-webhook] Message type:', messageType, 'Content preview:', content.substring(0, 50));

    // Process media if present
    let mediaUrl: string | null = null;
    let mediaMimetype: string | null = null;

    if (messageType !== 'text') {
      const mediaMessage = message[`${messageType}Message`];
      if (mediaMessage) {
        mediaMimetype = mediaMessage.mimetype || `${messageType}/*`;
        if (mediaMimetype) {
          mediaUrl = await downloadAndUploadMedia(
            instanceData.api_url,
            instanceData.api_key,
            instanceData.instance_name,
            key,
            supabase,
            mediaMimetype
          );
        }
      }
    }

    // Get quoted message ID if this is a reply
    const quotedMessageId = message.extendedTextMessage?.contextInfo?.stanzaId || null;

    // Create message timestamp
    const timestamp = new Date(messageTimestamp * 1000).toISOString();

    // Save message
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        remote_jid: key.remoteJid,
        message_id: key.id,
        content,
        message_type: messageType,
        media_url: mediaUrl,
        media_mimetype: mediaMimetype,
        is_from_me: key.fromMe || false,
        status: 'sent',
        quoted_message_id: quotedMessageId,
        timestamp,
      });

    if (messageError) {
      console.error('[evolution-webhook] Error saving message:', messageError);
      return;
    }

    console.log('[evolution-webhook] Message saved successfully');

    // Update conversation metadata
    const updateData: any = {
      last_message_at: timestamp,
      last_message_preview: content.substring(0, 100),
    };

    // Increment unread count only if message is not from me
    if (!key.fromMe) {
      const { data: currentConv } = await supabase
        .from('whatsapp_conversations')
        .select('unread_count')
        .eq('id', conversationId)
        .single();

      updateData.unread_count = (currentConv?.unread_count || 0) + 1;
    }

    const { error: updateError } = await supabase
      .from('whatsapp_conversations')
      .update(updateData)
      .eq('id', conversationId);

    if (updateError) {
      console.error('[evolution-webhook] Error updating conversation:', updateError);
    } else {
      console.log('[evolution-webhook] Conversation updated successfully');
    }

    // Se mensagem é do cliente (não é minha), verificar análises automáticas
    if (!key.fromMe) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      checkAndTriggerAutoSentiment(supabase, conversationId, supabaseUrl);
      checkAndTriggerAutoCategorization(supabase, conversationId, supabaseUrl);
    }
  } catch (error) {
    console.error('[evolution-webhook] Error in processMessageUpsert:', error);
  }
}

// Process message update event (status changes)
async function processMessageUpdate(payload: EvolutionWebhookPayload, supabase: any) {
  try {
    const { data } = payload;
    const updates = data.update || data;

    console.log('[evolution-webhook] Processing message update:', updates);

    // Extract status from update
    let status = 'sent';
    if (updates.status === 3 || updates.status === 'READ') status = 'read';
    else if (updates.status === 2 || updates.status === 'DELIVERY_ACK') status = 'delivered';
    else if (updates.status === 1 || updates.status === 'SERVER_ACK') status = 'sent';

    // Update all messages matching the key
    const messageId = updates.key?.id;
    if (messageId) {
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ status })
        .eq('message_id', messageId);

      if (error) {
        console.error('[evolution-webhook] Error updating message status:', error);
      } else {
        console.log('[evolution-webhook] Message status updated to:', status);
      }
    }
  } catch (error) {
    console.error('[evolution-webhook] Error in processMessageUpdate:', error);
  }
}

// Process connection update event
async function processConnectionUpdate(payload: EvolutionWebhookPayload, supabase: any) {
  try {
    const { instance, data } = payload;
    const state = data.state || data.connection;

    console.log('[evolution-webhook] Connection update for:', instance, 'State:', state);

    // Map Evolution API states to our status
    let status = 'disconnected';
    if (state === 'open' || state === 'connected') status = 'connected';
    else if (state === 'connecting') status = 'connecting';
    else if (state === 'close' || state === 'closed') status = 'disconnected';

    // Update instance status
    const { error } = await supabase
      .from('whatsapp_instances')
      .update({ status })
      .eq('instance_name', instance);

    if (error) {
      console.error('[evolution-webhook] Error updating instance status:', error);
    } else {
      console.log('[evolution-webhook] Instance status updated to:', status);
    }
  } catch (error) {
    console.error('[evolution-webhook] Error in processConnectionUpdate:', error);
  }
}

// Process message edit
async function processMessageEdit(payload: EvolutionWebhookPayload, supabase: any) {
  try {
    const { data } = payload;
    const editedMessage = data.message?.editedMessage || data.message?.protocolMessage?.editedMessage;
    
    if (!editedMessage) {
      console.log('[evolution-webhook] No editedMessage found in payload');
      return;
    }
    
    const messageId = editedMessage.key?.id || data.key?.id;
    const newContent = editedMessage.conversation || editedMessage.extendedTextMessage?.text || '';
    
    console.log('[evolution-webhook] Processing message edit:', messageId);
    
    // 1. Fetch current message
    const { data: currentMessage, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('id, content, original_content, conversation_id')
      .eq('message_id', messageId)
      .maybeSingle();
    
    if (fetchError || !currentMessage) {
      console.error('[evolution-webhook] Error fetching message or message not found:', fetchError);
      return;
    }
    
    // 2. Save to edit history
    const { error: historyError } = await supabase
      .from('whatsapp_message_edit_history')
      .insert({
        message_id: messageId,
        conversation_id: currentMessage.conversation_id,
        previous_content: currentMessage.content,
      });
    
    if (historyError) {
      console.error('[evolution-webhook] Error saving edit history:', historyError);
    }
    
    // 3. Update message
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
        // Store original content only on first edit
        original_content: currentMessage.original_content || currentMessage.content,
      })
      .eq('message_id', messageId);
    
    if (updateError) {
      console.error('[evolution-webhook] Error updating message:', updateError);
    } else {
      console.log('[evolution-webhook] Message edited successfully:', messageId);
    }
  } catch (error) {
    console.error('[evolution-webhook] Error in processMessageEdit:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: EvolutionWebhookPayload = await req.json();
    console.log('[evolution-webhook] Event received:', payload.event, 'Instance:', payload.instance);

    // Route to appropriate handler
    switch (payload.event) {
      case 'messages.upsert':
        // Check if it's an edited message
        if (isEditedMessage(payload.data?.message)) {
          await processMessageEdit(payload, supabase);
        } else {
          await processMessageUpsert(payload, supabase);
        }
        break;
      case 'messages.update':
        await processMessageUpdate(payload, supabase);
        break;
      case 'connection.update':
        await processConnectionUpdate(payload, supabase);
        break;
      default:
        console.log('[evolution-webhook] Unhandled event type:', payload.event);
    }

    // Always return 200 to prevent webhook reprocessing
    return new Response(
      JSON.stringify({ success: true, event: payload.event }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[evolution-webhook] Fatal error:', error);
    
    // Still return 200 to prevent reprocessing
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
