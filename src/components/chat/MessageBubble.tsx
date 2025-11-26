import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuotedMessagePreview } from "./QuotedMessagePreview";
import { ImageViewerModal } from "./ImageViewerModal";

type Message = Tables<'whatsapp_messages'>;

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const isFromMe = message.is_from_me;
  const time = format(new Date(message.timestamp), 'HH:mm');

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
        'flex',
        isFromMe ? 'justify-end' : 'justify-start'
      )}
    >
      <Card
        className={cn(
          'max-w-[70%] p-3 space-y-1',
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

      <ImageViewerModal
        imageUrl={viewerImage}
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
      />
    </div>
  );
};
