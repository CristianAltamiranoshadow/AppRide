// src/pages/Registro.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, AlertCircle, CheckCircle, Loader, ChevronRight, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';

// Validación Zod
const schema = z.object({
  rol: z.enum(['ESTUDIANTE', 'CONDUCTOR'], {
    errorMap: () => ({ message: 'Selecciona un rol válido' }),
  }),
  nombre_completo: z.string().min(2, 'Ingresa tu nombre completo'),
  correo: z.string().email('Correo inválido').refine(email => {
    const institutionalDomains = [
      '@universidad.edu.ec',
      '@estudiantes.universidad.edu.ec',
      '@epn.edu.ec',
      '@estudiantes.epn.edu.ec',
      '@puce.edu.ec',
      '@estudiantes.puce.edu.ec'
    ];
    return institutionalDomains.some(domain => email.toLowerCase().endsWith(domain));
  }, { message: 'Debe usar un correo institucional válido' }),
  contrasena: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  telefono: z.string().optional().or(z.literal(''))
    .refine(phone => phone === '' || /^[0-9+\-\s()]{7,20}$/.test(phone), {
      message: 'Formato de teléfono inválido',
    }),
  info_vehiculo: z.string().optional(),
  latitud: z.union([z.string(), z.number()])
    .optional()
    .transform(v => (v === '' || v === undefined ? undefined : Number(v)))
    .refine(v => v === undefined || !Number.isNaN(v), {
      message: 'Latitud debe ser numérica',
    }),
  longitud: z.union([z.string(), z.number()])
    .optional()
    .transform(v => (v === '' || v === undefined ? undefined : Number(v)))
    .refine(v => v === undefined || !Number.isNaN(v), {
      message: 'Longitud debe ser numérica',
    }),
  avatar: z.any().optional(),
}).superRefine((data, ctx) => {
  if (data.rol === 'CONDUCTOR' && (!data.info_vehiculo || !data.info_vehiculo.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['info_vehiculo'],
      message: 'Describe tu vehículo (ej. Toyota PBA-5122)',
    });
  }
  if (data.contrasena !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Las contraseñas no coinciden',
    });
  }
});

export default function Registro() {
  const nav = useNavigate();
  const [apiError, setApiError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [safariLocationState, setSafariLocationState] = useState({
    loading: false,
    error: '',
    success: false,
    showManualInput: false
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      rol: 'ESTUDIANTE',
      nombre_completo: '',
      correo: '',
      contrasena: '',
      confirmPassword: '',
      telefono: '',
      info_vehiculo: '',
      latitud: '',
      longitud: '',
      avatar: null,
    },
    mode: 'onBlur',
  });

  const rol = watch('rol');
  const avatarFile = watch('avatar');

  // Detectar Safari
  const isSafari = () => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  };

  // Geolocalización optimizada para Safari
  const obtenerUbicacionSafari = async () => {
    setSafariLocationState({
      loading: true,
      error: '',
      success: false,
      showManualInput: false
    });

    if (!navigator.geolocation) {
      setSafariLocationState(prev => ({ 
        ...prev, 
        loading: false,
        error: 'Geolocalización no soportada en este navegador'
      }));
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        const options = {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(resolve, reject, options);

        setTimeout(() => {
          reject(new Error('Tiempo de espera agotado'));
        }, 16000);
      });

      setValue('latitud', position.coords.latitude.toString(), { shouldValidate: true });
      setValue('longitud', position.coords.longitude.toString(), { shouldValidate: true });
      
      setSafariLocationState({
        loading: false,
        error: '',
        success: true,
        showManualInput: false
      });

    } catch (error) {
      let errorMessage = 'No se pudo obtener la ubicación';
      let showManual = false;

      if (error.code === 1) {
        errorMessage = 'Permiso denegado. Por favor habilita la ubicación en Configuración > Privacidad > Servicios de ubicación';
      } else if (error.code === 2 || error.code === 3) {
        errorMessage = 'No se pudo determinar tu ubicación. Intenta en un área abierta';
        showManual = true;
      } else {
        errorMessage = error.message;
        showManual = true;
      }

      setSafariLocationState({
        loading: false,
        error: errorMessage,
        success: false,
        showManualInput: showManual
      });
    }
  };

  // Preview de avatar
  useEffect(() => {
    if (!avatarFile || avatarFile.length === 0) {
      setImagePreview(null);
      return;
    }
    const file = avatarFile[0];
    if (!file.type.startsWith('image/')) {
      setImagePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, [avatarFile]);

  // Obtener ubicación al cambiar rol
  useEffect(() => {
    if (rol === 'ESTUDIANTE' && !safariLocationState.success && isSafari()) {
      obtenerUbicacionSafari();
    }
  }, [rol]);

  const onSubmit = async (formData) => {
    setApiError('');
    try {
      const payload = {
        rol: formData.rol.toUpperCase(),
        nombre_completo: formData.nombre_completo.trim(),
        correo: formData.correo.trim().toLowerCase(),
        contrasena: formData.contrasena,
        telefono: formData.telefono?.trim() || null,
        info_vehiculo: formData.rol === 'CONDUCTOR' ? formData.info_vehiculo.trim() : undefined,
        latitud: formData.latitud ? Number(formData.latitud) : null,
        longitud: formData.longitud ? Number(formData.longitud) : null,
      };

      const { data } = await api.post('/auth/register', payload);

      if (formData.avatar && formData.avatar.length > 0 && data.token) {
        const formDataUpload = new FormData();
        formDataUpload.append('avatar', formData.avatar[0]);
        await api.post('/auth/avatar', formDataUpload, {
          headers: { Authorization: `Bearer ${data.token}` },
        });
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));

      nav(payload.rol === 'CONDUCTOR' ? '/conductor' : '/estudiante', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error ||
        (err.response?.status === 409 ? 'El correo ya está registrado' : 'Error al registrar');
      setApiError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 520, margin: '40px auto', display: 'grid', gap: 10 }}>
      <h2 style={{ textAlign: 'center', fontSize: 36, marginBottom: 16 }}>Registro</h2>

      {/* Rol */}
      <label>
        Tipo de Usuario
        <select {...register('rol')}>
          <option value="ESTUDIANTE">Estudiante</option>
          <option value="CONDUCTOR">Conductor</option>
        </select>
      </label>
      {errors.rol && <small style={{ color: 'red' }}>{errors.rol.message}</small>}

      {/* Nombre completo */}
      <label>
        Nombre completo *
        <input placeholder="Nombre completo" {...register('nombre_completo')} />
      </label>
      {errors.nombre_completo && <small style={{ color: 'red' }}>{errors.nombre_completo.message}</small>}

      {/* Correo institucional */}
      <label>
        Correo institucional *
        <input placeholder="correo@puce.edu.ec" {...register('correo')} />
      </label>
      {errors.correo && <small style={{ color: 'red' }}>{errors.correo.message}</small>}

      {/* Contraseña */}
      <label style={{ position: 'relative' }}>
        Contraseña *
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Mínimo 6 caracteres"
          {...register('contrasena')}
          style={{ paddingRight: 30 }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: 5,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </label>
      {errors.contrasena && <small style={{ color: 'red' }}>{errors.contrasena.message}</small>}

      {/* Confirmar Contraseña */}
      <label style={{ position: 'relative' }}>
        Confirmar Contraseña *
        <input
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Repite tu contraseña"
          {...register('confirmPassword')}
          style={{ paddingRight: 30 }}
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          style={{
            position: 'absolute',
            right: 5,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </label>
      {errors.confirmPassword && <small style={{ color: 'red' }}>{errors.confirmPassword.message}</small>}

      {/* Teléfono */}
      <label>
        Teléfono (opcional)
        <input placeholder="098..." {...register('telefono')} />
      </label>
      {errors.telefono && <small style={{ color: 'red' }}>{errors.telefono.message}</small>}

      {/* Info vehículo */}
      {rol === 'CONDUCTOR' && (
        <>
          <label>
            Información del vehículo *
            <input placeholder="Toyota azul PBA-5122" {...register('info_vehiculo')} />
          </label>
          {errors.info_vehiculo && <small style={{ color: 'red' }}>{errors.info_vehiculo.message}</small>}
        </>
      )}

      {/* Avatar */}
      <label>
        Foto de Perfil (PNG, JPG hasta 5MB)
        <input
          type="file"
          accept="image/*"
          {...register('avatar')}
        />
      </label>
      {imagePreview && (
        <img
          src={imagePreview}
          alt="Preview Avatar"
          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
        />
      )}
      {errors.avatar && <small style={{ color: 'red' }}>{errors.avatar.message}</small>}

      {/* Ubicación para Safari */}
      {rol === 'ESTUDIANTE' && isSafari() && (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ flex: 1 }}>
              Latitud
              <input 
                {...register('latitud')}
                readOnly={!safariLocationState.showManualInput}
                placeholder="Se detectará automáticamente"
              />
              {errors.latitud && <small style={{ color: 'red' }}>{errors.latitud.message}</small>}
            </label>
            <label style={{ flex: 1 }}>
              Longitud
              <input 
                {...register('longitud')}
                readOnly={!safariLocationState.showManualInput}
                placeholder="Se detectará automáticamente"
              />
              {errors.longitud && <small style={{ color: 'red' }}>{errors.longitud.message}</small>}
            </label>
          </div>

          {safariLocationState.loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader size={16} className="animate-spin" />
              <span>Detectando tu ubicación...</span>
            </div>
          )}

          {safariLocationState.error && (
            <div style={{ color: 'red', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} />
                <span>{safariLocationState.error}</span>
              </div>
              <button
                type="button"
                onClick={obtenerUbicacionSafari}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'blue',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <ChevronRight size={16} />
                Reintentar
              </button>
            </div>
          )}

          {safariLocationState.showManualInput && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>O ingresa las coordenadas manualmente:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="Latitud"
                  value={watch('latitud')}
                  onChange={(e) => setValue('latitud', e.target.value)}
                />
                <input
                  placeholder="Longitud"
                  value={watch('longitud')}
                  onChange={(e) => setValue('longitud', e.target.value)}
                />
              </div>
            </div>
          )}

          {safariLocationState.success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'green' }}>
              <CheckCircle size={16} />
              <span>Ubicación detectada correctamente</span>
            </div>
          )}
        </>
      )}

      {apiError && <div style={{ color: 'red' }}>{apiError}</div>}

      <button 
        disabled={isSubmitting || (rol === 'ESTUDIANTE' && isSafari() && !safariLocationState.success && !safariLocationState.showManualInput)} 
        style={{ marginTop: 10, padding: '12px', backgroundColor: '#3f51b5', color: 'white', border: 'none', borderRadius: 4 }}
      >
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  );
}