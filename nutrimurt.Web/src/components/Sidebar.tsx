import { NavLink } from 'react-router-dom';
import { SignedIn, UserButton } from '@clerk/clerk-react';
import { Icon, type IconName } from './ui/Icon';

type NavItem = {
  to: string;
  label: string;
  icon: IconName;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'grid' },
  { to: '/patients', label: 'Pacientes', icon: 'users' },
  { to: '/questionaries', label: 'Questionários', icon: 'clipboard' },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-[var(--sidebar-w)] flex-shrink-0 flex-col border-r border-edge-soft bg-surface-panel px-3">
      <div className="border-b border-edge-soft px-3 pb-7 pt-6">
        <div className="font-mono text-[13px] font-bold tracking-[0.12em] text-accent-text">
          NUTRIMURT
        </div>
        <div className="mt-0.5 text-[11px] text-ink-tertiary">Portal do Nutricionista</div>
      </div>

      <SignedIn>
        <nav className="flex flex-1 flex-col gap-0.5 pt-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-accent-dim font-medium text-accent-text'
                    : 'text-ink-secondary hover:bg-white/5',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-accent-text' : 'text-ink-tertiary'}>
                    <Icon name={item.icon} size={16} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-2.5 border-t border-edge-soft px-3 py-4">
          {/* theme toggle slot — wired up in step 6 */}
          <div className="h-7" aria-hidden />
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
      </SignedIn>
    </aside>
  );
}
