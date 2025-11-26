import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Conversation = Tables<'whatsapp_conversations'>;
type Contact = Tables<'whatsapp_contacts'>;

interface ConversationWithContact extends Conversation {
  contact: Contact;
  isLastMessageFromMe?: boolean;
}

interface ConversationsFilters {
  instanceId?: string;
  search?: string;
  status?: string;
}

export const useWhatsAppConversations = (filters?: ConversationsFilters) => {
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading, error } = useQuery({
    queryKey: ['whatsapp', 'conversations', filters],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          contact:whatsapp_contacts(*)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (filters?.instanceId) {
        query = query.eq('instance_id', filters.instanceId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      let result = data as unknown as ConversationWithContact[];

      // Buscar is_from_me da última mensagem de cada conversa
      const conversationIds = result.map(c => c.id);
      if (conversationIds.length > 0) {
        const { data: lastMessages } = await supabase
          .from('whatsapp_messages')
          .select('conversation_id, is_from_me, timestamp')
          .in('conversation_id', conversationIds)
          .order('timestamp', { ascending: false });

        if (lastMessages) {
          // Agrupar por conversation_id e pegar a primeira (mais recente)
          const lastMessageMap = new Map<string, boolean>();
          lastMessages.forEach(msg => {
            if (!lastMessageMap.has(msg.conversation_id)) {
              lastMessageMap.set(msg.conversation_id, msg.is_from_me || false);
            }
          });

          result = result.map(conv => ({
            ...conv,
            isLastMessageFromMe: lastMessageMap.get(conv.id),
          }));
        }
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(conv => 
          conv.contact.name?.toLowerCase().includes(searchLower) ||
          conv.contact.phone_number?.toLowerCase().includes(searchLower) ||
          conv.last_message_preview?.toLowerCase().includes(searchLower)
        );
      }

      return result;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('conversations-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_conversations'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    conversations,
    isLoading,
    error,
  };
};
