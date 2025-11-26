import { useEffect } from "react";
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
import { useWhatsAppInstances } from "@/hooks/whatsapp";
import { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
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
type Instance = Tables<"whatsapp_instances">;

interface EditInstanceDialogProps {
  instance: Instance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditInstanceDialog = ({
  instance,
  open,
  onOpenChange,
}: EditInstanceDialogProps) => {
  const { updateInstance } = useWhatsAppInstances();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: instance.name,
      instance_name: instance.instance_name,
      api_url: instance.api_url,
      api_key: instance.api_key,
    },
  });

  // Update form when instance changes
  useEffect(() => {
    form.reset({
      name: instance.name,
      instance_name: instance.instance_name,
      api_url: instance.api_url,
      api_key: instance.api_key,
    });
  }, [instance, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await updateInstance.mutateAsync({
        id: instance.id,
        updates: values,
      });
      toast.success("Instância atualizada com sucesso!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao atualizar instância");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Instância</DialogTitle>
          <DialogDescription>
            Atualize as informações da instância
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
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
                  <FormLabel>Nome da Instância</FormLabel>
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
                  <FormLabel>URL da API</FormLabel>
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
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateInstance.isPending}>
                {updateInstance.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
