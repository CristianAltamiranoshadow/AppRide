import { createContext, useContext, useMemo, useState } from 'react';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  });

  const login = ({ usuario, token }) => {
    localStorage.setItem('usuario', JSON.stringify(usuario));
    localStorage.setItem('token', token);
    setUsuario(usuario);
  };

  const logout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    setUsuario(null);
  };

  const value = useMemo(() => ({ usuario, login, logout }), [usuario]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
