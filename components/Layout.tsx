"use client";

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';

/**
 * The authenticated shell. Was a react-router `<Layout>` with an `<Outlet />`;
 * now takes `children` and is rendered by `app/(app)/layout.tsx`.
 *
 * The theme is still a `light` class toggled on `<html>` from the client. It
 * has no persistence and starts dark on every load, exactly as before.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark);
  }, [dark]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base text-ink-primary transition-colors">
      <Sidebar dark={dark} onToggleTheme={() => setDark((current) => !current)} />
      <main className="flex flex-1 overflow-auto pb-24 lg:pb-0">{children}</main>
    </div>
  );
}
