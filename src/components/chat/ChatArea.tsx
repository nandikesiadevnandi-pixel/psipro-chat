import { useWhatsAppMessages, useWhatsAppSend, useWhatsAppSentiment } from "@/hooks/whatsapp";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChatHeader } from "./ChatHeader";
import { MessagesContainer } from "./MessagesContainer";
import { MessageInput } from "./MessageInput";
import { MessageCircle } from "lucide-react";

interface ChatAreaProps {
  conversationId: string | null;
}

export const ChatArea = ({ conversationId }: ChatAreaProps) => {
  const { messages, isLoading: messagesLoading } = useWhatsAppMessages(conversationId);
  const { sentiment, isAnalyzing, analyze } = useWhatsAppSentiment(conversationId);
  const sendMutation = useWhatsAppSend();

  // Fetch conversation details including contact
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          contact:whatsapp_contacts(*)
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const handleSendMessage = (content: string) => {
    if (!conversationId || !content.trim()) return;
    
    sendMutation.mutate({
      conversationId,
      content,
      messageType: 'text',
    });
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-3">
          <MessageCircle className="w-24 h-24 mx-auto text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground">
            Selecione uma conversa
          </h3>
          <p className="text-sm text-muted-foreground">
            Escolha uma conversa na lista para começar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      <ChatHeader
        contact={conversation?.contact}
        sentiment={sentiment}
        isAnalyzing={isAnalyzing}
        onAnalyze={analyze}
      />
      
      <MessagesContainer messages={messages} isLoading={messagesLoading} />
      
      <MessageInput
        onSend={handleSendMessage}
        disabled={sendMutation.isPending}
      />
    </div>
  );
};
