import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-base text-ink-primary">
      <Sidebar />
      <main className="flex flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
