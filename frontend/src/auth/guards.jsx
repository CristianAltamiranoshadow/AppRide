import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RutaProtegida() {
  const t = localStorage.getItem('token');
  return t ? <Outlet/> : <Navigate to="/login" replace />;
}

export function GuardRol({ permitir = [] }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return permitir.includes(usuario.rol) ? <Outlet/> : <Navigate to="/" replace />;
}
