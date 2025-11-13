import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PWAProvider } from "@/contexts/PWAContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import HomeRedirect from "@/components/HomeRedirect";
// import Index from "./pages/Index"; // Removido - não será mais usado
import Login from "./pages/Login";
import DownloadPage from "./pages/DownloadPage";
import Register from "./pages/Register";
import CompleteProducerProfile from "./pages/CompleteProducerProfile";
// Import core pages directly for better performance
import ProducerDashboard from "./pages/ProducerDashboard";
import ProductsPage from "./pages/ProductsPage";
import ProducerSalesPage from "./pages/ProducerSalesPage";
import ProducerFinancialsPage from "./pages/ProducerFinancialsPage";
import SpacesListPage from "./pages/SpacesListPage";
import ProducerSubscriptionsPage from "./pages/ProducerSubscriptionsPage";
import TicketsPage from "./pages/TicketsPage";

// Lazy load only heavy admin and less-used components
import { lazy } from 'react';
import LazyRoute from "@/components/LazyRoute";
const CreateProductPage = lazy(() => import("./pages/CreateProductPage"));
const EditProductPage = lazy(() => import("./pages/EditProductPage"));
const EditSpacePage = lazy(() => import("./pages/EditSpacePage"));
const AdminDashboard = lazy(() => import("./pages/Admin/AdminDashboard"));
const AdminProducersPage = lazy(() => import("./pages/Admin/AdminProducersPage"));
const AdminFinancialsPage = lazy(() => import("./pages/Admin/AdminFinancialsPage"));

import Checkout from "./pages/Checkout";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminFeesPage from "./pages/Admin/AdminFeesPage";
import AdminGatewaysPage from "./pages/Admin/AdminGatewaysPage";
import VerificationPage from "./pages/Admin/VerificationPage";
import AdminPagesPage from "./pages/Admin/AdminPagesPage";
import AdminEditPage from "./pages/Admin/AdminEditPage";
import PublicPage from "./pages/PublicPage";
import SettingsHubPage from "./pages/Producer/SettingsHubPage";
import AccountPage from "./pages/Producer/Settings/AccountPage";
import WebhooksPage from "./pages/Producer/Settings/WebhooksPage";
import APIPage from "./pages/Producer/Settings/APIPage";
import PersonalizeSpacePage from "./pages/PersonalizeSpacePage";
import MyCoursesPage from "./pages/MyCoursesPage";
import CoursePlayerPage from "./pages/CoursePlayerPage";
import MembersCoursePlayerPage from "./pages/members/CoursePlayerPage";
import MembersHubPage from "./pages/members/MembersHubPage";
import UserProfilePage from "./pages/members/UserProfilePage";
import NotFound from "./pages/NotFound";
import { useState } from "react";

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: true,
        staleTime: 30 * 1000, // 30 segundos - mais agressivo para dados frescos
        gcTime: 5 * 60 * 1000, // 5 minutos
        refetchOnMount: true, // Permite atualizações quando necessário
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/checkout/:slug" element={<Checkout />} />
              <Route path="/payment-confirmation/:saleId" element={<PaymentConfirmation />} />
              <Route path="/ticket/:saleId" element={<LazyRoute Component={lazy(() => import("./pages/TicketViewPage"))} />} />
              <Route path="/p/:slug" element={<PublicPage />} />

              {/* Producer Routes - Core pages loaded directly for performance */}
              <Route path="/complete-producer-profile" element={<ProtectedRoute requiredView="producer"><CompleteProducerProfile /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute requiredView="producer"><ProducerDashboard /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute requiredView="producer"><ProductsPage /></ProtectedRoute>} />
              <Route path="/products/new" element={<ProtectedRoute requiredView="producer"><LazyRoute Component={CreateProductPage} /></ProtectedRoute>} />
              <Route path="/products/edit/:id" element={<ProtectedRoute requiredView="producer"><LazyRoute Component={EditProductPage} /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute requiredView="producer"><ProducerSalesPage /></ProtectedRoute>} />
              <Route path="/members-area" element={<ProtectedRoute requiredView="producer"><SpacesListPage /></ProtectedRoute>} />
              
              <Route path="/spaces/edit/:spaceId" element={<ProtectedRoute requiredView="producer"><LazyRoute Component={EditSpacePage} /></ProtectedRoute>} />
              <Route path="/personalize/edit/:spaceId" element={<ProtectedRoute requiredView="producer"><PersonalizeSpacePage /></ProtectedRoute>} />
              <Route path="/events/personalize/:productId" element={<ProtectedRoute requiredView="producer"><LazyRoute Component={lazy(() => import("./pages/EventPersonalizePage"))} /></ProtectedRoute>} />
              <Route path="/producer/subscriptions" element={<ProtectedRoute requiredView="producer"><ProducerSubscriptionsPage /></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute requiredView="producer"><TicketsPage /></ProtectedRoute>} />
              <Route path="/financials" element={<ProtectedRoute requiredView="producer"><ProducerFinancialsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requiredView="producer"><SettingsHubPage /></ProtectedRoute>} />
              <Route path="/settings/account" element={<ProtectedRoute requiredView="producer"><AccountPage /></ProtectedRoute>} />
              <Route path="/settings/webhooks" element={<ProtectedRoute requiredView="producer"><WebhooksPage /></ProtectedRoute>} />
              <Route path="/settings/api" element={<ProtectedRoute requiredView="producer"><APIPage /></ProtectedRoute>} />

              {/* Student Routes */}
              <Route path="/members" element={<ProtectedRoute requiredView="student"><MyCoursesPage /></ProtectedRoute>} />
              <Route path="/members/:slug" element={<ProtectedRoute requiredView="student"><CoursePlayerPage /></ProtectedRoute>} />
              <Route path="/members/courses/:productId" element={<ProtectedRoute requiredView="student"><MembersCoursePlayerPage /></ProtectedRoute>} />
              <Route path="/members/spaces/:spaceId" element={<ProtectedRoute requiredView="student"><MembersHubPage /></ProtectedRoute>} />
              <Route path="/members/profile" element={<ProtectedRoute requiredView="student"><UserProfilePage /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<LazyRoute Component={AdminDashboard} />} />
                <Route path="producers" element={<LazyRoute Component={AdminProducersPage} />} />
                <Route path="financials" element={<LazyRoute Component={AdminFinancialsPage} />} />
                <Route path="fees" element={<AdminFeesPage />} />
                <Route path="gateways" element={<AdminGatewaysPage />} />
                <Route path="verifications" element={<VerificationPage />} />
                <Route path="pages" element={<AdminPagesPage />} />
                <Route path="pages/new" element={<AdminEditPage />} />
                <Route path="pages/edit/:pageId" element={<AdminEditPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
