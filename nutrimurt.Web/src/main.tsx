import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { ptBR } from '@clerk/localizations';
import App from './App';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from './components/ProtectedRoute';
import SignInPage from './pages/SignInPage';
import Layout from './components/Layout';

const PatientsPage = lazy(() => import('./features/patients/PatientsPage'));
const QuestionariesPage = lazy(() => import('./features/questionaries/QuestionarriePage'));
const AnswerPage = lazy(() => import('./features/answers/AnswerPage'));
const ViewAnswerPage = lazy(() => import('./features/answers/ViewAnswerPage'));
const PatientSummary = lazy(() => import('./features/patients/PatientSummary'));
const MealPlansPage = lazy(() => import('./features/mealPlans/MealPlansPage'));
const MealPlanForm = lazy(() => import('./features/mealPlans/MealPlanForm'));
const MealPlanView = lazy(() => import('./features/mealPlans/MealPlanView'));

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const router = createBrowserRouter([
  {
    path: "/answer/:urlid",
    element: <AnswerPage />,
  },
  {
    element: <Layout />,
    children: [
      {
        path: "/sign-in",
        element: <SignInPage />,
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
      {
        path: "/mealplans",
        element: <ProtectedRoute><MealPlansPage /></ProtectedRoute>,
      },
      {
        path: "/mealplans/new",
        element: <ProtectedRoute><MealPlanForm /></ProtectedRoute>,
      },
      {
        path: "/mealplans/:id/edit",
        element: <ProtectedRoute><MealPlanForm /></ProtectedRoute>,
      },
      {
        path: "/mealplans/:id",
        element: <ProtectedRoute><MealPlanView /></ProtectedRoute>,
      },
    ],
  },
]);

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} localization={ptBR}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
      <ToastContainer position="top-right" theme="dark" autoClose={3000} />
    </ClerkProvider>
  </StrictMode>
);
