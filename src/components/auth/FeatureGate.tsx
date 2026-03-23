import { Navigate } from 'react-router-dom';
import { useSiteSettings, SiteSettings } from '@/hooks/useSiteSettings';

interface FeatureGateProps {
  flag: keyof SiteSettings;
  children: React.ReactNode;
}

const FeatureGate = ({ flag, children }: FeatureGateProps) => {
  const { data: settings, isLoading } = useSiteSettings();

  // While loading, render children (avoid flash redirect)
  if (isLoading) return <>{children}</>;

  if (settings?.[flag] === false) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default FeatureGate;
