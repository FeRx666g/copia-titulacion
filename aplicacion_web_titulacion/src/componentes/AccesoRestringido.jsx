//AccesoRestringido.jsx

import { useContext } from 'react';
import { UserContext } from '../providers/UserProvider';


export const AccesoRestringido = ({
    mensaje = "Acceso restringido",
    descripcion = "Por favor inicia sesión o solicita permiso para acceder a esta página."
}) => {
    // Obtiene la función para iniciar sesión desde el contexto del usuario
    const { loginConGoogle } = useContext(UserContext);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] bg-white dark:bg-black text-center p-10 mx-4 md:mx-auto max-w-4xl">
            {/* Título principal */}
            <h2 className="text-5xl font-extrabold pb-4 bg-gradient-to-r from-sky-400 via-lime-400 to-yellow-400 text-transparent bg-clip-text">
                {mensaje}
            </h2>

            {/* Descripción debajo del título */}
            <p className="text-lg text-gray-600 mb-8">
                {descripcion}
            </p>

            {/* Botón para iniciar sesión con Google */}
            <button
                onClick={loginConGoogle}
                className="bg-gradient-to-r from-sky-400 via-lime-400 to-yellow-400 text-white font-bold px-8 py-3 rounded-full hover:scale-105 hover:brightness-110 transition-transform shadow-lg"
            >
                Iniciar Sesión con Google
            </button>

            {/* Pie de página con texto pequeño */}
            <p className="mt-8 text-xs text-gray-500">
                Deep SunLy — Proyecto de Titulación ESPOCH 2025
            </p>
        </div>
    );
};
