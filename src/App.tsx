import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import WhatsApp from "./pages/WhatsApp";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import WhatsAppRelatorio from "./pages/WhatsAppRelatorio";
import WhatsAppContatos from "./pages/WhatsAppContatos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/whatsapp/settings" element={<WhatsAppSettings />} />
          <Route path="/whatsapp/relatorio" element={<WhatsAppRelatorio />} />
          <Route path="/whatsapp/contatos" element={<WhatsAppContatos />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
