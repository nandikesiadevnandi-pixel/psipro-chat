import { useState } from "react";
import { ConversationsSidebar } from "@/components/conversations";
import ChatArea from "@/components/ChatArea";
import { useWhatsAppInstances } from "@/hooks/whatsapp";

const Index = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const { instances } = useWhatsAppInstances();

  // Use first instance by default
  const instanceId = instances[0]?.id || "";

  // Mock data for ChatArea - will be replaced with real data
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
  ];

  const sentiment = {
    type: 'positive' as const,
    summary: "Conversa positiva - cliente satisfeito com o atendimento",
    confidence: 0.87,
  };

  const handleSendMessage = (message: string) => {
    console.log("Sending message:", message);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {instanceId && (
        <ConversationsSidebar
          selectedId={selectedConversation}
          onSelect={setSelectedConversation}
          instanceId={instanceId}
        />
      )}
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