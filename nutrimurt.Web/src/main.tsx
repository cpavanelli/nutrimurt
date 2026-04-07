import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { ptBR } from '@clerk/localizations';
import App from './App';
import PatientsPage from './features/patients/PatientsPage';
import QuestionariesPage from './features/questionaries/QuestionarriePage';
import AnswerPage from './features/answers/AnswerPage';
import ViewAnswerPage from './features/answers/ViewAnswerPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PatientSummary from './features/patients/PatientSummary';
import ProtectedRoute from './components/ProtectedRoute';
import SignInPage from './pages/SignInPage';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const router = createBrowserRouter([
  {
    path: "/sign-in",
    element: <SignInPage />,
  },
  {
    path: "/answer/:urlid",
    element: <AnswerPage />,
  },
  {
    path: "/",
    element: <ProtectedRoute><App /></ProtectedRoute>,
  },
  {
    path: "/patients",
    element: <ProtectedRoute><PatientsPage /></ProtectedRoute>,
  },
  {
    path: "/questionaries",
    element: <ProtectedRoute><QuestionariesPage /></ProtectedRoute>,
  },
  {
    path: "/viewAnswer/:urlid",
    element: <ProtectedRoute><ViewAnswerPage /></ProtectedRoute>,
  },
  {
    path: "/patientSummary/:patientId",
    element: <ProtectedRoute><PatientSummary /></ProtectedRoute>,
  },
]);

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} localization={ptBR}>
      <RouterProvider router={router} />
      <ToastContainer position="top-right" theme="dark" autoClose={3000} />
    </ClerkProvider>
  </StrictMode>
);

