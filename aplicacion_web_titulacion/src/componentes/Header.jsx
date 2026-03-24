import React, { useState } from 'react';
import logoFinal from '../assets/LogoSolN.png';
import letras from '../assets/LetrasHorizontal.png';
import { NavLink, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { MenuPredicciones } from "./MenuPredicciones";
import { ModalAuth } from './ModalAuth';
import { UserContext } from '../providers/UserProvider';
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

export const Header = () => {

  const { user, cerrarSesion } = useContext(UserContext);
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="relative z-50 border-b-4 border-transparent bg-white dark:bg-black px-6 py-3">
      {/* Línea gradiente arriba */}
      <div className="absolute top-0 left-0 w-full h-1 bg-sky-400" />

      {/* Línea gradiente abajo */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-400" />

      <header className="flex items-center justify-between">
        {/* Logo y nombre */}
        <div className="tour-header-logo flex items-center space-x-4">
          <img src={logoFinal} alt="Logo" className="w-10 h-auto" />
          <img src={letras} alt="Nombre" className="h-6 mt-1" />
        </div>

        {/* Navegación */}
        <nav className="flex space-x-6 items-center">
          <NavLink to="/inicio" className="tour-header-inicio text-black dark:text-white text-lg font-bold hover:text-lime-400">Inicio</NavLink>

          {/* Envolvemos el componente para poder apuntarlo con el tour */}
          <div className="tour-header-predicciones">
            <MenuPredicciones user={user} />
          </div>

          {user?.rol >= 1 && <NavLink to="/dispositivos" className="tour-header-dispositivos text-black dark:text-white text-lg font-bold hover:text-lime-400">Sensores</NavLink>}

          <NavLink to="/dashboard" className="tour-header-tableros text-black dark:text-white text-lg font-bold hover:text-lime-400">Tableros</NavLink>

          {user?.rol === 3 && <NavLink to="/admin" className="text-black dark:text-white text-lg font-bold hover:text-lime-400">Admin</NavLink>}
          {user && <NavLink to="/mis-apikeys" className="tour-header-keys text-black dark:text-white text-lg font-bold hover:text-lime-400">API Keys</NavLink>}

          <NavLink
            to="/apirestinfo"
            className="tour-header-api text-black dark:text-white text-lg font-bold hover:text-lime-400">
            API Info
          </NavLink>
        </nav>

        {/* Usuario o login */}
        <div className="tour-header-perfil flex items-center space-x-4">
          {user ? (
            <>
              {/* Perfil de Usuario */}
              <div
                className="flex items-center space-x-2 bg-gradient-to-r from-sky-400 via-lime-400 to-sky-400 rounded-full p-[2px] cursor-pointer hover:scale-105 transition-transform"
                onClick={() => navigate('/perfil')}
                title="Ir a mi perfil"
              >
                <div className="bg-black text-white px-3 py-1 rounded-full flex items-center gap-2">
                  <span className="truncate max-w-[120px] text-sm font-semibold hidden sm:block">
                    {user.displayName || user.nombre || "Usuario"}
                  </span>
                  <img
                    src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full border border-gray-500 object-cover"
                  />
                </div>
              </div>
              <button onClick={cerrarSesion} className="text-white bg-red-500 hover:bg-red-600 rounded-full px-4 py-2 font-semibold">
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-sky-400 via-lime-400 to-sky-400 rounded-full p-[2px]">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-white bg-black hover:bg-zinc-800 px-6 py-2 rounded-full cursor-pointer font-medium transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                </div>

                <div className="bg-gradient-to-r from-sky-400 via-lime-400 to-sky-400 rounded-full p-[2px]">
                  <button
                    onClick={() => openAuthModal('register')}
                    className="text-black bg-white hover:bg-gray-50 px-6 py-2 rounded-full cursor-pointer font-bold transition-all"
                  >
                    Registrarse
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <ModalAuth
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}