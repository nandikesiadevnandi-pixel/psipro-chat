import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth";
import { SetupGuideModal, SetupGuideSideTab } from "@/components/setup";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import WhatsApp from "./pages/WhatsApp";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import WhatsAppRelatorio from "./pages/WhatsAppRelatorio";
import WhatsAppContatos from "./pages/WhatsAppContatos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <SetupGuideModal open={showSetupGuide} onOpenChange={setShowSetupGuide} />
              <SetupGuideSideTab onClick={() => setShowSetupGuide(true)} />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
                <Route path="/whatsapp/settings" element={<ProtectedRoute><WhatsAppSettings /></ProtectedRoute>} />
                <Route path="/whatsapp/relatorio" element={<ProtectedRoute><WhatsAppRelatorio /></ProtectedRoute>} />
                <Route path="/whatsapp/contatos" element={<ProtectedRoute><WhatsAppContatos /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
