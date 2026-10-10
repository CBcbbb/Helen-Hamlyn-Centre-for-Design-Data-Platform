import { NetworkExplorer } from '@/components/explore/NetworkExplorer';
import { graph } from '@/lib/data';

/**
 * The explorer lives in the layout so moving between /explore (map) and
 * /explore/table keeps search, filters and the open entry.
 */
export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NetworkExplorer data={graph} />
      {children}
    </>
  );
}
