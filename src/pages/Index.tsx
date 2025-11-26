import { useState } from "react";
import ConversationList from "@/components/ConversationList";
import ChatArea from "@/components/ChatArea";

const Index = () => {
  const [selectedConversation, setSelectedConversation] = useState<string>("1");

  // Mock data - será substituído por dados reais do Supabase
  const conversations = [
    {
      id: "1",
      contactName: "João Silva",
      lastMessage: "Obrigado pela ajuda!",
      lastMessageTime: "10:30",
      unreadCount: 2,
      sentiment: 'positive' as const,
    },
    {
      id: "2",
      contactName: "Maria Santos",
      lastMessage: "Estou com um problema...",
      lastMessageTime: "09:15",
      unreadCount: 0,
      sentiment: 'negative' as const,
    },
    {
      id: "3",
      contactName: "Pedro Costa",
      lastMessage: "Tudo bem?",
      lastMessageTime: "Ontem",
      unreadCount: 0,
      sentiment: 'neutral' as const,
    },
  ];

  const messages = [
    {
      id: "1",
      content: "Olá! Como posso ajudar?",
      timestamp: "10:25",
      isFromMe: true,
    },
    {
      id: "2",
      content: "Preciso de informações sobre o produto",
      timestamp: "10:28",
      isFromMe: false,
    },
    {
      id: "3",
      content: "Obrigado pela ajuda!",
      timestamp: "10:30",
      isFromMe: false,
    },
  ];

  const sentiment = {
    type: 'positive' as const,
    summary: "Conversa positiva - cliente satisfeito com o atendimento",
    confidence: 0.87,
  };

  const handleSendMessage = (message: string) => {
    console.log("Sending message:", message);
    // Aqui será implementada a lógica de envio via Evolution API
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversation}
        onSelect={setSelectedConversation}
      />
      <ChatArea
        contactName="João Silva"
        messages={messages}
        sentiment={sentiment}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default Index;