import React, { useState, useContext } from 'react';
import { UserContext } from '../providers/UserProvider';
import Swal from 'sweetalert2';
import { FaGoogle, FaTimes, FaEnvelope, FaLock, FaUser, FaIdCard } from 'react-icons/fa';

export const ModalAuth = ({ isOpen, onClose, initialMode = 'login' }) => {
    const { loginConEmail, registrarUsuario, resetPassword, loginConGoogle } = useContext(UserContext);

    // Modos: 'login', 'register', 'forgot'
    const [mode, setMode] = useState(initialMode);

    // Sync mode with initialMode when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
        }
    }, [isOpen, initialMode]);

    // Inputs Login
    const [emailLogin, setEmailLogin] = useState('');
    const [passwordLogin, setPasswordLogin] = useState('');

    // Inputs Register
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [username, setUsername] = useState('');

    const [emailRegister, setEmailRegister] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');

    const [passwordRegister, setPasswordRegister] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Input Forgot
    const [emailForgot, setEmailForgot] = useState('');

    const [loading, setLoading] = useState(false);

    // Reiniciar estados al cerrar o cambiar modo (opcional)
    const switchMode = (newMode) => {
        setMode(newMode);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (mode === 'login') {
            const res = await loginConEmail(emailLogin, passwordLogin);
            if (res.success) {
                onClose();
                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido!',
                    text: 'Inicio de sesión exitoso.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Credenciales inválidas o error en el servidor.'
                });
            }
        } else if (mode === 'register') {
            // Validaciones
            if (!nombre.trim() || !apellido.trim() || !username.trim()) {
                Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor completa todos los campos de información personal.' });
                setLoading(false);
                return;
            }
            if (emailRegister !== confirmEmail) {
                Swal.fire({ icon: 'error', title: 'Error en correo', text: 'Los correos electrónicos no coinciden.' });
                setLoading(false);
                return;
            }
            if (passwordRegister !== confirmPassword) {
                Swal.fire({ icon: 'error', title: 'Error en contraseña', text: 'Las contraseñas no coinciden.' });
                setLoading(false);
                return;
            }
            if (passwordRegister.length < 6) {
                Swal.fire({ icon: 'warning', title: 'Contraseña débil', text: 'La contraseña debe tener al menos 6 caracteres.' });
                setLoading(false);
                return;
            }

            const res = await registrarUsuario(emailRegister, passwordRegister, nombre, apellido, username);
            if (res.success) {
                onClose();
                Swal.fire({
                    icon: 'success',
                    title: '¡Cuenta creada!',
                    text: 'Te has registrado correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                let mensajeError = 'No se pudo crear la cuenta.';
                const errorCode = res.error?.code;

                if (errorCode === 'auth/email-already-in-use') {
                    mensajeError = 'Este correo electrónico ya se encuentra registrado.';
                } else if (errorCode === 'auth/invalid-email') {
                    mensajeError = 'El correo electrónico no es válido.';
                } else if (errorCode === 'auth/weak-password') {
                    mensajeError = 'La contraseña es muy débil.';
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Error en registro',
                    text: mensajeError
                });
            }
        } else if (mode === 'forgot') {
            const res = await resetPassword(emailForgot);
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Correo enviado',
                    text: 'Revisa tu bandeja de entrada para restablecer tu contraseña.'
                });
                switchMode('login');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo enviar el correo de recuperación.'
                });
            }
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        await loginConGoogle();
        setLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className={`relative w-full ${mode === 'register' ? 'max-w-xl' : 'max-w-md'} bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 animate-fadeIn my-auto`}>

                {/* Botón Cerrar */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                    <FaTimes size={20} />
                </button>

                <div className="p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-lime-500">
                            {mode === 'login' && 'Iniciar Sesión'}
                            {mode === 'register' && 'Crear Cuenta'}
                            {mode === 'forgot' && 'Recuperar Contraseña'}
                        </h2>
                        <p className="text-gray-500 text-sm mt-2">
                            {mode === 'login' && 'Accede a tu panel de control'}
                            {mode === 'register' && 'Completa tus datos para registrarte'}
                            {mode === 'forgot' && 'Ingresa tu correo para recibir instrucciones'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* --- FORMULARIO REGISTRO --- */}
                        {mode === 'register' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Nombre"
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Apellido"
                                            value={apellido}
                                            onChange={(e) => setApellido(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Nombre de usuario"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            placeholder="Correo electrónico"
                                            value={emailRegister}
                                            onChange={(e) => setEmailRegister(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            placeholder="Confirmar correo"
                                            value={confirmEmail}
                                            onChange={(e) => setConfirmEmail(e.target.value)}
                                            className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all ${confirmEmail && emailRegister !== confirmEmail
                                                ? 'border-red-500 focus:ring-red-500'
                                                : 'border-gray-200 dark:border-zinc-700 focus:ring-sky-500'
                                                }`}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="password"
                                            placeholder="Contraseña"
                                            value={passwordRegister}
                                            onChange={(e) => setPasswordRegister(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="password"
                                            placeholder="Confirmar contraseña"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all ${confirmPassword && passwordRegister !== confirmPassword
                                                ? 'border-red-500 focus:ring-red-500'
                                                : 'border-gray-200 dark:border-zinc-700 focus:ring-sky-500'
                                                }`}
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* --- FORMULARIO LOGIN --- */}
                        {mode === 'login' && (
                            <>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        placeholder="Correo electrónico"
                                        value={emailLogin}
                                        onChange={(e) => setEmailLogin(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="password"
                                        placeholder="Contraseña"
                                        value={passwordLogin}
                                        onChange={(e) => setPasswordLogin(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => switchMode('forgot')}
                                        className="text-sm text-sky-500 hover:text-sky-600 hover:underline"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                            </>
                        )}

                        {/* --- FORMULARIO FORGOT --- */}
                        {mode === 'forgot' && (
                            <div className="relative">
                                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    placeholder="Ingresa tu correo"
                                    value={emailForgot}
                                    onChange={(e) => setEmailForgot(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                                    required
                                />
                            </div>
                        )}

                        {/* Botón Submit Principal */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transform active:scale-95 transition-all shadow-lg hover:shadow-xl"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Procesando...
                                </span>
                            ) : (
                                <>
                                    {mode === 'login' && 'Ingresar'}
                                    {mode === 'register' && 'Registrarse'}
                                    {mode === 'forgot' && 'Enviar correo'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Botón Google (Solo Login y Register) */}
                    {mode !== 'forgot' && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200 dark:border-zinc-700"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-zinc-900 text-gray-500">O continúa con</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="w-full py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                            >
                                <FaGoogle className="text-red-500" />
                                <span>Google</span>
                            </button>
                        </>
                    )}

                    {/* Footer - Switch Mode */}
                    <div className="mt-6 text-center text-sm text-gray-500">
                        {mode === 'login' && (
                            <p>
                                ¿No tienes cuenta?{' '}
                                <button onClick={() => switchMode('register')} className="text-sky-500 font-bold hover:underline">
                                    Regístrate
                                </button>
                            </p>
                        )}
                        {mode === 'register' && (
                            <p>
                                ¿Ya tienes cuenta?{' '}
                                <button onClick={() => switchMode('login')} className="text-sky-500 font-bold hover:underline">
                                    Inicia Sesión
                                </button>
                            </p>
                        )}
                        {mode === 'forgot' && (
                            <button onClick={() => switchMode('login')} className="text-sky-500 font-bold hover:underline flex items-center justify-center gap-2 w-full">
                                Volver al inicio de sesión
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
