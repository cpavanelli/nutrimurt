import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import Header from './Header';

export default function Layout() {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />
      <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-800/20 blur-3xl" />
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
