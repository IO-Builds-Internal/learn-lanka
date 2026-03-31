import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import FeatureGate from "@/components/auth/FeatureGate";
import PublicOnlyRoute from "@/components/auth/PublicOnlyRoute";
import { CartProvider } from "@/hooks/useCart";

// Public Pages
import HomePage from "./pages/Home";
import SubjectHome from "./pages/SubjectHome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";

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
import PaperGenerator from "./pages/PaperGenerator";
import MyOrders from "./pages/MyOrders";
import Playground from "./pages/Playground";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherEnrollments from "./pages/teacher/TeacherEnrollments";
import TeacherPayments from "./pages/teacher/TeacherPayments";
import TeacherPapers from "./pages/teacher/TeacherPapers";
import TeacherSyllabus from "./pages/teacher/TeacherSyllabus";
import TeacherQuestionBank from "./pages/teacher/TeacherQuestionBank";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminModerators from "./pages/admin/AdminModerators";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminClassContent from "./pages/admin/AdminClassContent";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettingsBranding from "./pages/admin/settings/AdminSettingsBranding";
import AdminSettingsFeatures from "./pages/admin/settings/AdminSettingsFeatures";
import AdminSettingsContact from "./pages/admin/settings/AdminSettingsContact";
import AdminSettingsPaperTemplate from "./pages/admin/settings/AdminSettingsPaperTemplate";
import AdminSettingsBank from "./pages/admin/settings/AdminSettingsBank";
import AdminSettingsSms from "./pages/admin/settings/AdminSettingsSms";
import AdminSettingsBackup from "./pages/admin/settings/AdminSettingsBackup";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminRankPapers from "./pages/admin/AdminRankPapers";
import AdminRankPaperQuestions from "./pages/admin/AdminRankPaperQuestions";
import AdminRankPaperAttempts from "./pages/admin/AdminRankPaperAttempts";
import AdminRankPaperAttemptsIndex from "./pages/admin/AdminRankPaperAttemptsIndex";
import AdminShop from "./pages/admin/AdminShop";
import AdminPapers from "./pages/admin/AdminPapers";
import AdminBulkSms from "./pages/admin/AdminBulkSms";
import AdminContactMessages from "./pages/admin/AdminContactMessages";
import AdminSyllabus from "./pages/admin/AdminSyllabus";
import AdminSubjects from "./pages/admin/AdminSubjects";
import AdminClassApprovals from "./pages/admin/AdminClassApprovals";
import AdminQuestionBank from "./pages/admin/AdminQuestionBank";
import AdminOtpLogs from "./pages/admin/AdminOtpLogs";
import AdminPaperCrop from "./pages/admin/AdminPaperCrop";
import AdminAnswerAccessPayments from "./pages/admin/AdminAnswerAccessPayments";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminPrices from "./pages/admin/AdminPrices";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="al-student-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Public Home */}
                <Route path="/" element={<HomePage />} />

                {/* Auth Routes */}
                <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />

                {/* Papers - accessible without login */}
                <Route path="/papers" element={<FeatureGate flag="section_papers"><Papers /></FeatureGate>} />
                <Route path="/playground" element={<ProtectedRoute><FeatureGate flag="section_playground"><Playground /></FeatureGate></ProtectedRoute>} />

                {/* Protected Student Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/classes" element={<ProtectedRoute><FeatureGate flag="section_classes"><Classes /></FeatureGate></ProtectedRoute>} />
                <Route path="/classes/:id" element={<ProtectedRoute><FeatureGate flag="section_classes"><ClassDetail /></FeatureGate></ProtectedRoute>} />
                <Route path="/rank-papers" element={<ProtectedRoute><FeatureGate flag="section_rank_papers"><RankPapers /></FeatureGate></ProtectedRoute>} />
                <Route path="/rank-papers/:id" element={<ProtectedRoute><FeatureGate flag="section_rank_papers"><RankPaperDetail /></FeatureGate></ProtectedRoute>} />
                <Route path="/rank-papers/:id/attempt" element={<ProtectedRoute><FeatureGate flag="section_rank_papers"><RankPaperAttempt /></FeatureGate></ProtectedRoute>} />
                <Route path="/rank-papers/:id/results" element={<ProtectedRoute><FeatureGate flag="section_rank_papers"><RankPaperResults /></FeatureGate></ProtectedRoute>} />
                <Route path="/rank-papers/:id/leaderboard" element={<ProtectedRoute><FeatureGate flag="section_rank_papers"><RankPaperLeaderboard /></FeatureGate></ProtectedRoute>} />
                <Route path="/shop" element={<ProtectedRoute><FeatureGate flag="section_shop"><Shop /></FeatureGate></ProtectedRoute>} />
                <Route path="/checkout" element={<ProtectedRoute><FeatureGate flag="section_shop"><Checkout /></FeatureGate></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><FeatureGate flag="section_notifications"><Notifications /></FeatureGate></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/paper-generator" element={<ProtectedRoute><PaperGenerator /></ProtectedRoute>} />
                <Route path="/my-orders" element={<ProtectedRoute><FeatureGate flag="section_shop"><MyOrders /></FeatureGate></ProtectedRoute>} />

                {/* Teacher Routes */}
                <Route path="/teacher" element={<ProtectedRoute requireTeacher><TeacherDashboard /></ProtectedRoute>} />
                <Route path="/teacher/classes" element={<ProtectedRoute requireTeacher><TeacherClasses /></ProtectedRoute>} />
                <Route path="/teacher/enrollments" element={<ProtectedRoute requireTeacher><TeacherEnrollments /></ProtectedRoute>} />
                <Route path="/teacher/payments" element={<ProtectedRoute requireTeacher><TeacherPayments /></ProtectedRoute>} />
                <Route path="/teacher/papers" element={<ProtectedRoute requireTeacher><TeacherPapers /></ProtectedRoute>} />
                <Route path="/teacher/syllabus" element={<ProtectedRoute requireTeacher><TeacherSyllabus /></ProtectedRoute>} />
                <Route path="/teacher/question-bank" element={<ProtectedRoute requireTeacher><TeacherQuestionBank /></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute requireModerator><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/teachers" element={<ProtectedRoute requireAdmin><AdminTeachers /></ProtectedRoute>} />
                <Route path="/admin/moderators" element={<ProtectedRoute requireAdmin><AdminModerators /></ProtectedRoute>} />
                <Route path="/admin/classes" element={<ProtectedRoute requireModerator><AdminClasses /></ProtectedRoute>} />
                <Route path="/admin/classes/:id/content" element={<ProtectedRoute requireTeacher><AdminClassContent /></ProtectedRoute>} />
                <Route path="/admin/payments" element={<ProtectedRoute requireModerator><AdminPayments /></ProtectedRoute>} />
                <Route path="/admin/coupons" element={<ProtectedRoute requireModerator><AdminCoupons /></ProtectedRoute>} />
                <Route path="/admin/rank-papers" element={<ProtectedRoute requireModerator><AdminRankPapers /></ProtectedRoute>} />
                <Route path="/admin/rank-papers/:paperId/questions" element={<ProtectedRoute requireModerator><AdminRankPaperQuestions /></ProtectedRoute>} />
                <Route path="/admin/rank-paper-attempts" element={<ProtectedRoute requireModerator><AdminRankPaperAttemptsIndex /></ProtectedRoute>} />
                <Route path="/admin/rank-papers/:paperId/attempts" element={<ProtectedRoute requireModerator><AdminRankPaperAttempts /></ProtectedRoute>} />
                <Route path="/admin/shop" element={<ProtectedRoute requireModerator><AdminShop /></ProtectedRoute>} />
                <Route path="/admin/papers" element={<ProtectedRoute requireTeacher><AdminPapers /></ProtectedRoute>} />
                <Route path="/admin/notifications" element={<ProtectedRoute requireModerator><AdminNotifications /></ProtectedRoute>} />
                <Route path="/admin/bulk-sms" element={<ProtectedRoute requireModerator><AdminBulkSms /></ProtectedRoute>} />
                <Route path="/admin/contact-messages" element={<ProtectedRoute requireModerator><AdminContactMessages /></ProtectedRoute>} />
                <Route path="/admin/syllabus" element={<ProtectedRoute requireTeacher><AdminSyllabus /></ProtectedRoute>} />
                <Route path="/admin/subjects" element={<ProtectedRoute requireAdmin><AdminSubjects /></ProtectedRoute>} />
                <Route path="/admin/class-approvals" element={<ProtectedRoute requireAdmin><AdminClassApprovals /></ProtectedRoute>} />
                <Route path="/admin/question-bank" element={<ProtectedRoute requireTeacher><AdminQuestionBank /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<Navigate to="/admin/settings/branding" replace />} />
                <Route path="/admin/settings/branding" element={<ProtectedRoute requireAdmin><AdminSettingsBranding /></ProtectedRoute>} />
                <Route path="/admin/settings/features" element={<ProtectedRoute requireAdmin><AdminSettingsFeatures /></ProtectedRoute>} />
                <Route path="/admin/settings/contact" element={<ProtectedRoute requireAdmin><AdminSettingsContact /></ProtectedRoute>} />
                <Route path="/admin/settings/paper-template" element={<ProtectedRoute requireAdmin><AdminSettingsPaperTemplate /></ProtectedRoute>} />
                <Route path="/admin/settings/bank" element={<ProtectedRoute requireAdmin><AdminSettingsBank /></ProtectedRoute>} />
                <Route path="/admin/settings/sms" element={<ProtectedRoute requireAdmin><AdminSettingsSms /></ProtectedRoute>} />
                <Route path="/admin/settings/backup" element={<ProtectedRoute requireAdmin><AdminSettingsBackup /></ProtectedRoute>} />
                <Route path="/admin/answer-access-payments" element={<ProtectedRoute requireModerator><AdminAnswerAccessPayments /></ProtectedRoute>} />
                <Route path="/admin/orders" element={<ProtectedRoute requireModerator><AdminOrders /></ProtectedRoute>} />
                <Route path="/admin/prices" element={<ProtectedRoute requireModerator><AdminPrices /></ProtectedRoute>} />
                <Route path="/admin/otp-logs" element={<ProtectedRoute requireAdmin><AdminOtpLogs /></ProtectedRoute>} />
                <Route path="/admin/paper-crop" element={<ProtectedRoute requireModerator><AdminPaperCrop /></ProtectedRoute>} />

                {/* Subject pages (must be last before catch-all) */}
                <Route path="/:slug" element={<SubjectHome />} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
