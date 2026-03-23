import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettings {
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  login_bg_url: string | null;
  contact_phone: string;
  contact_email: string;
  // Section feature flags (default true = enabled)
  section_classes: boolean;
  section_rank_papers: boolean;
  section_papers: boolean;
  section_shop: boolean;
  section_playground: boolean;
  section_notifications: boolean;
}

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await (supabase as any)
        .from('site_settings')
        .select('key, value');

      if (error) throw error;

      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });

      const flag = (key: string) => map[key] !== 'false'; // default true unless explicitly 'false'
      return {
        site_name: map['site_name'] || 'A/L ICT',
        logo_url: map['logo_url'] || null,
        favicon_url: map['favicon_url'] || null,
        login_bg_url: map['login_bg_url'] || null,
        contact_phone: map['contact_phone'] || '',
        contact_email: map['contact_email'] || '',
        section_classes: flag('section_classes'),
        section_rank_papers: flag('section_rank_papers'),
        section_papers: flag('section_papers'),
        section_shop: flag('section_shop'),
        section_playground: flag('section_playground'),
        section_notifications: flag('section_notifications'),
      };
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};
