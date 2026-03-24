import React from 'react';
import Swal from 'sweetalert2';

export const ModalAgregarDispositivo = ({
    nuevoDispositivo,
    manejarCambio,
    crearDispositivo,
    onClose
}) => {
    return (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="tour-modal-add-window bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-2xl w-full max-w-lg relative border border-sky-200">
                <h2 className="text-xl font-bold text-center mb-4 text-blue-600">
                    Agregar sensor
                </h2>

                <div className="grid gap-4">
                    <input
                        type="text"
                        name="nombre"
                        placeholder="Nombre del sensor"
                        className="tour-modal-add-name input-form w-full p-3 rounded-lg border dark:bg-zinc-700 dark:text-white dark:border-gray-600"
                        value={nuevoDispositivo.nombre}
                        onChange={manejarCambio}
                    />

                    <select
                        name="tipo"
                        className="tour-modal-add-type input-form w-full p-3 rounded-lg border dark:bg-zinc-700 dark:text-white dark:border-gray-600 appearance-none bg-gray-100 cursor-not-allowed text-gray-500"
                        value="Sensor"
                        disabled
                    >
                        <option value="Sensor">Sensor</option>
                    </select>

                    <div className="flex gap-4">
                        <input
                            type="number"
                            name="valorMinimo"
                            placeholder="Min (ej. 0)"
                            className="input-form w-1/2 p-3 rounded-lg border dark:bg-zinc-700 dark:text-white dark:border-gray-600"
                            value={nuevoDispositivo.valorMinimo}
                            onChange={manejarCambio}
                        />
                        <input
                            type="number"
                            name="valorMaximo"
                            placeholder="Max (ej. 100)"
                            className="input-form w-1/2 p-3 rounded-lg border dark:bg-zinc-700 dark:text-white dark:border-gray-600"
                            value={nuevoDispositivo.valorMaximo}
                            onChange={manejarCambio}
                        />
                    </div>

                    <input
                        type="text"
                        name="unidad"
                        placeholder="Unidad de medida (ej. °C, %, Lux)"
                        className="input-form w-full p-3 rounded-lg border dark:bg-zinc-700 dark:text-white dark:border-gray-600"
                        value={nuevoDispositivo.unidad}
                        onChange={manejarCambio}
                    />

                    <textarea
                        name="descripcion"
                        placeholder="Descripción del sensor"
                        className="tour-modal-add-desc input-form w-full p-3 rounded-lg border dark:bg-zinc-700 dark:text-white dark:border-gray-600"
                        value={nuevoDispositivo.descripcion}
                        onChange={manejarCambio}
                    />

                    <div className="flex justify-end gap-4 mt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg font-semibold transition cursor-pointer"
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={() => {
                                if (!nuevoDispositivo.nombre.trim()) {
                                    Swal.fire({
                                        title: 'Falta información',
                                        text: 'Debes ingresar al menos el nombre del sensor.',
                                        icon: 'warning',
                                        confirmButtonColor: '#3085d6'
                                    });
                                    return;
                                }
                                crearDispositivo();
                            }}
                            className="tour-modal-add-save px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition cursor-pointer"
                        >
                            Guardar sensor
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};