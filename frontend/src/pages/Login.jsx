import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function Login(){
  const [correo,setCorreo]=useState('');
  const [contrasena,setContrasena]=useState('');
  const [error,setError]=useState('');
  const nav = useNavigate();
  const { login } = useAuth();

  const onSubmit = async (e)=>{
    e.preventDefault();
    setError('');
    try{
      const { data } = await api.post('/auth/login', { correo, contrasena });
      login({ usuario: data.usuario, token: data.token });
      const rol = data.usuario.rol;
      nav(rol==='CONDUCTOR'?'/conductor':rol==='ADMINISTRADOR'?'/admin':'/estudiante', { replace:true });
    }catch(err){
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  return (
    <form onSubmit={onSubmit} style={{maxWidth:360,margin:'30px auto',display:'grid',gap:10}}>
      <h2>Ingresar</h2>
      <input placeholder="Correo" value={correo} onChange={e=>setCorreo(e.target.value)} />
      <input type="password" placeholder="Contraseña" value={contrasena} onChange={e=>setContrasena(e.target.value)} />
      {error && <small style={{color:'red'}}>{error}</small>}
      <button>Entrar</button>
      <small>Demo: student@appride.com / 123456</small>
    </form>
  );
}
