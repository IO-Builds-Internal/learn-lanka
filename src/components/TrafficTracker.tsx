import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function TrafficTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const fetchGeoAndLog = async () => {
      try {
        let geoData = null;
        const cachedGeo = sessionStorage.getItem('visitor_geo');

        if (cachedGeo) {
          geoData = JSON.parse(cachedGeo);
        } else {
          // Fetch real visitor IP and geolocation
          const response = await fetch('https://ipapi.co/json/');
          if (response.ok) {
            const data = await response.json();
            geoData = {
              ip: data.ip,
              country_name: data.country_name || 'Unknown',
              city: data.city || 'Unknown'
            };
            sessionStorage.setItem('visitor_geo', JSON.stringify(geoData));
          }
        }

        const ip = geoData?.ip || '127.0.0.1';
        const country = geoData?.country_name || 'Unknown';
        const city = geoData?.city || 'Unknown';

        // Log the page view
        await supabase.from('traffic_logs' as any).insert({
          ip_address: ip,
          user_id: user?.id || null,
          page_path: location.pathname + location.search,
          activity_type: 'PAGE_VIEW',
          geo_country: country,
          geo_city: city
        });
      } catch (error) {
        console.error('Error logging traffic:', error);
      }
    };

    fetchGeoAndLog();
  }, [location.pathname, user?.id]);

  // Intercept downloads globally
  useEffect(() => {
    const handleGlobalClick = async (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement;
        const downloadLink = target.closest('a[download]') || target.closest('a[href*="/storage/v1/object/public/"]');
        
        if (downloadLink) {
          const href = downloadLink.getAttribute('href') || '';
          const cachedGeo = sessionStorage.getItem('visitor_geo');
          const geoData = cachedGeo ? JSON.parse(cachedGeo) : null;

          const ip = geoData?.ip || '127.0.0.1';
          const country = geoData?.country_name || 'Unknown';
          const city = geoData?.city || 'Unknown';

          // Log the download activity
          await supabase.from('traffic_logs' as any).insert({
            ip_address: ip,
            user_id: user?.id || null,
            page_path: href.split('/').pop() || href,
            activity_type: 'DOWNLOAD',
            geo_country: country,
            geo_city: city
          });
        }
      } catch (error) {
        console.error('Error logging download click:', error);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [user?.id]);

  return null;
}
