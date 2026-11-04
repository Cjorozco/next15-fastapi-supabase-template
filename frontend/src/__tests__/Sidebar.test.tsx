import { render, fireEvent, within, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockPathname = '/projects';
const mockSignOut = vi.fn();

vi.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/shared/context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'ana@example.com' }, signOut: mockSignOut }),
}));

import { Sidebar } from '@/shared/components/layout/Sidebar';
import { setSidebarCollapsed } from '@/shared/lib/useSidebarCollapsed';

const desktop = (container: HTMLElement) => container.querySelector('aside') as HTMLElement;

describe('Sidebar (collapsible)', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => setSidebarCollapsed(false));
    localStorage.clear();
    mockPathname = '/projects';
    mockSignOut.mockReset();
  });

  it('starts expanded, with title, email and text labels', () => {
    const { container } = render(<Sidebar />);
    const aside = desktop(container);

    expect(aside).toHaveAttribute('data-collapsed', 'false');
    expect(within(aside).getByText('Manager')).toBeInTheDocument();
    expect(within(aside).getByText('ana@example.com')).toBeInTheDocument();
    expect(within(aside).getByText('© 2026 Project Manager SaaS')).toBeInTheDocument();
    expect(within(aside).queryByText('PM')).not.toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: 'Recoger menú lateral' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('collapses to icons only and expands again', () => {
    const { container } = render(<Sidebar />);
    const aside = desktop(container);

    fireEvent.click(within(aside).getByRole('button', { name: 'Recoger menú lateral' }));

    expect(aside).toHaveAttribute('data-collapsed', 'true');
    expect(within(aside).queryByText('Manager')).not.toBeInTheDocument();
    expect(within(aside).queryByText('ana@example.com')).not.toBeInTheDocument();
    expect(within(aside).queryByText('© 2026 Project Manager SaaS')).not.toBeInTheDocument();
    // The brand stays: a monogram for sight, the full name for screen readers.
    expect(within(aside).getByText('PM')).toHaveAttribute('aria-hidden', 'true');
    expect(within(aside).getByRole('heading', { level: 1, name: 'Project Manager' })).toBeInTheDocument();
    const toggle = within(aside).getByRole('button', { name: 'Expandir menú lateral' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(aside).toHaveAttribute('data-collapsed', 'false');
    expect(within(aside).getByText('ana@example.com')).toBeInTheDocument();
  });

  it('keeps every link and the sign-out button reachable by name and tooltip when collapsed', () => {
    const { container } = render(<Sidebar />);
    const aside = desktop(container);
    fireEvent.click(within(aside).getByRole('button', { name: 'Recoger menú lateral' }));

    for (const [name, href] of [
      ['Hoy', '/hoy'],
      ['Dashboard', '/dashboard'],
      ['Proyectos', '/projects'],
      ['Esta semana', '/week'],
    ]) {
      const link = within(aside).getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('title', name);
    }
    expect(within(aside).getByRole('link', { name: 'Proyectos' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(within(aside).getByRole('button', { name: 'Cerrar sesión' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('the toggle points at the navigation it controls', () => {
    const { container } = render(<Sidebar />);
    const aside = desktop(container);
    const toggle = within(aside).getByRole('button', { name: 'Recoger menú lateral' });
    expect(aside.querySelector(`#${toggle.getAttribute('aria-controls')}`)).toBe(
      within(aside).getByRole('navigation', { name: 'Principal' })
    );
  });

  it('remembers the choice across reloads and pages', () => {
    const first = render(<Sidebar />);
    fireEvent.click(within(desktop(first.container)).getByRole('button', { name: 'Recoger menú lateral' }));
    expect(localStorage.getItem('sidebar-collapsed')).toBe('1');
    first.unmount();

    // Another page mounts its own Sidebar.
    mockPathname = '/week';
    const second = render(<Sidebar />);
    expect(desktop(second.container)).toHaveAttribute('data-collapsed', 'true');
  });

  it('keeps several mounted sidebars and other tabs in sync', () => {
    const a = render(<Sidebar />);
    const b = render(<Sidebar />);
    fireEvent.click(within(desktop(a.container)).getByRole('button', { name: 'Recoger menú lateral' }));
    expect(desktop(b.container)).toHaveAttribute('data-collapsed', 'true');

    // Another tab expands it again.
    localStorage.setItem('sidebar-collapsed', '0');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'sidebar-collapsed' }));
    });
    expect(desktop(a.container)).toHaveAttribute('data-collapsed', 'false');
    expect(desktop(b.container)).toHaveAttribute('data-collapsed', 'false');
  });

  it('still works when localStorage is not available', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const { container } = render(<Sidebar />);
    fireEvent.click(within(desktop(container)).getByRole('button', { name: 'Recoger menú lateral' }));
    expect(desktop(container)).toHaveAttribute('data-collapsed', 'true');

    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('does not change the mobile bottom navigation', () => {
    const { container } = render(<Sidebar />);
    fireEvent.click(within(desktop(container)).getByRole('button', { name: 'Recoger menú lateral' }));

    const mobile = container.querySelector('nav.md\\:hidden') as HTMLElement;
    expect(mobile).not.toBeNull();
    expect(within(mobile).getByText('Hoy')).toBeVisible();
    expect(within(mobile).getByText('Dashboard')).toBeVisible();
    expect(within(mobile).getByText('Esta semana')).toBeVisible();
  });
});

describe('Sidebar toggle placement', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => setSidebarCollapsed(false));
    localStorage.clear();
  });

  it('sits on the sidebar edge, outside the title row, so it cannot cover the title', () => {
    const { container } = render(<Sidebar />);
    const aside = desktop(container);
    const toggle = within(aside).getByRole('button', { name: 'Recoger menú lateral' });
    const title = within(aside).getByRole('heading', { level: 1 });

    // Positioned against the aside, and not inside the block that holds the title.
    expect(aside.className).toContain('relative');
    expect(toggle.className).toContain('absolute');
    // In dark mode the sidebar border is nearly invisible, so the button needs its own.
    expect(toggle.className).toContain('dark:border-muted-foreground/40');
    expect(toggle.parentElement).toBe(aside);
    expect(title.parentElement?.contains(toggle)).toBe(false);
  });

  it('keeps the same toggle button in both states (only its label and icon change)', () => {
    const { container } = render(<Sidebar />);
    const aside = desktop(container);
    const before = within(aside).getByRole('button', { name: 'Recoger menú lateral' });
    fireEvent.click(before);
    const after = within(aside).getByRole('button', { name: 'Expandir menú lateral' });
    expect(after.parentElement).toBe(aside);
    expect(after.className).toBe(before.className);
  });
});
