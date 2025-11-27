import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';

export interface WhatsAppMetricsFilters {
  dateRange: { from: Date; to: Date };
}

export interface WhatsAppMetrics {
  total: number;
  active: number;
  closed: number;
  archived: number;
  avgResponseTimeMinutes: number;
  dailyTrend: { date: string; count: number }[];
  statusDistribution: { status: string; count: number; percentage: number }[];
  topicsDistribution: { topic: string; count: number }[];
  longestConversations: Array<{
    id: string;
    contactName: string;
    status: string;
    durationHours: number;
    createdAt: string;
  }>;
}

export const useWhatsAppMetrics = (filters: WhatsAppMetricsFilters) => {
  return useQuery({
    queryKey: ['whatsapp-metrics', filters.dateRange.from.toISOString(), filters.dateRange.to.toISOString()],
    queryFn: async () => {
      const { from, to } = filters.dateRange;

      // Fetch conversations with filters
      const { data: conversations, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('id, status, last_message_at, created_at, contact_id, metadata')
        .gte('last_message_at', from.toISOString())
        .lte('last_message_at', to.toISOString());

      if (convError) throw convError;

      const total = conversations?.length || 0;
      const active = conversations?.filter((c: any) => c.status === 'active').length || 0;
      const closed = conversations?.filter((c: any) => c.status === 'closed').length || 0;
      const archived = conversations?.filter((c: any) => c.status === 'archived').length || 0;

      // Calculate average response time
      const conversationIds = conversations?.map((c: any) => c.id) || [];
      let avgResponseTimeMinutes = 0;

      if (conversationIds.length > 0) {
        const { data: messages, error: msgError } = await supabase
          .from('whatsapp_messages')
          .select('conversation_id, is_from_me, timestamp')
          .in('conversation_id', conversationIds)
          .order('timestamp', { ascending: true });

        if (msgError) throw msgError;

        // Calculate TMR: for each client message, find the next CSM message
        const responseTimes: number[] = [];
        const messagesByConv = messages?.reduce((acc: any, msg: any) => {
          if (!acc[msg.conversation_id]) acc[msg.conversation_id] = [];
          acc[msg.conversation_id].push(msg);
          return acc;
        }, {} as Record<string, any[]>) || {};

        Object.values(messagesByConv).forEach((convMessages: any[]) => {
          for (let i = 0; i < convMessages.length; i++) {
            const msg = convMessages[i];

            // If it's a client message, find next CSM message
            if (!msg.is_from_me) {
              const nextCsmMsg = convMessages.slice(i + 1).find(m => m.is_from_me);
              if (nextCsmMsg) {
                const clientTime = new Date(msg.timestamp).getTime();
                const csmTime = new Date(nextCsmMsg.timestamp).getTime();
                const diffMinutes = (csmTime - clientTime) / (1000 * 60);

                // Ignore very fast responses (< 10s, probably automatic)
                // and very slow (> 24h, probably abandoned conversation)
                if (diffMinutes > 0.16 && diffMinutes < 1440) {
                  responseTimes.push(diffMinutes);
                }
              }
            }
          }
        });

        if (responseTimes.length > 0) {
          avgResponseTimeMinutes = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
        }
      }

      // Calculate daily trend with all days in range
      const days = eachDayOfInterval({ start: from, end: to });
      const conversationsByDate = conversations?.reduce((acc: Record<string, number>, conv: any) => {
        const date = format(new Date(conv.last_message_at), 'dd/MM');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}) || {};

      const dailyTrend = days.map(day => {
        const dateKey = format(day, 'dd/MM');
        return {
          date: dateKey,
          count: conversationsByDate[dateKey] || 0
        };
      });

      // Calculate status distribution
      const statusDistribution = [
        { status: 'active', count: active, percentage: total > 0 ? (active / total) * 100 : 0 },
        { status: 'closed', count: closed, percentage: total > 0 ? (closed / total) * 100 : 0 },
        { status: 'archived', count: archived, percentage: total > 0 ? (archived / total) * 100 : 0 },
      ];

      // Calculate topics distribution
      const topicCounts: Record<string, number> = {};
      conversations?.forEach((conv: any) => {
        const metadata = conv.metadata as any;
        if (metadata?.topics && Array.isArray(metadata.topics)) {
          metadata.topics.forEach((topic: string) => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
        }
      });

      const topicsDistribution = Object.entries(topicCounts).map(([topic, count]) => ({
        topic,
        count
      }));

      // Fetch longest conversations
      const { data: longestConvs, error: longestError } = await supabase
        .from('whatsapp_conversations')
        .select('id, created_at, last_message_at, status, contact_id')
        .gte('last_message_at', from.toISOString())
        .lte('last_message_at', to.toISOString())
        .order('created_at', { ascending: true })
        .limit(10);

      if (longestError) throw longestError;

      // Fetch contact details
      const contactIds = (longestConvs as any[])?.map(c => c.contact_id).filter(Boolean) || [];

      const { data: contactsData } = contactIds.length > 0
        ? await supabase
            .from('whatsapp_contacts')
            .select('id, name, phone_number')
            .in('id', contactIds)
        : { data: [] };

      const contactsMap = new Map((contactsData || []).map((c: any) => [c.id, c]));

      const longestConversations = longestConvs?.map((conv: any) => {
        const contact = contactsMap.get(conv.contact_id);
        const durationMs = new Date(conv.last_message_at).getTime() - new Date(conv.created_at).getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        return {
          id: conv.id,
          contactName: contact?.name || contact?.phone_number || 'Desconhecido',
          status: conv.status,
          durationHours,
          createdAt: conv.created_at
        };
      }).sort((a: any, b: any) => b.durationHours - a.durationHours) || [];

      return {
        total,
        active,
        closed,
        archived,
        avgResponseTimeMinutes,
        dailyTrend,
        statusDistribution,
        topicsDistribution,
        longestConversations
      } as WhatsAppMetrics;
    },
    refetchInterval: 60000, // Refetch every 1 minute
  });
};
