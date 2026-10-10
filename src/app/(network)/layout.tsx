import { NetworkExplorer } from '@/components/explore/NetworkExplorer';
import { graph } from '@/lib/data';
import { computeLayout } from '@/lib/layout';

// Computed once, at build time. The browser receives the positions and never
// runs the force simulation itself.
const layout = computeLayout(graph);

/**
 * The network is the home page. The explorer lives in this layout so moving
 * between the map (/) and the table (/table) keeps search, filters, the open
 * entry, the arrangement and the path.
 */
export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NetworkExplorer data={graph} layout={layout} />
      {children}
    </>
  );
}
