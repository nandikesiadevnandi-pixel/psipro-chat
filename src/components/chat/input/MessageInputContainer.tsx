import { useState, useRef, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mic } from "lucide-react";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { MediaUploadButton } from "./MediaUploadButton";
import { AudioRecorder } from "./AudioRecorder";

export interface MediaSendParams {
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document';
  content?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  mediaMimetype?: string;
  fileName?: string;
}

interface MessageInputContainerProps {
  conversationId: string;
  disabled?: boolean;
  onSendText: (content: string) => void;
  onSendMedia: (params: MediaSendParams) => void;
}

export const MessageInputContainer = ({ 
  conversationId, 
  disabled, 
  onSendText, 
  onSendMedia 
}: MessageInputContainerProps) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendText(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = message;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    
    setMessage(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + emoji.length;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  if (isRecording) {
    return (
      <div className="p-4 border-t border-border bg-card">
        <AudioRecorder
          onSend={(params) => {
            onSendMedia(params);
            setIsRecording(false);
          }}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-border bg-card">
      <div className="flex gap-2 items-end">
        <EmojiPickerButton onEmojiSelect={handleEmojiSelect} disabled={disabled} />
        
        <MediaUploadButton 
          conversationId={conversationId}
          onSendMedia={onSendMedia}
          disabled={disabled}
        />
        
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          className="min-h-[44px] max-h-32 resize-none"
          disabled={disabled}
        />
        
        {message.trim() ? (
          <Button
            onClick={handleSend}
            size="icon"
            disabled={disabled}
          >
            <Send className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setIsRecording(true)}
            size="icon"
            variant="outline"
            disabled={disabled}
          >
            <Mic className="w-4 h-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Enter para enviar, Shift+Enter para nova linha
      </p>
    </div>
  );
};
