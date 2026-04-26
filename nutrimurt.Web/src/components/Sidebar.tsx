import { SignedIn, UserButton } from '@clerk/clerk-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './ui/Icon';

type NavItem = {
  icon: IconName;
  label: string;
  to: string;
};

type SidebarProps = {
  dark: boolean;
  onToggleTheme: () => void;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'grid' },
  { to: '/patients', label: 'Pacientes', icon: 'users' },
  { to: '/questionaries', label: 'Questionarios', icon: 'clipboard' },
];

function ThemeToggle({ dark, onToggleTheme }: SidebarProps) {
  return (
    <button
      type="button"
      onClick={onToggleTheme}
      className="flex w-full items-center gap-2 rounded-full border border-edge-medium bg-surface-elevated px-2 py-1.5 text-left text-[12px] font-medium text-ink-secondary transition hover:border-accent-mid"
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      <span className="relative inline-flex h-4 w-7 shrink-0 rounded-full border border-edge-medium bg-white/10 transition">
        <span
          className={[
            'absolute top-[1px] h-[10px] w-[10px] rounded-full transition-all',
            dark ? 'left-[1px] bg-ink-tertiary' : 'left-[13px] bg-white',
          ].join(' ')}
        />
      </span>
      {dark ? 'Modo escuro' : 'Modo claro'}
    </button>
  );
}

export default function Sidebar({ dark, onToggleTheme }: SidebarProps) {
  const location = useLocation();

  function isActiveItem(item: NavItem) {
    if (item.to === '/') return location.pathname === '/';
    if (item.to === '/patients') {
      return location.pathname === '/patients' || location.pathname.startsWith('/patientSummary/');
    }
    return location.pathname === item.to;
  }

  return (
    <SignedIn>
      <>
        <aside className="hidden h-screen w-[var(--sidebar-w)] shrink-0 flex-col border-r border-edge-soft bg-surface-panel px-3 lg:flex">
          <div className="border-b border-edge-soft px-3 pb-7 pt-6">
            <div className="font-mono text-[13px] font-bold tracking-[0.12em] text-accent-text">
              NUTRIMURT
            </div>
            <div className="mt-0.5 text-[11px] text-ink-tertiary">Portal do Nutricionista</div>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 pt-4">
            {NAV_ITEMS.map((item) => {
              const active = isActiveItem(item);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={[
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    active ? 'bg-accent-dim font-medium text-accent-text' : 'text-ink-secondary hover:bg-white/5',
                  ].join(' ')}
                >
                  <span className={active ? 'text-accent-text' : 'text-ink-tertiary'}>
                    <Icon name={item.icon} size={16} />
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex flex-col gap-2.5 border-t border-edge-soft px-3 py-4">
            <ThemeToggle dark={dark} onToggleTheme={onToggleTheme} />
            <div className="flex items-center gap-2.5">
              <UserButton
                appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }}
                afterSignOutUrl="/sign-in"
              />
              <div className="text-[13px] font-medium">
                Nutricionista
                <div className="text-[11px] font-normal text-ink-tertiary">Admin</div>
              </div>
            </div>
          </div>
        </aside>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-edge-medium bg-surface-panel lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActiveItem(item);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={[
                  'flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] transition-colors',
                  active ? 'text-accent-text' : 'text-ink-tertiary',
                ].join(' ')}
              >
                <Icon name={item.icon} size={18} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={onToggleTheme}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] text-ink-tertiary transition-colors hover:text-ink-primary"
            title={dark ? 'Modo claro' : 'Modo escuro'}
          >
            <Icon name={dark ? 'sun' : 'moon'} size={18} />
            <span className="truncate">{dark ? 'Claro' : 'Escuro'}</span>
          </button>
        </nav>
      </>
    </SignedIn>
  );
}
