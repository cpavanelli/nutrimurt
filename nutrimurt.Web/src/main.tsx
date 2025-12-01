import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import PatientsPage from './features/patients/PatientsPage';
import QuestionariesPage from './features/questionaries/QuestionarriePage';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/patients",
    element: <PatientsPage />,
  },
  {
    path: "/questionaries",
    element: <QuestionariesPage />,
  },
]);

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
