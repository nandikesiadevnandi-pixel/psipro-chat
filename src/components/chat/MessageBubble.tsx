import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuotedMessagePreview } from "./QuotedMessagePreview";
import { ImageViewerModal } from "./ImageViewerModal";
import { MessageReactionButton } from "./MessageReactionButton";
import { useMessageReaction } from "@/hooks/whatsapp/useMessageReaction";

type Message = Tables<'whatsapp_messages'>;
type Reaction = Tables<'whatsapp_reactions'>;

interface MessageBubbleProps {
  message: Message;
  reactions?: Reaction[];
}

export const MessageBubble = ({ message, reactions = [] }: MessageBubbleProps) => {
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isFromMe = message.is_from_me;
  const time = format(new Date(message.timestamp), 'HH:mm');
  const { sendReaction } = useMessageReaction();

  const handleReact = (emoji: string) => {
    sendReaction.mutate({
      messageId: message.message_id,
      conversationId: message.conversation_id,
      emoji,
      reactorJid: message.remote_jid,
      isFromMe: true,
    });
  };

  const getStatusIcon = () => {
    if (!isFromMe) return null;
    
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3" />;
      case 'sent':
        return <Check className="w-3 h-3" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return <Check className="w-3 h-3" />;
    }
  };

  const renderReactions = () => {
    if (!reactions || reactions.length === 0) return null;
    
    // Group reactions by emoji and count
    const grouped = reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return (
      <div className="flex gap-1 flex-wrap mt-1">
        {Object.entries(grouped).map(([emoji, count]) => (
          <span 
            key={emoji}
            className="px-1.5 py-0.5 bg-muted rounded-full text-xs flex items-center gap-1 border border-border"
          >
            <span className="text-sm">{emoji}</span>
            {count > 1 && <span className="text-muted-foreground font-medium">{count}</span>}
          </span>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <img
                src={message.media_url}
                alt="Imagem"
                className="max-w-xs rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setViewerImage(message.media_url)}
              />
            )}
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        );
      
      case 'sticker':
        return (
          <div>
            {message.media_url && (
              <img
                src={message.media_url}
                alt="Sticker"
                className="max-w-[150px] cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setViewerImage(message.media_url)}
              />
            )}
          </div>
        );
      
      case 'audio':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <audio controls className="max-w-xs">
                <source src={message.media_url} type={message.media_mimetype || 'audio/ogg'} />
              </audio>
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <video controls className="max-w-xs rounded-md">
                <source src={message.media_url} type={message.media_mimetype || 'video/mp4'} />
              </video>
            )}
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        );
      
      case 'document':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <a
                href={message.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm underline"
              >
                📄 {message.content || 'Documento'}
              </a>
            )}
          </div>
        );
      
      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );
    }
  };

  return (
    <div
      className={cn(
        'flex group relative',
        isFromMe ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-[70%] relative">
        {isHovered && (
          <MessageReactionButton
            messageId={message.message_id}
            conversationId={message.conversation_id}
            onReact={handleReact}
            isFromMe={isFromMe}
          />
        )}
        <Card
          className={cn(
            'p-3 space-y-1',
            message.message_type === 'sticker' && 'bg-transparent border-none shadow-none p-0',
            isFromMe
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-card-foreground'
          )}
        >
          {message.quoted_message_id && (
            <QuotedMessagePreview messageId={message.quoted_message_id} />
          )}
          
          {renderContent()}
          
          <div className="flex items-center justify-end gap-1 mt-1">
            <span
              className={cn(
                'text-xs',
                isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {time}
            </span>
            {getStatusIcon()}
          </div>
        </Card>
        
        {renderReactions()}
      </div>

      <ImageViewerModal
        imageUrl={viewerImage}
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
      />
    </div>
  );
};
