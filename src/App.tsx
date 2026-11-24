import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Influencers from "./pages/Influencers";
import InfluencerDetail from "./pages/InfluencerDetail";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Coupons from "./pages/Coupons";
import Recurrences from "./pages/Recurrences";
import Insights from "./pages/Insights";
import BackofficeFiscal from "./pages/BackofficeFiscal";
import BackofficeMessages from "./pages/BackofficeMessages";
import Ambassadors from "./pages/Ambassadors";
import InboxPage from "./pages/Inbox";
import Login from "./pages/Login";
import PublicInbox from "./pages/PublicInbox";
import Envios from "./pages/Envios";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import SettingsList from "./pages/SettingsList";
import NotFound from "./pages/NotFound";
import FaqPage from "./pages/Faq";
import AdminFaq from "./pages/AdminFaq";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/influencers" element={<Influencers />} />
          <Route path="/influencer/:id" element={<InfluencerDetail />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaign/:id" element={<CampaignDetail />} />
          <Route path="/recurrences" element={<Recurrences />} />
          <Route path="/coupons" element={<Coupons />} />
          <Route path="/envios" element={<Envios />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/ambassadors" element={<Ambassadors />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/backoffice/fiscal" element={<BackofficeFiscal />} />
          <Route path="/backoffice/messages" element={<BackofficeMessages />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/faq" element={<AdminFaq />} />
          <Route path="/settings/:section" element={<SettingsList />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/depositar" element={<PublicInbox />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
