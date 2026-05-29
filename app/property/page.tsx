import type { Metadata } from 'next';
import ToolDetail from '@/src/components/tool-detail';

export const metadata: Metadata = {
  title: 'Property Report — JJConnect',
};

const FEATURES = ['regional', 'custom', 'visualization', 'comparison', 'recommendations', 'realtime'] as const;
const REASONS = ['data', 'models', 'closings', 'time'] as const;

export default function PropertyPage() {
  return <ToolDetail toolKey="property" featureKeys={FEATURES} reasonKeys={REASONS} />;
}
