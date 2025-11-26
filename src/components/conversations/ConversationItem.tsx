import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";

type Conversation = Tables<"whatsapp_conversations"> & {
  contact?: Tables<"whatsapp_contacts"> | null;
};

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const getSentimentEmoji = (sentiment: string | null) => {
  switch (sentiment) {
    case "positive":
      return "😊";
    case "negative":
      return "😟";
    case "neutral":
      return "😐";
    default:
      return null;
  }
};

const formatTimestamp = (dateString: string | null) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (isToday(date)) {
    return format(date, "HH:mm");
  }

  if (isYesterday(date)) {
    return "Ontem";
  }

  if (isThisWeek(date)) {
    return format(date, "EEE", { locale: ptBR });
  }

  return format(date, "dd/MM", { locale: ptBR });
};

const getInitials = (name: string) => {
  const words = name.split(" ");
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const ConversationItem = ({ conversation, isSelected, onClick }: ConversationItemProps) => {
  const contactName = conversation.contact?.name || "Desconhecido";
  const profilePicture = conversation.contact?.profile_picture_url;
  const lastMessage = conversation.last_message_preview || "";
  const lastMessageTime = conversation.last_message_at;
  const unreadCount = conversation.unread_count || 0;
  
  // Get sentiment from metadata if available
  const sentiment = (conversation.metadata as any)?.sentiment || null;
  const sentimentEmoji = getSentimentEmoji(sentiment);

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 p-3 cursor-pointer transition-colors
        hover:bg-sidebar-accent
        ${isSelected ? "bg-sidebar-accent" : ""}
      `}
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={profilePicture || undefined} alt={contactName} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
          {getInitials(contactName)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name and timestamp row */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-medium text-sm text-sidebar-foreground truncate">
              {contactName}
            </span>
            {sentimentEmoji && (
              <span className="text-sm shrink-0">{sentimentEmoji}</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTimestamp(lastMessageTime)}
          </span>
        </div>

        {/* Preview and unread badge row */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground truncate flex-1">
            {lastMessage || "Sem mensagens"}
          </p>
          {unreadCount > 0 && (
            <Badge
              variant="default"
              className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
