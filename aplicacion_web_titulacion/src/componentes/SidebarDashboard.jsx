import React from 'react';
import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { UserContext } from '../providers/UserProvider';
import { FiHome, FiGrid, FiCamera, FiKey, FiLogOut } from 'react-icons/fi';
import { FaServer } from 'react-icons/fa';
import { MdAdminPanelSettings } from 'react-icons/md';

export const SidebarDashboard = () => {
  const { user, cerrarSesion } = useContext(UserContext);
  const genericAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  const enlaces = [
    { to: '/inicio', label: 'Inicio', icon: <FiHome /> },
    { to: '/dashboard', label: 'Dashboard', icon: <FiGrid /> },
    { to: '/apirestinfo', label: 'API Info', icon: <FaServer /> },
    /*{ to: '/camara', label: 'Cámara', icon: <FiCamera /> },*/
    { to: '/mis-apikeys', label: 'API Keys', icon: <FiKey /> },
    { to: '/dispositivos', label: 'Sensores', icon: <FiGrid /> },
  ];

  if (user?.rol === 3) {
    enlaces.push({ to: '/admin', label: 'Admin', icon: <MdAdminPanelSettings /> });
  }

  return (
    <div className="fixed top-0 left-0 h-full w-56 bg-white dark:bg-black border-r border-gray-300 dark:border-gray-700 shadow-lg z-50 px-4 py-6 flex flex-col justify-between">

      <div>
        <div className="flex flex-col items-center mb-8">
          <img
            src={user?.photoURL || genericAvatar}
            alt="Foto de perfil"
            className="w-16 h-16 rounded-full object-cover shadow-md"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = genericAvatar;
            }}
          />
          <h2 className="text-base font-bold text-sky-500 mt-2 text-center truncate">
            {user?.displayName || 'Usuario'}
          </h2>
        </div>

        <nav className="flex flex-col gap-4">
          {enlaces.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg text-base font-semibold transition hover:bg-sky-100 dark:hover:bg-gray-800 ${isActive
                  ? 'bg-sky-200 dark:bg-gray-700 text-sky-700'
                  : 'text-gray-600 dark:text-gray-300'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <button
        onClick={cerrarSesion}
        className="flex items-center gap-3 px-4 py-2 mt-8 rounded-lg text-base font-semibold text-red-500 hover:bg-red-100 dark:hover:bg-red-900 transition"
      >
        <FiLogOut />
        Cerrar Sesión
      </button>
    </div>
  );
};