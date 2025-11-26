import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (message.conversation || message.extendedTextMessage) return 'text';
  if (message.imageMessage) return 'image';
  if (message.audioMessage) return 'audio';
  if (message.videoMessage) return 'video';
  if (message.documentMessage) return 'document';
  if (message.stickerMessage) return 'sticker';
  return 'text';
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

// Find or create contact
async function findOrCreateContact(
  supabase: any,
  instanceId: string,
  phoneNumber: string,
  name: string,
  isGroup: boolean
): Promise<string | null> {
  try {
    // Try to find existing contact
    const { data: existingContact, error: findError } = await supabase
      .from('whatsapp_contacts')
      .select('id')
      .eq('instance_id', instanceId)
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (findError) {
      console.error('[evolution-webhook] Error finding contact:', findError);
    }

    if (existingContact) {
      console.log('[evolution-webhook] Contact found:', existingContact.id);
      return existingContact.id;
    }

    // Create new contact
    const { data: newContact, error: createError } = await supabase
      .from('whatsapp_contacts')
      .insert({
        instance_id: instanceId,
        phone_number: phoneNumber,
        name: name || phoneNumber,
        is_group: isGroup,
      })
      .select('id')
      .single();

    if (createError) {
      console.error('[evolution-webhook] Error creating contact:', createError);
      return null;
    }

    console.log('[evolution-webhook] Contact created:', newContact.id);
    return newContact.id;
  } catch (error) {
    console.error('[evolution-webhook] Error in findOrCreateContact:', error);
    return null;
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
    return newConversation.id;
  } catch (error) {
    console.error('[evolution-webhook] Error in findOrCreateConversation:', error);
    return null;
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
    const contactId = await findOrCreateContact(
      supabase,
      instanceData.id,
      phone,
      pushName || phone,
      isGroup
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
        await processMessageUpsert(payload, supabase);
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
