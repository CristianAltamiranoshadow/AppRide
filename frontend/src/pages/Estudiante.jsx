import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Estudiante(){
  const [viajes,setViajes]=useState([]);
  const [msg,setMsg]=useState('');

  const cargar = async ()=>{
    const { data } = await api.get('/viajes');
    setViajes(data);
  };

  useEffect(()=>{ cargar(); },[]);

  const unirse = async (id)=>{
    setMsg('');
    try{
      await api.post(`/reservas/${id}`, {}); // puedes enviar recogida_latitud/longitud
      setMsg('Solicitud enviada ✔️');
      cargar();
    }catch(e){
      setMsg(e.response?.data?.error || 'Error al unirse');
    }
  };

  return (
    <div style={{maxWidth:900,margin:'20px auto'}}>
      <h2>Viajes disponibles</h2>
      {msg && <p>{msg}</p>}
      <table width="100%" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Conductor</th>
            <th>Vehículo</th>
            <th>Salida</th>
            <th>Asientos</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {viajes.map(v=>(
            <tr key={v.id}>
              <td>{v.nombre_conductor}</td>
              <td>{v.info_vehiculo || '-'}</td>
              <td>{new Date(v.salida_en).toLocaleString()}</td>
              <td>{v.asientos_disponibles}/{v.asientos_totales}</td>
              <td><button onClick={()=>unirse(v.id)}>Unirme</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
