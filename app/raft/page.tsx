import type { Metadata } from 'next';
import ToolDetail from '@/src/components/tool-detail';

export const metadata: Metadata = {
  title: 'RAFT 2.03 — JJConnect',
};

const FEATURES = ['realtime', 'ai', 'reports', 'analysis', 'alerts', 'multiplatform'] as const;
const REASONS = ['speed', 'cost', 'risk', 'security'] as const;

export default function RaftPage() {
  return <ToolDetail toolKey="raft" featureKeys={FEATURES} reasonKeys={REASONS} />;
}
