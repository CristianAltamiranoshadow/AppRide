import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RutaProtegida, GuardRol } from './auth/guards';
import Navbar from './components/Navbar';

import Home from './pages/Home';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Estudiante from './pages/Estudiante';
import Conductor from './pages/Conductor';
import Admin from './pages/Admin';

export default function App(){
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar/>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/registro" element={<Registro/>}/>

          <Route element={<RutaProtegida/>}>
            <Route element={<GuardRol permitir={['ESTUDIANTE']}/>}>
              <Route path="/estudiante" element={<Estudiante/>}/>
            </Route>
            <Route element={<GuardRol permitir={['CONDUCTOR']}/>}>
              <Route path="/conductor" element={<Conductor/>}/>
            </Route>
            <Route element={<GuardRol permitir={['ADMINISTRADOR']}/>}>
              <Route path="/admin" element={<Admin/>}/>
            </Route>
          </Route>

          <Route path="*" element={<Home/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
