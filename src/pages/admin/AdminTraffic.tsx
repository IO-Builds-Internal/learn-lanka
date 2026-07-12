import { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Download, 
  BookOpen, 
  Globe, 
  Activity, 
  UserCheck, 
  MapPin, 
  Clock, 
  ShieldAlert,
  Loader2,
  Calendar,
  Search
} from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TrafficLog {
  id: string;
  ip_address: string;
  user_id: string | null;
  page_path: string;
  activity_type: string;
  geo_country: string;
  geo_city: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
}

const AdminTraffic = () => {
  const [activeTab, setActiveTab] = useState<'realtime' | 'unique-ips' | 'geo'>('realtime');
  const [filterQuery, setFilterQuery] = useState('');

  // Fetch traffic logs from Supabase
  const { data: logs = [], isLoading: logsLoading, error: logsError } = useQuery<TrafficLog[]>({
    queryKey: ['admin-traffic-logs'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('traffic_logs' as any)
          .select('*, profiles:user_id(first_name, last_name, phone)')
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) {
          console.error('Error fetching traffic logs:', error);
          return [];
        }
        return (data || []) as unknown as TrafficLog[];
      } catch (err) {
        console.error('Catch error fetching traffic logs:', err);
        return [];
      }
    },
  });

  // Fetch real counts from other database tables
  const { data: metrics } = useQuery({
    queryKey: ['admin-traffic-metrics'],
    queryFn: async () => {
      try {
        const [
          classesRes,
          enrollmentsRes,
          papersRes
        ] = await Promise.all([
          supabase.from('classes').select('*', { count: 'exact', head: true }),
          supabase.from('class_enrollments').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
          supabase.from('papers').select('*', { count: 'exact', head: true })
        ]);

        return {
          classes: classesRes.count || 0,
          enrollments: enrollmentsRes.count || 0,
          papers: papersRes.count || 0
        };
      } catch (err) {
        console.error('Error fetching traffic metrics:', err);
        return {
          classes: 0,
          enrollments: 0,
          papers: 0
        };
      }
    }
  });

  if (logsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Gathering visitor logs...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculate Aggregated Metrics from logs
  const totalPageViews = logs.filter(l => l.activity_type === 'PAGE_VIEW').length;
  const totalDownloads = logs.filter(l => l.activity_type === 'DOWNLOAD').length;

  // Group by Unique Visitor IPs
  const groupedIpsMap: Record<string, {
    ip: string;
    geo: string;
    city: string;
    totalVisits: number;
    lastActive: string;
    loggedInUser: string | null;
  }> = {};

  logs.forEach(log => {
    const ip = log.ip_address;
    const userName = log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : null;
    
    if (!groupedIpsMap[ip]) {
      groupedIpsMap[ip] = {
        ip,
        geo: log.geo_country,
        city: log.geo_city,
        totalVisits: 1,
        lastActive: log.created_at,
        loggedInUser: userName
      };
    } else {
      groupedIpsMap[ip].totalVisits += 1;
      // If we discover a logged-in user session associated with this IP, link it
      if (userName && !groupedIpsMap[ip].loggedInUser) {
        groupedIpsMap[ip].loggedInUser = userName;
      }
      if (new Date(log.created_at) > new Date(groupedIpsMap[ip].lastActive)) {
        groupedIpsMap[ip].lastActive = log.created_at;
      }
    }
  });

  const uniqueIps = Object.values(groupedIpsMap).sort((a, b) => b.totalVisits - a.totalVisits);

  // Group Geolocation Data
  const geoStatsMap: Record<string, { country: string; count: number; cities: Set<string> }> = {};
  logs.forEach(log => {
    const country = log.geo_country || 'Unknown';
    const city = log.geo_city || 'Unknown';
    if (!geoStatsMap[country]) {
      geoStatsMap[country] = {
        country,
        count: 1,
        cities: new Set([city])
      };
    } else {
      geoStatsMap[country].count += 1;
      geoStatsMap[country].cities.add(city);
    }
  });

  const geoStats = Object.values(geoStatsMap)
    .sort((a, b) => b.count - a.count)
    .map(g => ({ ...g, cityCount: g.cities.size }));

  // Search filtering
  const filteredLogs = logs.filter(log => {
    const q = filterQuery.toLowerCase();
    const userName = log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : '';
    const phone = log.profiles ? log.profiles.phone : '';
    return (
      log.ip_address.includes(q) ||
      log.page_path.toLowerCase().includes(q) ||
      log.geo_country.toLowerCase().includes(q) ||
      log.geo_city.toLowerCase().includes(q) ||
      userName.toLowerCase().includes(q) ||
      phone.includes(q)
    );
  });

  const filteredUniqueIps = uniqueIps.filter(item => {
    const q = filterQuery.toLowerCase();
    return (
      item.ip.includes(q) ||
      item.geo.toLowerCase().includes(q) ||
      item.city.toLowerCase().includes(q) ||
      (item.loggedInUser && item.loggedInUser.toLowerCase().includes(q))
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Traffic & Visitor Activity</h1>
            <p className="text-muted-foreground mt-1">Real-time analysis of site visits, file downloads, and geolocation streams.</p>
          </div>
          <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm border border-border/50 px-3 py-2 rounded-xl text-xs text-muted-foreground shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>Reporting last 200 activity logs</span>
          </div>
        </div>

        {/* Analytics Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Traffic view views count */}
          <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm p-5 shadow-sm shadow-muted/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Logged Page Views</span>
              <Activity className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight">{totalPageViews}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Total page view transitions</p>
            </div>
          </div>

          {/* Real Website Downloads count */}
          <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm p-5 shadow-sm shadow-muted/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Real Downloads</span>
              <Download className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight">{totalDownloads}</p>
              <p className="text-[10px] text-muted-foreground mt-1">From past papers & attachments</p>
            </div>
          </div>

          {/* Database Classes count */}
          <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm p-5 shadow-sm shadow-muted/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Classes Hosted</span>
              <BookOpen className="w-4 h-4 text-violet-500" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight">{metrics?.classes || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Total active subject modules</p>
            </div>
          </div>

          {/* Real Database Enrollments count */}
          <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm p-5 shadow-sm shadow-muted/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Real Enrollments</span>
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight">{metrics?.enrollments || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Students actively scheduled</p>
            </div>
          </div>
        </div>

        {/* Interactive Filtering Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/45 border border-border/50 p-3 rounded-2xl">
          <div className="flex items-center gap-1.5 bg-muted/65 p-1 rounded-xl w-fit">
            <button
              onClick={() => { setActiveTab('realtime'); setFilterQuery(''); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === 'realtime' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Real-Time Feed
            </button>
            <button
              onClick={() => { setActiveTab('unique-ips'); setFilterQuery(''); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === 'unique-ips' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Visitor IPs
            </button>
            <button
              onClick={() => { setActiveTab('geo'); setFilterQuery(''); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === 'geo' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Geographics
            </button>
          </div>

          {activeTab !== 'geo' && (
            <div className="flex items-center gap-2 bg-card border border-border/60 hover:border-border rounded-xl px-3 py-1.5 transition-all w-full md:w-64 max-w-sm">
              <Search className="w-3.5 h-3.5 text-muted-foreground/80 flex-shrink-0" />
              <input
                type="text"
                placeholder={activeTab === 'realtime' ? "Search path, IP, geo or name..." : "Search IP, country or name..."}
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="bg-transparent border-0 outline-none text-xs w-full focus:ring-0 placeholder:text-muted-foreground/60"
              />
            </div>
          )}
        </div>

        {/* ─── Tab Content Views ─── */}
        
        {/* Tab 1: Real-Time Traffic Feed */}
        {activeTab === 'realtime' && (
          <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/40 text-muted-foreground font-semibold">
                    <th className="px-5 py-3">Visitor Identity</th>
                    <th className="px-5 py-3">IP Address</th>
                    <th className="px-5 py-3">Page / Activity</th>
                    <th className="px-5 py-3">Geo-Location</th>
                    <th className="px-5 py-3 text-right">Time Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-muted-foreground">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-35 text-primary" />
                        No real-time logs found matching your filter query.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-muted/15 transition-colors">
                        {/* Visitor name / Anonymous badge */}
                        <td className="px-5 py-3.5">
                          {log.profiles ? (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <div>
                                <p className="font-bold text-foreground">{log.profiles.first_name} {log.profiles.last_name}</p>
                                <p className="text-[10px] text-muted-foreground leading-tight">{log.profiles.phone}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                              <span className="text-muted-foreground font-medium">Anonymous Visitor</span>
                            </div>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="px-5 py-3.5 font-mono text-muted-foreground/90 font-medium">
                          {log.ip_address}
                        </td>

                        {/* Page Path / Activity type badge */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1 max-w-[280px]">
                            <p className="truncate font-semibold text-foreground/90" title={log.page_path}>
                              {log.page_path}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-1.5 py-0 rounded font-bold shadow-sm",
                                log.activity_type === 'PAGE_VIEW' 
                                  ? 'border-blue-500/20 bg-blue-500/5 text-blue-500 dark:text-blue-400' 
                                  : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500 dark:text-emerald-400'
                              )}
                            >
                              {log.activity_type}
                            </Badge>
                          </div>
                        </td>

                        {/* Geo Location */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                            <span className="font-semibold text-foreground/80">{log.geo_city}, {log.geo_country}</span>
                          </div>
                        </td>

                        {/* Logged Date/Time */}
                        <td className="px-5 py-3.5 text-right font-medium text-muted-foreground">
                          <div className="flex items-center justify-end gap-1.5">
                            <Clock className="w-3 h-3 opacity-60 flex-shrink-0" />
                            <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Unique Visitor IPs Table */}
        {activeTab === 'unique-ips' && (
          <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/40 text-muted-foreground font-semibold">
                    <th className="px-5 py-3">IP Address</th>
                    <th className="px-5 py-3">Visitor Identity mapping</th>
                    <th className="px-5 py-3">Geo-Location</th>
                    <th className="px-5 py-3 text-center">Visit count</th>
                    <th className="px-5 py-3 text-right">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredUniqueIps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-35 text-primary" />
                        No unique IP logs match the current query filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUniqueIps.map(item => (
                      <tr key={item.ip} className="hover:bg-muted/15 transition-colors">
                        {/* IP Address */}
                        <td className="px-5 py-3.5 font-mono font-bold text-foreground">
                          {item.ip}
                        </td>

                        {/* Associated Name Badge or Anonymous Count indicator */}
                        <td className="px-5 py-3.5">
                          {item.loggedInUser ? (
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                              <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                                {item.loggedInUser}
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 shadow-sm" />
                              <span className="text-muted-foreground/60 italic font-medium">Anonymous Visitor Session</span>
                            </div>
                          )}
                        </td>

                        {/* Geo Location */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                            <span className="font-semibold text-foreground/80">{item.city}, {item.geo}</span>
                          </div>
                        </td>

                        {/* Visits Count */}
                        <td className="px-5 py-3.5 text-center font-bold text-foreground">
                          <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-lg">
                            {item.totalVisits} visits
                          </span>
                        </td>

                        {/* Last activity time */}
                        <td className="px-5 py-3.5 text-right text-muted-foreground font-medium">
                          {new Date(item.lastActive).toLocaleTimeString()} ({new Date(item.lastActive).toLocaleDateString()})
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Geographic Distribution Statistics */}
        {activeTab === 'geo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
            
            {/* Geo Distribution Table */}
            <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 bg-card/30">
                <h3 className="font-bold text-sm tracking-wide">Countries Distribution</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/40 text-muted-foreground font-semibold">
                      <th className="px-5 py-3">Country</th>
                      <th className="px-5 py-3 text-center">Cities Active</th>
                      <th className="px-5 py-3 text-right">Logged Activity Hits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {geoStats.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-10 text-muted-foreground">
                          No geolocation logs captured.
                        </td>
                      </tr>
                    ) : (
                      geoStats.map(item => (
                        <tr key={item.country} className="hover:bg-muted/15 transition-colors">
                          <td className="px-5 py-4 font-bold text-foreground">
                            {item.country}
                          </td>
                          <td className="px-5 py-4 text-center font-semibold text-muted-foreground">
                            {item.cityCount} unique cities
                          </td>
                          <td className="px-5 py-4 text-right font-bold text-primary">
                            {item.count} hits
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Geographics grid mapping */}
            <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-md p-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Top Geographics Analytics</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Visual representation of visitor source streams</p>
                </div>
                
                <div className="space-y-3.5 py-2">
                  {geoStats.map(item => {
                    const maxHits = geoStats[0]?.count || 1;
                    const pct = (item.count / maxHits) * 100;
                    return (
                      <div key={item.country} className="space-y-1.5 group">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-foreground/80 group-hover:text-primary transition-colors">{item.country}</span>
                          <span className="font-bold text-muted-foreground">{item.count} activity hits</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted/60 border border-border/10 overflow-hidden relative shadow-inner">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 shadow-md shadow-primary/20 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 mt-4 flex items-start gap-2.5 text-muted-foreground text-[10px] bg-muted/30 p-2.5 rounded-xl">
                <Globe className="w-4 h-4 text-primary animate-spin flex-shrink-0 mt-0.5" style={{ animationDuration: '8s' }} />
                <span>Geographic details resolved dynamically. Anonymous and logged user visits are grouped to calculate top active regional statistics.</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminTraffic;
