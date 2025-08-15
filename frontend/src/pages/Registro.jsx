import { useState, useEffect } from 'react';
import { User, Mail, Lock, Phone, Upload, Eye, EyeOff, MapPin, Car, AlertCircle, CheckCircle, Loader, UserCheck, Truck } from 'lucide-react';

const RegistroMovilidad = () => {
  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo: '',
    contrasena: '',
    confirmPassword: '',
    telefono: '',
    rol: 'ESTUDIANTE',
    info_vehiculo: '',
    avatar: null,
    asientos_disponibles: 4 // Nuevo campo para conductores
  });

  const [location, setLocation] = useState({ latitud: -0.1807, longitud: -78.4678 }); // PUCE por defecto
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('form');
  const [message, setMessage] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const API_BASE = 'http://localhost:5050/api';

  // Obtener geolocalización
  const getLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude
          });
          setGettingLocation(false);
        },
        (error) => {
          console.warn('Error obteniendo ubicación:', error);
          setGettingLocation(false);
        }
      );
    } else {
      setGettingLocation(false);
    }
  };

  // Validaciones mejoradas
  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(puce|epn)\.edu\.ec$/i;

    if (!formData.nombre_completo.trim()) {
      newErrors.nombre_completo = 'Nombre completo es requerido';
    }

    if (!formData.correo.trim()) {
      newErrors.correo = 'Correo es requerido';
    } else if (!emailRegex.test(formData.correo)) {
      newErrors.correo = 'Debe usar correo PUCE o EPN (@puce.edu.ec o @epn.edu.ec)';
    }

    if (!formData.contrasena) {
      newErrors.contrasena = 'Contraseña es requerida';
    } else if (formData.contrasena.length < 6) {
      newErrors.contrasena = 'Mínimo 6 caracteres';
    }

    if (formData.contrasena !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (formData.rol === 'CONDUCTOR') {
      if (!formData.info_vehiculo.trim()) {
        newErrors.info_vehiculo = 'Información del vehículo es requerida';
      }
      if (!formData.asientos_disponibles || formData.asientos_disponibles < 1) {
        newErrors.asientos_disponibles = 'Debe tener al menos 1 asiento';
      }
    }

    return newErrors;
  };

  // Manejar submit del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('nombre_completo', formData.nombre_completo);
      formDataToSend.append('correo', formData.correo);
      formDataToSend.append('contrasena', formData.contrasena);
      formDataToSend.append('telefono', formData.telefono);
      formDataToSend.append('rol', formData.rol);
      formDataToSend.append('latitud', location.latitud);
      formDataToSend.append('longitud', location.longitud);
      
      if (formData.rol === 'CONDUCTOR') {
        formDataToSend.append('info_vehiculo', formData.info_vehiculo);
        formDataToSend.append('asientos_disponibles', formData.asientos_disponibles);
      }

      if (formData.avatar) {
        formDataToSend.append('avatar', formData.avatar);
      }

      const response = await fetch(`${API_BASE}/auth/registro`, {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Error en el registro');

      setStep('success');
      setMessage('Registro exitoso. ' + (formData.rol === 'CONDUCTOR' ? 
        'Ahora puedes publicar tus viajes.' : 
        'Ahora puedes buscar viajes disponibles.'));

    } catch (error) {
      console.error('Error:', error);
      setStep('error');
      setMessage(error.message || 'Error al registrar. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderizado condicional
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Registro Exitoso!</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={() => window.location.href = formData.rol === 'CONDUCTOR' ? '/conductor' : '/estudiante'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Continuar a la App
          </button>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error en el Registro</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={() => setStep('form')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Volver a intentar
          </button>
        </div>
      </div>
    );
  }

  // Formulario principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">PUCE Ride</h1>
          <p className="text-gray-600">Registro de {formData.rol === 'CONDUCTOR' ? 'Conductor' : 'Estudiante'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selector de Rol */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => setFormData({...formData, rol: 'ESTUDIANTE'})}
              className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center ${
                formData.rol === 'ESTUDIANTE' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <UserCheck className="mr-2" />
              Estudiante
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, rol: 'CONDUCTOR'})}
              className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center ${
                formData.rol === 'CONDUCTOR' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Truck className="mr-2" />
              Conductor
            </button>
          </div>

          {/* Campos del formulario */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Nombre Completo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.nombre_completo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              {errors.nombre_completo && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre_completo}</p>
              )}
            </div>

            {/* Correo Institucional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Institucional *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="correo"
                  value={formData.correo}
                  onChange={(e) => setFormData({...formData, correo: e.target.value})}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.correo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="usuario@puce.edu.ec"
                />
              </div>
              {errors.correo && (
                <p className="mt-1 text-sm text-red-600">{errors.correo}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="contrasena"
                  value={formData.contrasena}
                  onChange={(e) => setFormData({...formData, contrasena: e.target.value})}
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.contrasena ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {errors.contrasena && (
                <p className="mt-1 text-sm text-red-600">{errors.contrasena}</p>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Repite tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0987654321"
                />
              </div>
            </div>

            {/* Campos específicos para conductores */}
            {formData.rol === 'CONDUCTOR' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Información del Vehículo *
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="info_vehiculo"
                      value={formData.info_vehiculo}
                      onChange={(e) => setFormData({...formData, info_vehiculo: e.target.value})}
                      className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.info_vehiculo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ej: Toyota Corolla Azul - ABC123"
                    />
                  </div>
                  {errors.info_vehiculo && (
                    <p className="mt-1 text-sm text-red-600">{errors.info_vehiculo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asientos Disponibles *
                  </label>
                  <select
                    name="asientos_disponibles"
                    value={formData.asientos_disponibles}
                    onChange={(e) => setFormData({...formData, asientos_disponibles: parseInt(e.target.value)})}
                    className={`w-full pl-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.asientos_disponibles ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} asiento{num !== 1 ? 's' : ''}</option>
                    ))}
                  </select>
                  {errors.asientos_disponibles && (
                    <p className="mt-1 text-sm text-red-600">{errors.asientos_disponibles}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Foto de perfil */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto de Perfil
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-300 overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User size={24} />
                  </div>
                )}
              </div>
              <label className="flex-1">
                <div className="cursor-pointer bg-white hover:bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-center transition-colors">
                  <Upload size={16} className="mr-2" />
                  {formData.avatar ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setFormData({...formData, avatar: file});
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">Formatos: JPG, PNG (max 5MB)</p>
          </div>

          {/* Ubicación */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="text-blue-600" />
                <span className="font-medium">Ubicación Actual</span>
              </div>
              <button
                type="button"
                onClick={getLocation}
                className="text-blue-600 text-sm hover:underline flex items-center"
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <>
                    <Loader className="animate-spin mr-1" size={16} />
                    Obteniendo...
                  </>
                ) : (
                  'Actualizar ubicación'
                )}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {location.latitud ? (
                <>
                  <span className="font-medium">Lat:</span> {location.latitud.toFixed(6)}, 
                  <span className="font-medium ml-2">Lng:</span> {location.longitud.toFixed(6)}
                </>
              ) : (
                'Ubicación no disponible'
              )}
            </p>
          </div>

          {/* Botón de registro */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <UserCheck />
                Crear cuenta de {formData.rol === 'CONDUCTOR' ? 'conductor' : 'estudiante'}
              </>
            )}
          </button>

          <p className="text-center text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-blue-600 hover:underline">
              Inicia sesión aquí
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegistroMovilidad;