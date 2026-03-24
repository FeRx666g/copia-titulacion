import { useState, useEffect, useRef } from 'react';
import {
  FaChartBar,
  FaTextHeight,
  FaArrowLeft,
  FaExpand,
  FaShapes,
  FaSquare,
  FaMinus,
  FaArrowRight,
  FaArrowsAltH,
  FaQuestion
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export const ToolBar = ({ onAgregar, zoomPercent, isFullScreen, onToggleFullScreen, todasLasDiapositivas, onAyuda }) => {
  const navigate = useNavigate();
  const [mostrarFormas, setMostrarFormas] = useState(false);
  const menuFormasRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuFormasRef.current && !menuFormasRef.current.contains(event.target)) {
        setMostrarFormas(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="fixed left-2 top-20 h-85 w-14 bg-white flex flex-col items-center py-5 rounded-2xl gap-3 shadow z-50">
      
      <button
        onClick={() => onAgregar('grafico-line')} 
        title="Agregar Gráfico de Línea"
        className="tour-btn-graficos text-gray-700 hover:bg-gray-200 p-2 rounded cursor-pointer"
      >
        <FaChartBar size={18} />
      </button>

      <button
        onClick={() => onAgregar('texto')}
        className="tour-btn-texto cursor-pointer hover:bg-gray-100 text-gray-700 p-2 rounded"
        title="Texto"
      >
        <FaTextHeight />
      </button>

      <div className="relative" ref={menuFormasRef}>
        <button
          onClick={() => setMostrarFormas(!mostrarFormas)}
          title="Formas"
          className="tour-btn-formas text-gray-700 hover:bg-gray-200 p-2 rounded cursor-pointer"
        >
          <FaShapes size={18} />
        </button>

        {mostrarFormas && (
          <div className="absolute left-12 top-0 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-1 w-48 z-50 ">
            {[
              { tipo: 'forma-rectangulo', Icon: FaSquare, nombre: 'Rectángulo' },
              { tipo: 'forma-linea', Icon: FaMinus, nombre: 'Línea' },
              { tipo: 'forma-flecha', Icon: FaArrowRight, nombre: 'Flecha' },
              { tipo: 'forma-flecha-doble', Icon: FaArrowsAltH, nombre: 'Flecha Doble' }
            ].map(({ tipo, Icon, nombre }) => (
              <button
                key={tipo}
                onClick={() => {
                  onAgregar(tipo);
                  setMostrarFormas(false);
                }}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 px-3 py-2 rounded text-left text-gray-800"
              >
                <Icon className="text-base" />
                <span>{nombre}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-grow" />

      <button
        onClick={onAyuda}
        title="Ayuda / Tutorial"
        className="tour-btn-ayuda text-blue-600 hover:bg-blue-100 p-2 rounded cursor-pointer"
      >
        <FaQuestion size={16} />
      </button>

      <button
        onClick={onToggleFullScreen}
        title="Presentar"
        className="tour-btn-fullscreen text-blue-600 hover:bg-blue-100 p-2 rounded cursor-pointer"
      >
        <FaExpand size={16} />
      </button>

      <button
        onClick={() => navigate('/dashboard')}
        title="Volver"
        className="text-gray-400 hover:text-black p-2 cursor-pointer"
      >
        <FaArrowLeft size={16} />
      </button>
    </div>
  );
};