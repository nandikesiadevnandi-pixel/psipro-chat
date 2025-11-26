import { useState } from "react";
import { ConversationsSidebar } from "@/components/conversations";
import { ChatArea } from "@/components/chat";
import { useWhatsAppInstances } from "@/hooks/whatsapp";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Settings, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const WhatsApp = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const { instances } = useWhatsAppInstances();
  const isMobile = useIsMobile();

  // Use first instance by default
  const instanceId = instances[0]?.id || "";

  const handleSelectConversation = (id: string | null) => {
    setSelectedConversation(id);
  };

  const handleBackToSidebar = () => {
    setSelectedConversation(null);
  };

  // Mobile: show sidebar OR chat, never both
  const showSidebar = !isMobile || !selectedConversation;
  const showChat = !isMobile || selectedConversation;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      {showSidebar && instanceId && (
        <div className={`${isMobile ? "w-full" : "w-[350px]"} border-r border-border`}>
          <ConversationsSidebar
            selectedId={selectedConversation}
            onSelect={handleSelectConversation}
            instanceId={instanceId}
          />
        </div>
      )}

      {/* Chat Area */}
      {showChat && (
        <div className="flex-1 flex flex-col">
          {/* Mobile back button */}
          {isMobile && selectedConversation && (
            <div className="border-b border-border p-2">
              <Button variant="ghost" size="sm" onClick={handleBackToSidebar}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          )}
          <ChatArea conversationId={selectedConversation} />
        </div>
      )}

      {/* No instance state */}
      {!instanceId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Nenhuma instância configurada</p>
            <Link to="/whatsapp/settings">
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Configurar Instância
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsApp;
