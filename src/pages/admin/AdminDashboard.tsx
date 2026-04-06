import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, CalendarDays, Image, Heart, Users } from "lucide-react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const [counts, setCounts] = useState({ news: 0, events: 0, gallery: 0, sponsors: 0, users: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const [news, events, gallery, sponsors, users] = await Promise.all([
        supabase.from("news_articles").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("gallery_photos").select("id", { count: "exact", head: true }),
        supabase.from("sponsors").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        news: news.count ?? 0,
        events: events.count ?? 0,
        gallery: gallery.count ?? 0,
        sponsors: sponsors.count ?? 0,
        users: users.count ?? 0,
      });
    };
    fetchCounts();
  }, []);

  const stats = [
    { label: "Registered Users", count: counts.users, icon: Users, path: "/admin/users", color: "text-indigo-500" },
    { label: "News Articles", count: counts.news, icon: Newspaper, path: "/admin/news", color: "text-blue-500" },
    { label: "Events", count: counts.events, icon: CalendarDays, path: "/admin/events", color: "text-green-500" },
    { label: "Gallery Photos", count: counts.gallery, icon: Image, path: "/admin/gallery", color: "text-purple-500" },
    { label: "Sponsors", count: counts.sponsors, icon: Heart, path: "/admin/sponsors", color: "text-pink-500" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the BVA content manager</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map(({ label, count, icon: Icon, path, color }) => (
            <Link key={path} to={path}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon className={`h-5 w-5 ${color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{count}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
