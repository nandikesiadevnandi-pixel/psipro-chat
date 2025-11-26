import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstancesList, AddInstanceDialog } from "@/components/settings";

const WhatsAppSettings = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Link to="/whatsapp">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para WhatsApp
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Configurações do WhatsApp
              </h1>
              <p className="text-muted-foreground mt-2">
                Gerencie suas instâncias da Evolution API
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Instância
            </Button>
          </div>
        </div>

        {/* Instances List */}
        <InstancesList />
      </div>

      {/* Add Instance Dialog */}
      <AddInstanceDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
};

export default WhatsAppSettings;
