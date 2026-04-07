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
import AdminImageManager from "./pages/admin/AdminImageManager";
import AdminPages from "./pages/admin/AdminPages";
import AdminSponsors from "./pages/admin/AdminSponsors";
import AdminResetPassword from "./pages/admin/AdminResetPassword";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminImport from "./pages/admin/AdminImport";
import AdminLeagues from "./pages/admin/AdminLeagues";
import AdminLeagueWeek from "./pages/admin/AdminLeagueWeek";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSeasons from "./pages/admin/AdminSeasons";
import AdminEventCategories from "./pages/admin/AdminEventCategories";
import AdminGalleryCategories from "./pages/admin/AdminGalleryCategories";
import AdminEventLocations from "./pages/admin/AdminEventLocations";
import InlineEditManager from "@/components/admin/InlineEditManager";
import InlineEditToolbar from "@/components/admin/InlineEditToolbar";
import { AdminEditModeProvider } from "@/contexts/AdminEditModeContext";
import MemberRegistration from "./pages/MemberRegistration";
import ProfileDashboard from "./pages/ProfileDashboard";
import PlayerSearch from "./pages/PlayerSearch";
import LeagueStandings from "./pages/LeagueStandings";
// About sub-pages
import Mission from "./pages/about/Mission";
import Executives from "./pages/about/Executives";
import GoverningBodies from "./pages/about/GoverningBodies";
import AnnualReports from "./pages/about/AnnualReports";
import AntiDoping from "./pages/about/AntiDoping";
// Bursary sub-pages
import AdoptAnAthlete from "./pages/bursary/AdoptAnAthlete";
import YouthBursaries from "./pages/bursary/YouthBursaries";
// Programs sub-pages
import CoachingProgram from "./pages/programs/CoachingProgram";
import RefereeProgram from "./pages/programs/RefereeProgram";
// Leagues sub-pages
import WinterLeague from "./pages/leagues/WinterLeague";
import SpringLeague from "./pages/leagues/SpringLeague";
import BeachTournaments from "./pages/leagues/BeachTournaments";
import BermudaOpen from "./pages/leagues/BermudaOpen";
import CorporateTournament from "./pages/leagues/CorporateTournament";
import NatWestIslandGames from "./pages/leagues/NatWestIslandGames";
import LeagueRules from "./pages/leagues/LeagueRules";
// Gallery sub-pages
import History from "./pages/gallery/History";
import Videos from "./pages/gallery/Videos";
import SocialMedia from "./pages/gallery/SocialMedia";
// Registration sub-pages
import WinterLeagueReg from "./pages/registration/WinterLeagueReg";
import BeachRegistration from "./pages/registration/BeachRegistration";
// Coach portal
import CoachRoute from "@/components/coach/CoachRoute";
import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachPlayers from "./pages/coach/CoachPlayers";
import CoachTeams from "./pages/coach/CoachTeams";
import CoachEmail from "./pages/coach/CoachEmail";
import CoachEmailHistory from "./pages/coach/CoachEmailHistory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AdminEditModeProvider>
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
            <Route path="/admin/news" element={<AdminRoute requiredPermissions={["manage_news"]}><AdminNews /></AdminRoute>} />
            <Route path="/admin/events" element={<AdminRoute requiredPermissions={["manage_events"]}><AdminEvents /></AdminRoute>} />
            <Route path="/admin/gallery" element={<AdminRoute requiredPermissions={["manage_gallery"]}><AdminGallery /></AdminRoute>} />
            <Route path="/admin/images" element={<AdminRoute requiredPermissions={["manage_images", "manage_pages"]}><AdminImageManager /></AdminRoute>} />
            <Route path="/admin/pages" element={<AdminRoute requiredPermissions={["manage_pages"]}><AdminPages /></AdminRoute>} />
            <Route path="/admin/sponsors" element={<AdminRoute requiredPermissions={["manage_sponsors"]}><AdminSponsors /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute requiredPermissions={["manage_settings"]}><AdminSettings /></AdminRoute>} />
            <Route path="/admin/import" element={<AdminRoute requiredPermissions={["manage_import"]}><AdminImport /></AdminRoute>} />
            <Route path="/admin/leagues" element={<AdminRoute allowedRoles={["admin", "league_director"]} requiredPermissions={["manage_leagues"]}><AdminLeagues /></AdminRoute>} />
            <Route path="/admin/leagues/:seasonId/week/:weekNum" element={<AdminRoute allowedRoles={["admin", "league_director"]} requiredPermissions={["manage_leagues"]}><AdminLeagueWeek /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute requiredPermissions={["manage_users"]}><AdminUsers /></AdminRoute>} />
            <Route path="/admin/seasons" element={<AdminRoute requiredPermissions={["manage_leagues"]}><AdminSeasons /></AdminRoute>} />
            <Route path="/admin/event-categories" element={<AdminRoute requiredPermissions={["manage_events"]}><AdminEventCategories /></AdminRoute>} />
            <Route path="/admin/gallery-categories" element={<AdminRoute requiredPermissions={["manage_gallery"]}><AdminGalleryCategories /></AdminRoute>} />
            <Route path="/admin/event-locations" element={<AdminRoute requiredPermissions={["manage_events"]}><AdminEventLocations /></AdminRoute>} />

            {/* About sub-pages */}
            <Route path="/about/mission" element={<Mission />} />
            <Route path="/about/executives" element={<Executives />} />
            <Route path="/about/governing-bodies" element={<GoverningBodies />} />
            <Route path="/about/annual-reports" element={<AnnualReports />} />
            <Route path="/about/anti-doping" element={<AntiDoping />} />
            {/* Bursary sub-pages */}
            <Route path="/bursary/adopt-an-athlete" element={<AdoptAnAthlete />} />
            <Route path="/bursary/youth-bursaries" element={<YouthBursaries />} />
            {/* Programs sub-pages */}
            <Route path="/programs/coaching" element={<CoachingProgram />} />
            <Route path="/programs/referee" element={<RefereeProgram />} />
            {/* Leagues sub-pages */}
            <Route path="/leagues/winter" element={<WinterLeague />} />
            <Route path="/leagues/spring" element={<SpringLeague />} />
            <Route path="/leagues/beach-tournaments" element={<BeachTournaments />} />
            <Route path="/leagues/bermuda-open" element={<BermudaOpen />} />
            <Route path="/leagues/corporate" element={<CorporateTournament />} />
            <Route path="/leagues/island-games" element={<NatWestIslandGames />} />
            <Route path="/leagues/rules" element={<LeagueRules />} />
            {/* Gallery sub-pages */}
            <Route path="/gallery/history" element={<History />} />
            <Route path="/gallery/videos" element={<Videos />} />
            <Route path="/gallery/social" element={<SocialMedia />} />
            {/* Registration sub-pages */}
            <Route path="/registration/winter" element={<WinterLeagueReg />} />
            <Route path="/registration/beach" element={<BeachRegistration />} />
            {/* Public league standings */}
            <Route path="/leagues/standings/:seasonId" element={<LeagueStandings />} />

            <Route path="/member-registration" element={<MemberRegistration />} />
            <Route path="/profile" element={<ProfileDashboard />} />
            <Route path="/players" element={<PlayerSearch />} />

            {/* Coach portal */}
            <Route path="/coach" element={<CoachRoute><CoachDashboard /></CoachRoute>} />
            <Route path="/coach/players" element={<CoachRoute><CoachPlayers /></CoachRoute>} />
            <Route path="/coach/teams" element={<CoachRoute><CoachTeams /></CoachRoute>} />
            <Route path="/coach/email" element={<CoachRoute><CoachEmail /></CoachRoute>} />
            <Route path="/coach/email-history" element={<CoachRoute><CoachEmailHistory /></CoachRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <InlineEditManager />
          <InlineEditToolbar />
        </AdminEditModeProvider>
      </AuthProvider>
    </BrowserRouter>
      </TooltipProvider>
  </QueryClientProvider>
);

export default App;
