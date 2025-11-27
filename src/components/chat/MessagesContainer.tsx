import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { Tables } from "@/integrations/supabase/types";
import { format, isToday, isYesterday, isSameWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

type Message = Tables<'whatsapp_messages'>;

interface MessagesContainerProps {
  messages: Message[];
  isLoading: boolean;
}

export const MessagesContainer = ({ messages, isLoading }: MessagesContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    if (isSameWeek(date, new Date())) {
      return format(date, 'EEEE', { locale: ptBR });
    }
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return Object.entries(groups).map(([dateKey, msgs]) => ({
      date: new Date(dateKey),
      messages: msgs,
    }));
  };

  const messageGroups = groupMessagesByDate();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
      <div className="space-y-4">
        {messageGroups.map((group, idx) => (
          <div key={idx}>
            <div className="flex justify-center my-4">
              <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                {getDateSeparator(group.date)}
              </span>
            </div>
            
            <div className="space-y-2">
              {group.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
