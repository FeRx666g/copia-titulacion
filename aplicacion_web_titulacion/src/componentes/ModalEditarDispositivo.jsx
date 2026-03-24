import React, { useState } from 'react';

export const ModalEditarDispositivo = ({ dispositivo, onClose, onGuardar }) => {
  const MAX_NOMBRE = 25;
  const MAX_TIPO = 25;
  const MAX_DESCRIPCION = 100;

  const [formulario, setFormulario] = useState({
    nombre: dispositivo.nombre || '',
    tipo: dispositivo.tipo || '',
    descripcion: dispositivo.descripcion || '',
    imagen: dispositivo.imagen || '',
    // Inicializamos los nuevos campos, usando vacío si no existen
    valorMinimo: dispositivo.valorMinimo || '',
    valorMaximo: dispositivo.valorMaximo || '',
    unidad: dispositivo.unidad || ''
  });

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const guardarCambios = () => {
    // Se enviarán todos los campos, incluidos los nuevos
    onGuardar({ ...dispositivo, ...formulario });
    onClose();
  };

  const MensajeLimite = ({ longitud, max }) => {
    if (longitud >= max) {
      return <p className="text-xs text-red-500 mt-1">⚠️ Máx. {max} caracteres.</p>;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="tour-modal-edit-window bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-xl w-full max-w-md space-y-4 border border-sky-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-sky-600">Editar sensor</h2>

        {/* NOMBRE */}
        <div className="tour-modal-edit-name flex flex-col gap-1">
          <label className="font-semibold text-gray-700 dark:text-white text-sm">
            Nombre del sensor
          </label>
          <input
            type="text"
            name="nombre"
            className={`input-form w-full p-2 rounded border dark:bg-zinc-700 dark:text-white ${formulario.nombre.length >= MAX_NOMBRE ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
            value={formulario.nombre}
            onChange={manejarCambio}
            maxLength={MAX_NOMBRE}
          />
          <MensajeLimite longitud={formulario.nombre.length} max={MAX_NOMBRE} />
        </div>

        {/* TIPO */}
        <div className="tour-modal-edit-type flex flex-col gap-1">
          <label className="font-semibold text-gray-700 dark:text-white text-sm">
            Tipo
          </label>
          <select
            name="tipo"
            className="input-form w-full p-2 rounded border border-gray-300 dark:bg-zinc-700 dark:text-white appearance-none bg-gray-100 cursor-not-allowed text-gray-500"
            value="Sensor"
            disabled
          >
            <option value="Sensor">Sensor</option>
          </select>
        </div>

        {/* RANGO DE VALORES (MIN - MAX) */}
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <label className="font-semibold text-gray-700 dark:text-white text-sm">
              Mínimo
            </label>
            <input
              type="number"
              name="valorMinimo"
              placeholder="0"
              className="input-form w-full p-2 rounded border border-gray-300 dark:bg-zinc-700 dark:text-white"
              value={formulario.valorMinimo}
              onChange={manejarCambio}
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="font-semibold text-gray-700 dark:text-white text-sm">
              Máximo
            </label>
            <input
              type="number"
              name="valorMaximo"
              placeholder="100"
              className="input-form w-full p-2 rounded border border-gray-300 dark:bg-zinc-700 dark:text-white"
              value={formulario.valorMaximo}
              onChange={manejarCambio}
            />
          </div>
        </div>

        {/* UNIDAD DE MEDIDA */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-gray-700 dark:text-white text-sm">
            Unidad de medida
          </label>
          <input
            type="text"
            name="unidad"
            placeholder="Ej: °C, %, Lux"
            className="input-form w-full p-2 rounded border border-gray-300 dark:bg-zinc-700 dark:text-white"
            value={formulario.unidad}
            onChange={manejarCambio}
          />
        </div>

        {/* DESCRIPCION */}
        <div className="tour-modal-edit-desc flex flex-col gap-1">
          <label className="font-semibold text-gray-700 dark:text-white text-sm">
            Descripción
          </label>
          <textarea
            name="descripcion"
            className={`input-form w-full p-2 rounded border dark:bg-zinc-700 dark:text-white ${formulario.descripcion.length >= MAX_DESCRIPCION ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
            value={formulario.descripcion}
            onChange={manejarCambio}
            maxLength={MAX_DESCRIPCION}
            rows={2}
          />
          <MensajeLimite longitud={formulario.descripcion.length} max={MAX_DESCRIPCION} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-black dark:text-white cursor-pointer transition"
          >
            Cancelar
          </button>
          <button
            onClick={guardarCambios}
            className="tour-modal-edit-save px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white cursor-pointer font-semibold transition"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};