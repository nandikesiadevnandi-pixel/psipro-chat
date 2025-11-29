import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstancesList, AddInstanceDialog, TeamMembersList, AssignmentRulesManager, InstanceOnboardingGuide, SetupGuideTab } from "@/components/settings";
import { MacrosManager } from "@/components/macros";
import { useAuth } from "@/contexts/AuthContext";

const WhatsAppSettings = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { isAdmin } = useAuth();

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
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Configurações do WhatsApp
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas instâncias e automações
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="setup" className="w-full">
          <TabsList>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="instances">Instâncias</TabsTrigger>
            <TabsTrigger value="macros">Macros</TabsTrigger>
            <TabsTrigger value="assignment">Atribuição</TabsTrigger>
            {isAdmin && <TabsTrigger value="team">Equipe</TabsTrigger>}
          </TabsList>

          <TabsContent value="setup" className="mt-6">
            <SetupGuideTab />
          </TabsContent>

          <TabsContent value="instances" className="space-y-4 mt-6">
            <div className="flex justify-end">
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Instância
              </Button>
            </div>
            <InstancesList />
          </TabsContent>

          <TabsContent value="macros" className="mt-6">
            <MacrosManager />
          </TabsContent>

          <TabsContent value="assignment" className="mt-6">
            <AssignmentRulesManager />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="team" className="mt-6">
              <TeamMembersList />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Add Instance Dialog */}
      <AddInstanceDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
      />

      {/* Onboarding Guide - Widget flutuante */}
      <InstanceOnboardingGuide
        onOpenAddDialog={() => setShowAddDialog(true)}
      />
    </div>
  );
};

export default WhatsAppSettings;
