import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Navbar(){
  const { usuario, logout } = useAuth();
  return (
    <nav style={{display:'flex',gap:12,padding:12,borderBottom:'1px solid #eee'}}>
      <Link to="/">Inicio</Link>
      {!usuario && <>
        <Link to="/login">Login</Link>
        <Link to="/registro">Registro</Link>
      </>}
      {usuario?.rol === 'ESTUDIANTE' && <Link to="/estudiante">Estudiante</Link>}
      {usuario?.rol === 'CONDUCTOR' && <Link to="/conductor">Conductor</Link>}
      {usuario?.rol === 'ADMINISTRADOR' && <Link to="/admin">Admin</Link>}
      <div style={{marginLeft:'auto'}}>
        {usuario ? (
          <button onClick={logout}>Cerrar sesión</button>
        ) : null}
      </div>
    </nav>
  );
}
