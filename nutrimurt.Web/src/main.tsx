import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import PatientsPage from './features/patients/PatientsPage';
import QuestionariesPage from './features/questionaries/QuestionarriePage';
import AnswerPage from './features/answers/AnswerPage';
import PatientAnswerPage from './features/answers/PatientAnswerPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PatientSummary from './features/patients/PatientSummary';

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
  {
    path: "/answer/:urlid",
    element: <AnswerPage />,
  },
  {
    path: "/patientAnswer/:urlid",
    element: <PatientAnswerPage />,
  },
  {
    path: "/patientSummary/:patientId",
    element: <PatientSummary />,
  }

]);

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
    <ToastContainer position="top-right" theme="dark" autoClose={3000} />
  </StrictMode>
);
