import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AdminRoute from "@/components/admin/AdminRoute";
import Index from "./pages/Index";
import News from "./pages/News";
import NewsArticle from "./pages/NewsArticle";
import Events from "./pages/Events";
import Registration from "./pages/Registration";
import Leagues from "./pages/Leagues";
import Programs from "./pages/Programs";
import Bursary from "./pages/Bursary";
import Membership from "./pages/Membership";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import SummerLeague from "./pages/SummerLeague";
import JuniorProgram from "./pages/programs/JuniorProgram";
import JuniorGirls from "./pages/programs/JuniorGirls";
import JuniorBoys from "./pages/programs/JuniorBoys";
import SeniorProgram from "./pages/programs/SeniorProgram";
import MensNationalTeam from "./pages/programs/MensNationalTeam";
import WomensNationalTeam from "./pages/programs/WomensNationalTeam";
import YouthCamps from "./pages/programs/YouthCamps";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminNews from "./pages/admin/AdminNews";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminPages from "./pages/admin/AdminPages";
import AdminSponsors from "./pages/admin/AdminSponsors";
import AdminResetPassword from "./pages/admin/AdminResetPassword";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminImport from "./pages/admin/AdminImport";
import AdminLeagues from "./pages/admin/AdminLeagues";
import AdminLeagueWeek from "./pages/admin/AdminLeagueWeek";
import LeagueStandings from "./pages/LeagueStandings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<NewsArticle />} />
            <Route path="/events" element={<Events />} />
            <Route path="/registration" element={<Registration />} />
            <Route path="/leagues" element={<Leagues />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/junior" element={<JuniorProgram />} />
            <Route path="/programs/junior/girls" element={<JuniorGirls />} />
            <Route path="/programs/junior/boys" element={<JuniorBoys />} />
            <Route path="/programs/senior" element={<SeniorProgram />} />
            <Route path="/programs/senior/mens" element={<MensNationalTeam />} />
            <Route path="/programs/senior/womens" element={<WomensNationalTeam />} />
            <Route path="/programs/youth-camps" element={<YouthCamps />} />
            <Route path="/summer-league" element={<SummerLeague />} />
            <Route path="/bursary" element={<Bursary />} />
            <Route path="/membership" element={<Membership />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/about" element={<About />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/reset-password" element={<AdminResetPassword />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/news" element={<AdminRoute><AdminNews /></AdminRoute>} />
            <Route path="/admin/events" element={<AdminRoute><AdminEvents /></AdminRoute>} />
            <Route path="/admin/gallery" element={<AdminRoute><AdminGallery /></AdminRoute>} />
            <Route path="/admin/pages" element={<AdminRoute><AdminPages /></AdminRoute>} />
            <Route path="/admin/sponsors" element={<AdminRoute><AdminSponsors /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/import" element={<AdminRoute><AdminImport /></AdminRoute>} />
            <Route path="/admin/leagues" element={<AdminRoute><AdminLeagues /></AdminRoute>} />
            <Route path="/admin/leagues/:seasonId/week/:weekNum" element={<AdminRoute><AdminLeagueWeek /></AdminRoute>} />

            {/* Public league standings */}
            <Route path="/leagues/standings/:seasonId" element={<LeagueStandings />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
