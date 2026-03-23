import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettings {
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  login_bg_url: string | null;
  contact_phone: string;
  contact_email: string;
  // Section feature flags — false = totally disabled (FeatureGate blocks access)
  section_classes: boolean;
  section_rank_papers: boolean;
  section_papers: boolean;
  section_shop: boolean;
  section_playground: boolean;
  section_notifications: boolean;
  section_paper_generator: boolean;
  // Nav hidden flags — true = hidden from nav bar (but page still accessible)
  nav_hidden_classes: boolean;
  nav_hidden_rank_papers: boolean;
  nav_hidden_papers: boolean;
  nav_hidden_shop: boolean;
  nav_hidden_playground: boolean;
  nav_hidden_paper_generator: boolean;
  // Nav order: array of item keys
  nav_order: string[] | null;
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
      const hidden = (key: string) => map[key] === 'true'; // default false unless explicitly 'true'
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
        section_paper_generator: flag('section_paper_generator'),
        nav_hidden_classes: hidden('nav_hidden_classes'),
        nav_hidden_rank_papers: hidden('nav_hidden_rank_papers'),
        nav_hidden_papers: hidden('nav_hidden_papers'),
        nav_hidden_shop: hidden('nav_hidden_shop'),
        nav_hidden_playground: hidden('nav_hidden_playground'),
        nav_hidden_paper_generator: hidden('nav_hidden_paper_generator'),
        nav_order: map['nav_order'] ? (() => { try { return JSON.parse(map['nav_order']); } catch(_) { return null; } })() : null,
      };
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
};
