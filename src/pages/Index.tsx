import { useState } from "react";
import { ConversationsSidebar } from "@/components/conversations";
import { ChatArea } from "@/components/chat";
import { useWhatsAppInstances } from "@/hooks/whatsapp";

const Index = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const { instances } = useWhatsAppInstances();

  // Use first instance by default
  const instanceId = instances[0]?.id || "";

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {instanceId && (
        <ConversationsSidebar
          selectedId={selectedConversation}
          onSelect={setSelectedConversation}
          instanceId={instanceId}
        />
      )}
      <ChatArea conversationId={selectedConversation} />
    </div>
  );
};

export default Index;