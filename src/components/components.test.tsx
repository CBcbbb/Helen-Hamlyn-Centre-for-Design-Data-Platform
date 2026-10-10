import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { graph, getNode } from '@/lib/data';
import type { GraphNode } from '@/lib/types';
import { EntityFields } from './EntityFields';
import { EntityPage } from './EntityPage';
import { NetworkExplorer } from './explore/NetworkExplorer';
import { KeyboardHelp } from './explore/KeyboardHelp';
import { TypeMark } from './TypeMark';

type Nav = { pathname: string; push: ReturnType<typeof vi.fn> };
const nav = (globalThis as unknown as { __nav: Nav }).__nav;

/** Control the (min-width) media query used for the wide layout. */
function setWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('min-width') ? wide : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function node(id: string): GraphNode {
  const n = getNode(id);
  if (!n) throw new Error(id);
  return n;
}

beforeEach(() => {
  nav.pathname = '/explore';
  nav.push.mockReset();
  setWide(true);
});

describe('EntityFields', () => {
  it('renders recorded fields and nothing for missing ones (no "/" placeholders)', () => {
    // M001 has templates "/" in the spreadsheet, which the build treats as empty.
    render(<EntityFields node={node('M001')} />);
    expect(screen.getByRole('heading', { name: 'Step by step' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByRole('heading', { name: 'Templates' })).not.toBeInTheDocument();
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('turns URLs in text into links', () => {
    render(<EntityFields node={node('M001')} />);
    expect(screen.getByRole('link', { name: /journals\.sagepub\.com/ })).toHaveAttribute(
      'href',
      'https://journals.sagepub.com/doi/abs/10.1518/106480407X255233',
    );
  });

  it('uses the heading level it is given', () => {
    render(<EntityFields node={node('PR004')} headingLevel={3} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Legacy and impact' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });
});

describe('EntityPage', () => {
  it('has one h1, a summary of connections, and connections as links', () => {
    render(<EntityPage node={node('PR004')} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Connected to 4 methods and 3 people.')).toBeInTheDocument();
    const connections = screen.getByRole('complementary', { name: 'Connections' });
    expect(within(connections).getByRole('link', { name: 'Personas' })).toHaveAttribute('href', '/methods/personas');
    expect(within(connections).getByRole('link', { name: 'Hua Dong' })).toHaveAttribute('href', '/people/hua-dong');
  });

  it('marks the current page in the breadcrumb', () => {
    render(<EntityPage node={node('P010')} />);
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByText('Hua Dong')).toHaveAttribute('aria-current', 'page');
  });
});

describe('TypeMark', () => {
  it('is hidden from assistive tech unless labelled', () => {
    const { container, rerender } = render(<TypeMark type="Projects" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<TypeMark type="Projects" label="Project" />);
    expect(screen.getByRole('img', { name: 'Project' })).toBeInTheDocument();
  });
});

describe('KeyboardHelp', () => {
  it('renders nothing when closed', () => {
    render(<KeyboardHelp open={false} onClose={() => {}} />);
    expect(screen.queryByRole('heading', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();
  });

  it('is a labelled modal dialog that focuses its close button and closes on Escape', async () => {
    const onClose = vi.fn();
    render(<KeyboardHelp open onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close keyboard shortcuts' })).toHaveFocus();
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the element that opened it', () => {
    function Harness({ open }: { open: boolean }) {
      return (
        <>
          <button type="button">Opener</button>
          <KeyboardHelp open={open} onClose={() => {}} />
        </>
      );
    }
    const { rerender } = render(<Harness open={false} />);
    screen.getByRole('button', { name: 'Opener' }).focus();
    rerender(<Harness open />);
    expect(screen.getByRole('button', { name: 'Close keyboard shortcuts' })).toHaveFocus();
    rerender(<Harness open={false} />);
    expect(screen.getByRole('button', { name: 'Opener' })).toHaveFocus();
  });

  it('closes when the backdrop is clicked but not when the content is', () => {
    const onClose = vi.fn();
    render(<KeyboardHelp open onClose={onClose} />);
    fireEvent.click(screen.getByText('Go to search'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('NetworkExplorer', () => {
  afterEach(() => vi.useRealTimers());

  it('renders the map with one entry per node and a single tab stop', () => {
    const { container } = render(<NetworkExplorer data={graph} />);
    const entries = container.querySelectorAll('.graph-node');
    expect(entries).toHaveLength(graph.nodes.length);
    expect(container.querySelectorAll('.graph-node[tabindex="0"]')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'Network map' })).toBeInTheDocument();
  });

  it('shows a visible result count and announces it after typing stops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<NetworkExplorer data={graph} />);
    await user.type(screen.getByRole('searchbox'), 'inclusive');
    expect(screen.getByText('13 entries match “inclusive”.', { selector: '#search-status' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('status')).toHaveTextContent('13 entries match “inclusive”.');
  });

  it('announces zero results instead of staying silent', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<NetworkExplorer data={graph} />);
    await user.type(screen.getByRole('searchbox'), 'zzzz');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('status')).toHaveTextContent('No entries match “zzzz”.');
  });

  it('filters are real checkboxes, and toggling one is announced', async () => {
    const user = userEvent.setup();
    const { container } = render(<NetworkExplorer data={graph} />);
    const partners = screen.getByRole('checkbox', { name: /Partners/ });
    expect(partners).toBeChecked();
    await user.click(partners);
    expect(partners).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('Partners hidden. 39 of 48 entries shown.');
    expect(container.querySelectorAll('.graph-node')).toHaveLength(39);
  });

  it('wide screens: details open as a non-modal complementary panel; Escape closes and restores focus', async () => {
    const user = userEvent.setup();
    const { container } = render(<NetworkExplorer data={graph} />);
    const entry = container.querySelector<SVGGElement>('[data-id="PR004"]')!;
    entry.focus();
    await user.keyboard('{Enter}');
    const panel = screen.getByRole('complementary', { name: 'Design Bugs Out' });
    expect(panel).not.toHaveAttribute('aria-modal');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: 'Design Bugs Out' })).not.toBeInTheDocument();
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(entry).toHaveFocus();
  });

  it('narrow screens: details open as a modal dialog', async () => {
    setWide(false);
    const user = userEvent.setup();
    nav.pathname = '/explore/table';
    render(<NetworkExplorer data={graph} />);
    await user.click(screen.getByRole('button', { name: 'PACES' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('heading', { level: 2, name: 'PACES' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('arrow keys move focus between map entries', async () => {
    const user = userEvent.setup();
    const { container } = render(<NetworkExplorer data={graph} />);
    const first = container.querySelector<SVGGElement>('.graph-node[tabindex="0"]')!;
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).not.toBe(first);
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/person/);
    expect(container.querySelectorAll('.graph-node[tabindex="0"]')).toHaveLength(1);
  });

  it('table view: one table per type with captions and row headers', () => {
    nav.pathname = '/explore/table';
    render(<NetworkExplorer data={graph} />);
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(4);
    expect(within(tables[0]).getAllByRole('rowheader')).toHaveLength(17);
    expect(tables[0]).toHaveAccessibleName(/Projects/);
  });

  it('Ctrl/Cmd+E switches view and announces it', async () => {
    const user = userEvent.setup();
    render(<NetworkExplorer data={graph} />);
    await user.keyboard('{Control>}e{/Control}');
    expect(nav.push).toHaveBeenCalledWith('/explore/table', { scroll: false });
    expect(screen.getByRole('status')).toHaveTextContent('Showing the table view');
  });

  it('Ctrl/Cmd+K focuses search; ? opens shortcuts but not while typing', async () => {
    const user = userEvent.setup();
    render(<NetworkExplorer data={graph} />);
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('searchbox')).toHaveFocus();
    await user.keyboard('?');
    expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('?');
    screen.getByRole('searchbox').blur();
    await user.keyboard('?');
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });
});
