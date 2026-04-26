import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';

export default function Layout() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark);
  }, [dark]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base text-ink-primary transition-colors">
      <Sidebar dark={dark} onToggleTheme={() => setDark((current) => !current)} />
      <main className="flex flex-1 overflow-auto pb-24 lg:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
