import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Courses from "./pages/Courses";
import Events from "./pages/Events";
import Performance from "./pages/Performance";
import Team from "./pages/Team";
import Admin from "./pages/Admin";
import AgencyManagement from "./pages/AgencyManagement";
import CourseBuilder from "./pages/CourseBuilder";
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
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId" element={<Courses />} />
          <Route path="/admin/courses/:courseId" element={<CourseBuilder />} />
          <Route path="/events" element={<Events />} />
          <Route path="/leaderboard" element={<Performance />} />
          <Route path="/team" element={<Team />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/agency" element={<AgencyManagement />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
