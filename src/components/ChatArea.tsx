import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isFromMe: boolean;
}

interface ChatAreaProps {
  contactName: string;
  messages: Message[];
  sentiment?: {
    type: 'positive' | 'neutral' | 'negative';
    summary: string;
    confidence: number;
  };
  onSendMessage: (message: string) => void;
}

const ChatArea = ({ contactName, messages, sentiment, onSendMessage }: ChatAreaProps) => {
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  const getSentimentBadge = () => {
    if (!sentiment) return null;
    
    const colors = {
      positive: 'bg-success/10 text-success border-success/20',
      negative: 'bg-destructive/10 text-destructive border-destructive/20',
      neutral: 'bg-muted text-muted-foreground border-border',
    };

    const icons = {
      positive: <TrendingUp className="w-4 h-4" />,
      negative: <TrendingDown className="w-4 h-4" />,
      neutral: <Minus className="w-4 h-4" />,
    };

    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors[sentiment.type]}`}>
        {icons[sentiment.type]}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm capitalize">{sentiment.type}</span>
            <span className="text-xs opacity-75">
              {Math.round(sentiment.confidence * 100)}%
            </span>
          </div>
          <p className="text-xs opacity-90 mt-1">{sentiment.summary}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-screen">
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{contactName}</h2>
          {getSentimentBadge()}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[70%] p-3 ${
                  msg.isFromMe
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <span
                  className={`text-xs mt-1 block ${
                    msg.isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite uma mensagem..."
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;