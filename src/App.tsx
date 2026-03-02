import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PublicOnlyRoute from "@/components/auth/PublicOnlyRoute";
// Auth Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

// Student Pages
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import ClassDetail from "./pages/ClassDetail";
import RankPapers from "./pages/RankPapers";
import RankPaperDetail from "./pages/RankPaperDetail";
import RankPaperAttempt from "./pages/RankPaperAttempt";
import RankPaperResults from "./pages/RankPaperResults";
import RankPaperLeaderboard from "./pages/RankPaperLeaderboard";
import Papers from "./pages/Papers";
import Shop from "./pages/Shop";
import Checkout from "./pages/Checkout";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import { CartProvider } from "@/hooks/useCart";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminModerators from "./pages/admin/AdminModerators";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminClassContent from "./pages/admin/AdminClassContent";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminRankPapers from "./pages/admin/AdminRankPapers";
import AdminRankPaperQuestions from "./pages/admin/AdminRankPaperQuestions";
import AdminRankPaperAttempts from "./pages/admin/AdminRankPaperAttempts";
import AdminShop from "./pages/admin/AdminShop";
import AdminPapers from "./pages/admin/AdminPapers";
import AdminBulkSms from "./pages/admin/AdminBulkSms";
import AdminContactMessages from "./pages/admin/AdminContactMessages";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";

import NotFound from "./pages/NotFound";
import Playground from "./pages/Playground";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="ict-academy-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes - redirect to dashboard/admin if logged in */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
              <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
              <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />

              {/* Papers - accessible without login (for free papers only) */}
              <Route path="/papers" element={<Papers />} />
              <Route path="/playground" element={<ProtectedRoute><Playground /></ProtectedRoute>} />

              {/* Protected Student Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
              <Route path="/classes/:id" element={<ProtectedRoute><ClassDetail /></ProtectedRoute>} />
              <Route path="/rank-papers" element={<ProtectedRoute><RankPapers /></ProtectedRoute>} />
              <Route path="/rank-papers/:id" element={<ProtectedRoute><RankPaperDetail /></ProtectedRoute>} />
              <Route path="/rank-papers/:id/attempt" element={<ProtectedRoute><RankPaperAttempt /></ProtectedRoute>} />
              <Route path="/rank-papers/:id/results" element={<ProtectedRoute><RankPaperResults /></ProtectedRoute>} />
              <Route path="/rank-papers/:id/leaderboard" element={<ProtectedRoute><RankPaperLeaderboard /></ProtectedRoute>} />
              <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Protected Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute requireModerator><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/moderators" element={<ProtectedRoute requireAdmin><AdminModerators /></ProtectedRoute>} />
              <Route path="/admin/classes" element={<ProtectedRoute requireModerator><AdminClasses /></ProtectedRoute>} />
              <Route path="/admin/classes/:id/content" element={<ProtectedRoute requireModerator><AdminClassContent /></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute requireModerator><AdminPayments /></ProtectedRoute>} />
              <Route path="/admin/coupons" element={<ProtectedRoute requireModerator><AdminCoupons /></ProtectedRoute>} />
              <Route path="/admin/rank-papers" element={<ProtectedRoute requireModerator><AdminRankPapers /></ProtectedRoute>} />
              <Route path="/admin/rank-papers/:paperId/questions" element={<ProtectedRoute requireModerator><AdminRankPaperQuestions /></ProtectedRoute>} />
              <Route path="/admin/rank-papers/:paperId/attempts" element={<ProtectedRoute requireModerator><AdminRankPaperAttempts /></ProtectedRoute>} />
              <Route path="/admin/shop" element={<ProtectedRoute requireModerator><AdminShop /></ProtectedRoute>} />
              <Route path="/admin/papers" element={<ProtectedRoute requireModerator><AdminPapers /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute requireModerator><AdminNotifications /></ProtectedRoute>} />
              <Route path="/admin/bulk-sms" element={<ProtectedRoute requireModerator><AdminBulkSms /></ProtectedRoute>} />
              <Route path="/admin/contact-messages" element={<ProtectedRoute requireModerator><AdminContactMessages /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
