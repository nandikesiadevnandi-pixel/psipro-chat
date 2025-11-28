import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  QrCode, 
  Settings, 
  Copy, 
  Webhook,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Globe,
  MessageSquare,
  Shield,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface InstanceOnboardingGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAddDialog?: () => void;
}

const onboardingSteps = [
  {
    id: 1,
    phase: "evolution",
    phaseLabel: "Configuração do Evolution",
    title: "Acessar o Evolution",
    description: "Acesse a sua instância do Evolution API ou contrate utilizando o Cloudfy.",
    link: "https://www.cloudfy.host",
    linkText: "Contratar no Cloudfy",
    icon: Globe
  },
  {
    id: 2,
    phase: "evolution",
    phaseLabel: "Configuração do Evolution",
    title: "Criar uma instância nova",
    description: "No painel do Evolution, crie uma nova instância para conectar seu WhatsApp.",
    icon: MessageSquare
  },
  {
    id: 3,
    phase: "evolution",
    phaseLabel: "Configuração do Evolution",
    title: "Conectar via QR Code",
    description: "Escaneie o QR Code com o WhatsApp do número que deseja conectar.",
    icon: QrCode
  },
  {
    id: 4,
    phase: "evolution",
    phaseLabel: "Configuração do Evolution",
    title: "Ignorar grupos",
    description: "Acesse Configurations > Settings e ative 'Ignore All Groups' para evitar mensagens de grupos.",
    icon: Shield
  },
  {
    id: 5,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "Criar nova instância",
    description: "Na plataforma de WhatsApp desenvolvida, clique em 'Criar nova Instância'.",
    icon: Zap,
    showAddInstanceButton: true
  },
  {
    id: 6,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "Nome de identificação",
    description: "Adicione o nome que identifique a instância (ex: 'WhatsApp Vendas').",
    icon: Settings
  },
  {
    id: 7,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "Nome da instância no Evolution",
    description: "Adicione o nome da instância configurada no Evolution (ex: 'my-instance').",
    icon: Settings
  },
  {
    id: 8,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "URL da API",
    description: "Adicione a URL da API do Evolution (a mesma URL do navegador).",
    icon: ExternalLink
  },
  {
    id: 9,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "Chave da API",
    description: "Adicione a sua chave da API. Se você está usando no Cloudfy, ela se encontra no painel da ferramenta em Infraestrutura.",
    icon: Shield
  },
  {
    id: 10,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "Salvar configurações",
    description: "Clique em 'Salvar' para criar a instância na plataforma.",
    icon: CheckCircle2
  },
  {
    id: 11,
    phase: "webhook",
    phaseLabel: "Configuração do Webhook",
    title: "Copiar URL do Webhook",
    description: "Após salvar, copie a URL do Webhook exibida na tela de sucesso.",
    icon: Copy,
    showWebhookInfo: true
  },
  {
    id: 12,
    phase: "webhook",
    phaseLabel: "Configuração do Webhook",
    title: "Acessar configuração de Webhook",
    description: "No Evolution, acesse Events > Webhook.",
    icon: Webhook
  },
  {
    id: 13,
    phase: "webhook",
    phaseLabel: "Configuração do Webhook",
    title: "Configurar Webhook",
    description: "Cole a URL do Webhook no campo 'Webhook' e ative 'Webhook base 64'.",
    icon: Settings
  },
  {
    id: 14,
    phase: "webhook",
    phaseLabel: "Configuração do Webhook",
    title: "Ativar eventos",
    description: "Role a página e ative o evento 'MESSAGES_UPSERT'. Clique em salvar.",
    icon: CheckCircle2,
    showEventsInfo: true
  },
  {
    id: 15,
    phase: "finalization",
    phaseLabel: "Finalização",
    title: "Testar conexão",
    description: "Pronto! Agora teste a sua conexão enviando uma mensagem de teste pelo WhatsApp conectado.",
    icon: CheckCircle2
  }
];

const getPhaseColor = (phase: string) => {
  switch (phase) {
    case "evolution": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "platform": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "webhook": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "finalization": return "bg-primary/10 text-primary border-primary/20";
    default: return "";
  }
};

export const InstanceOnboardingGuide = ({ 
  open, 
  onOpenChange,
  onOpenAddDialog 
}: InstanceOnboardingGuideProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  
  const step = onboardingSteps[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === onboardingSteps.length;
  
  const webhookUrl = `${window.location.origin}/functions/v1/evolution-webhook`;
  
  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleClose = () => {
    setCurrentStep(1);
    onOpenChange(false);
  };
  
  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "URL copiada!",
      description: "A URL do webhook foi copiada para a área de transferência.",
    });
  };
  
  const handleOpenAddInstance = () => {
    handleClose();
    onOpenAddDialog?.();
  };
  
  const Icon = step.icon;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Guia de Configuração de Instância
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Sidebar com progresso */}
          <div className="w-16 flex-shrink-0 space-y-2 overflow-y-auto pr-2">
            {onboardingSteps.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={cn(
                  "w-full aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all",
                  currentStep === s.id 
                    ? "border-primary bg-primary text-primary-foreground scale-110" 
                    : currentStep > s.id
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {s.id}
              </button>
            ))}
          </div>
          
          {/* Conteúdo principal */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            <div className="space-y-4">
              <Badge variant="outline" className={cn("border", getPhaseColor(step.phase))}>
                {step.phaseLabel}
              </Badge>
              
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">
                      Passo {step.id} de {onboardingSteps.length}
                    </h3>
                  </div>
                  <h4 className="text-xl font-bold">{step.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Link externo */}
              {step.link && (
                <Card className="p-4 border-l-4 border-l-primary">
                  <a 
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {step.linkText}
                  </a>
                </Card>
              )}
              
              {/* Botão para abrir AddInstanceDialog */}
              {step.showAddInstanceButton && (
                <Card className="p-4 border-l-4 border-l-green-500">
                  <Button onClick={handleOpenAddInstance} className="w-full">
                    Abrir formulário de Nova Instância
                  </Button>
                </Card>
              )}
              
              {/* Informações do Webhook */}
              {step.showWebhookInfo && (
                <Card className="p-4 space-y-3 border-l-4 border-l-purple-500">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">URL do Webhook:</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleCopyWebhook}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <code className="block p-2 bg-muted rounded text-xs break-all">
                    {webhookUrl}
                  </code>
                </Card>
              )}
              
              {/* Informações de eventos */}
              {step.showEventsInfo && (
                <Card className="p-4 space-y-3 border-l-4 border-l-purple-500">
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Eventos para ativar:</span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <code className="bg-muted px-2 py-1 rounded">MESSAGES_UPSERT</code>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Webhook base 64 (ativado)</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer com navegação */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          
          <div className="text-sm text-muted-foreground">
            {currentStep} / {onboardingSteps.length}
          </div>
          
          {isLastStep ? (
            <Button onClick={handleClose}>
              Concluir
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
