import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import MobileChat from './routes/MobileChat.tsx';
import './index.css';

// Definir las rutas de la aplicación
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />
  },
  {
    path: '/chat',
    element: <MobileChat />
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
