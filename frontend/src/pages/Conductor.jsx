import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Conductor(){
  const [mios,setMios]=useState([]);
  const [form,setForm]=useState({
    origen_latitud:'', origen_longitud:'',
    destino_latitud:'', destino_longitud:'',
    salida_en:'', asientos_totales:''
  });
  const [msg,setMsg]=useState('');

  const cargar = async ()=>{
    const { data } = await api.get('/viajes/mios');
    setMios(data);
  };
  useEffect(()=>{ cargar(); },[]);

  const crear = async (e)=>{
    e.preventDefault();
    setMsg('');
    try{
      const payload = {
        ...form,
        origen_latitud: Number(form.origen_latitud),
        origen_longitud: Number(form.origen_longitud),
        destino_latitud: Number(form.destino_latitud),
        destino_longitud: Number(form.destino_longitud),
        asientos_totales: Number(form.asientos_totales),
      };
      await api.post('/viajes', payload);
      setMsg('Viaje creado ✔️');
      setForm({origen_latitud:'',origen_longitud:'',destino_latitud:'',destino_longitud:'',salida_en:'',asientos_totales:''});
      cargar();
    }catch(e){
      setMsg(e.response?.data?.error || 'Error al crear viaje');
    }
  };

  return (
    <div style={{maxWidth:900,margin:'20px auto',display:'grid',gap:20}}>
      <h2>Mis viajes</h2>
      <form onSubmit={crear} style={{display:'grid',gap:8}}>
        <div style={{display:'flex',gap:8}}>
          <input placeholder="Origen lat" value={form.origen_latitud} onChange={e=>setForm({...form,origen_latitud:e.target.value})}/>
          <input placeholder="Origen lng" value={form.origen_longitud} onChange={e=>setForm({...form,origen_longitud:e.target.value})}/>
        </div>
        <div style={{display:'flex',gap:8}}>
          <input placeholder="Destino lat" value={form.destino_latitud} onChange={e=>setForm({...form,destino_latitud:e.target.value})}/>
          <input placeholder="Destino lng" value={form.destino_longitud} onChange={e=>setForm({...form,destino_longitud:e.target.value})}/>
        </div>
        <input placeholder="Salida (ISO ej. 2025-08-09T01:00:00Z)" value={form.salida_en} onChange={e=>setForm({...form,salida_en:e.target.value})}/>
        <input placeholder="Asientos totales" value={form.asientos_totales} onChange={e=>setForm({...form,asientos_totales:e.target.value})}/>
        <button>Crear viaje</button>
        {msg && <small>{msg}</small>}
      </form>

      <table width="100%" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Salida</th>
            <th>Asientos</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {mios.map(v=>(
            <tr key={v.id}>
              <td>{new Date(v.salida_en).toLocaleString()}</td>
              <td>{v.asientos_disponibles}/{v.asientos_totales}</td>
              <td>{v.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
