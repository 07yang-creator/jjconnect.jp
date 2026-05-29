import type { Metadata } from 'next';
import ToolDetail from '@/src/components/tool-detail';

export const metadata: Metadata = {
  title: 'Mansion Manager — JJConnect',
};

const FEATURES = ['tenant', 'financial', 'maintenance', 'booking', 'announcements', 'analytics'] as const;
const REASONS = ['efficiency', 'experience', 'cost', 'mobile'] as const;

export default function MansionPage() {
  return <ToolDetail toolKey="mansion" featureKeys={FEATURES} reasonKeys={REASONS} />;
}
