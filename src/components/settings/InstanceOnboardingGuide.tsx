import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ExternalLink,
  QrCode,
  Settings,
  Copy,
  Webhook,
  CheckCircle2,
  Globe,
  MessageSquare,
  Shield,
  Zap,
  Check,
  Rocket,
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
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    const saved = localStorage.getItem('whatsapp-onboarding-progress');
    return saved ? JSON.parse(saved) : [];
  });
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const { toast } = useToast();
  
  const webhookUrl = `${window.location.origin}/functions/v1/evolution-webhook`;

  // Persistir progresso no localStorage
  useEffect(() => {
    localStorage.setItem('whatsapp-onboarding-progress', JSON.stringify(completedSteps));
  }, [completedSteps]);

  const progressPercent = Math.round((completedSteps.length / onboardingSteps.length) * 100);

  const toggleStep = (stepId: number) => {
    setCompletedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast({
      title: "URL copiada!",
      description: "A URL do webhook foi copiada para a área de transferência.",
    });
  };

  const handleOpenAddInstance = () => {
    onOpenChange(false);
    onOpenAddDialog?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Rocket className="h-6 w-6 text-primary" />
            Bem-vindo! Configuração de Instância
          </DialogTitle>
          <DialogDescription>
            Siga este checklist para configurar sua instância do WhatsApp
          </DialogDescription>
        </DialogHeader>

        {/* Barra de progresso */}
        <div className="flex items-center gap-3 py-2">
          <span className="text-lg font-semibold text-primary min-w-[60px]">{progressPercent}%</span>
          <Progress value={progressPercent} className="flex-1" />
          <span className="text-sm text-muted-foreground">
            {completedSteps.length}/{onboardingSteps.length}
          </span>
        </div>

        {/* Lista de passos com Accordion */}
        <ScrollArea className="h-[500px] pr-4">
          <Accordion type="single" collapsible className="space-y-2">
            {onboardingSteps.map((step) => {
              const isCompleted = completedSteps.includes(step.id);
              const Icon = step.icon;

              return (
                <AccordionItem 
                  key={step.id} 
                  value={`step-${step.id}`}
                  className="border rounded-lg px-4 data-[state=open]:bg-muted/50"
                >
                  <div className="flex items-center gap-3 py-1">
                    <Checkbox 
                      checked={isCompleted}
                      onCheckedChange={() => toggleStep(step.id)}
                      className="mt-3"
                    />
                    <AccordionTrigger className="flex-1 hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        <div className={cn("p-2 rounded-lg", getPhaseColor(step.phase))}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{step.title}</div>
                          <Badge variant="outline" className="mt-1 text-xs">
                            Passo {step.id}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                  </div>
                  
                  <AccordionContent className="pb-4 pt-2 pl-12">
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>

                      {/* Link externo */}
                      {step.link && (
                        <Button variant="outline" size="sm" asChild className="w-full">
                          <a href={step.link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {step.linkText}
                          </a>
                        </Button>
                      )}

                      {/* Botão para abrir AddInstanceDialog */}
                      {step.showAddInstanceButton && (
                        <Button onClick={handleOpenAddInstance} size="sm" className="w-full">
                          <Zap className="mr-2 h-4 w-4" />
                          Criar Nova Instância
                        </Button>
                      )}

                      {/* Informações do Webhook */}
                      {step.showWebhookInfo && (
                        <div className="space-y-3">
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="text-xs font-medium mb-2 text-muted-foreground">URL do Webhook:</div>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-background p-2 rounded border break-all">
                                {webhookUrl}
                              </code>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={handleCopyWebhook}
                                className="shrink-0"
                              >
                                {copiedWebhook ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Informações de eventos */}
                      {step.showEventsInfo && (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <div className="text-xs font-medium mb-2">Eventos a ativar:</div>
                          <ul className="text-xs space-y-1 text-muted-foreground">
                            <li>✓ MESSAGES_UPSERT</li>
                            <li>✓ Webhook base 64</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>

        {/* Footer com CTA */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => {
              setCompletedSteps([]);
              toast({
                title: "Progresso resetado",
                description: "Todos os passos foram desmarcados.",
              });
            }}
          >
            Resetar
          </Button>
          <Button onClick={handleOpenAddInstance}>
            <Rocket className="mr-2 h-4 w-4" />
            Começar Configuração!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
