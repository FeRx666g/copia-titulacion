// Error404.jsx
import {useNavigate } from 'react-router-dom';

import React from 'react'

export const Error404 = () => {

    const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-white dark:bg-black text-center p-10 mx-4 md:mx-auto max-w-4xl">
            
            {/* Código del error */}
            <h1 className="text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-lime-400 to-yellow-400 drop-shadow-lg">
                404
            </h1>

            {/* Título principal */}
            <h2 className="text-4xl font-bold mt-4 mb-2 text-gray-800 dark:text-gray-100">
                Página no encontrada
            </h2>

            {/* Descripción */}
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Lo sentimos, la página que intentas visitar no existe o fue movida.  
                Revisa la dirección o vuelve al inicio.
            </p>

            {/* Botón para volver */}
            <button
                onClick={() => navigate('/inicio')}
                className="bg-gradient-to-r from-sky-400 via-lime-400 to-yellow-400 text-white font-bold px-8 py-3 rounded-full hover:scale-105 hover:brightness-110 transition-transform shadow-lg"
            >
                Volver al inicio
            </button>

            {/* Pie de página */}
            <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
                Deep SunLy — Proyecto de Titulación ESPOCH 2025
            </p>
        </div>
  )
}

export default Error404