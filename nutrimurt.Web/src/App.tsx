import './App.css'
import RecentlyAnswered from '../src/features/dashboard/RecentlyAnswered';
import RecentPatients from './features/dashboard/RecentPatients';
import RecentlyAnsweredDiaries from './features/dashboard/RecentlyAnsweredDiaries';

export default function App() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col px-6 pb-16 pt-10 lg:px-10">
      <section className="grid gap-6 py-8">
        <RecentPatients />
      </section>
      <section className="grid flex-1 gap-6 py-8 lg:grid-cols-2">
        <RecentlyAnswered />
        <RecentlyAnsweredDiaries />
      </section>
    </div>
  );
}
