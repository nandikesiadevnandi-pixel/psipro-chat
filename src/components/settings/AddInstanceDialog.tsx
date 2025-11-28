import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWhatsAppInstances } from "@/hooks/whatsapp";
import { Loader2, Check, Copy, Link as LinkIcon, Info } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  instance_name: z
    .string()
    .min(1, "Nome da instância obrigatório")
    .regex(/^[a-zA-Z0-9_-]+$/, "Apenas letras, números, _ e -"),
  api_url: z.string().url("URL inválida"),
  api_key: z.string().min(1, "API Key obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddInstanceDialog = ({ open, onOpenChange }: AddInstanceDialogProps) => {
  const { createInstance, testConnection } = useWhatsAppInstances();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [showWebhookInstructions, setShowWebhookInstructions] = useState(false);
  const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      instance_name: "",
      api_url: "",
      api_key: "",
    },
  });

  const handleTestConnection = async () => {
    const values = form.getValues();
    
    // Validate required fields for testing
    const fieldsToValidate = ["api_url", "api_key", "instance_name"] as const;
    const isValid = await form.trigger(fieldsToValidate);
    
    if (!isValid) {
      toast.error("Preencha os campos obrigatórios para testar a conexão");
      return;
    }

    setIsTestingConnection(true);
    try {
      // Create temporary instance for testing
      const response = await fetch(
        `${values.api_url}/instance/connectionState/${values.instance_name}`,
        {
          headers: {
            apikey: values.api_key,
          },
        }
      );

      if (!response.ok) throw new Error("Connection test failed");
      
      setConnectionTested(true);
      toast.success("Conexão testada com sucesso!");
    } catch (error) {
      toast.error("Falha ao testar conexão. Verifique as credenciais.");
      setConnectionTested(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      // Create instance (api_url and api_key go to whatsapp_instance_secrets via trigger)
      const result = await createInstance.mutateAsync({
        name: values.name,
        instance_name: values.instance_name,
      });
      setCreatedInstanceId(result.id);
      setShowWebhookInstructions(true);
      form.reset();
      setConnectionTested(false);
    } catch (error) {
      toast.error("Erro ao criar instância");
    }
  };

  const handleClose = () => {
    if (!showWebhookInstructions) {
      form.reset();
      setConnectionTested(false);
    }
    setShowWebhookInstructions(false);
    setCreatedInstanceId(null);
    onOpenChange(false);
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada!");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!showWebhookInstructions ? (
          <>
            <DialogHeader>
              <DialogTitle>Nova Instância</DialogTitle>
              <DialogDescription>
                Adicione uma nova instância da Evolution API
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>Nome</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[250px]">
                            <p>Nome para identificar a instância na plataforma (ex: 'WhatsApp Vendas', 'Suporte Técnico')</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <Input placeholder="Minha Instância" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instance_name"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>Nome da Instância</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[250px]">
                            <p>Nome exato da instância configurada no Evolution API. Encontre no painel do Evolution em 'Instances'.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <Input placeholder="my-instance" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="api_url"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>URL da API</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[250px]">
                            <p>URL de acesso ao seu Evolution API. É a mesma URL que você usa no navegador para acessar o painel.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <Input placeholder="https://api.evolution.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>API Key</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[250px]">
                            <p>Chave de autenticação da API. Se usa Cloudfy, encontre em 'Infraestrutura' no painel da ferramenta.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                  >
                    {isTestingConnection ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : connectionTested ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : null}
                    Testar Conexão
                  </Button>

                  <Button
                    type="submit"
                    disabled={!connectionTested || createInstance.isPending}
                    className="ml-auto"
                  >
                    {createInstance.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Salvar
                  </Button>
                </div>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Instância criada com sucesso!
              </DialogTitle>
              <DialogDescription>
                Configure o webhook na Evolution API
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <LinkIcon className="h-4 w-4" />
                <AlertDescription className="space-y-2 mt-2">
                  <div>
                    <strong>URL do Webhook:</strong>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 bg-muted p-2 rounded text-xs break-all">
                        {webhookUrl}
                      </code>
                      <Button size="sm" variant="outline" onClick={copyWebhookUrl}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <strong>Events:</strong>
                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                      <li>MESSAGES_UPSERT</li>
                      <li>MESSAGES_UPDATE</li>
                      <li>CONNECTION_UPDATE</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <Button onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
