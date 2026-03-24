//Admin.jsx
import React, { useContext, useState, useEffect } from 'react'
import { collection, getDocs, getDoc, doc, updateDoc, deleteDoc, addDoc, writeBatch, query, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import UserContext from '../providers/UserProvider'
import { AccesoRestringido } from '../componentes/AccesoRestringido'
import Papa from 'papaparse';
import Swal from 'sweetalert2';

export const Admin = () => {

  const { user } = useContext(UserContext);

  const [usuarios, setUsuarios] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(5);

  const [datosCargados, setDatosCargados] = useState([]);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [datosConsultados, setDatosConsultados] = useState([]);

  const [seleccionados, setSeleccionados] = useState([]);

  const [todosSeleccionados, setTodosSeleccionados] = useState(false);

  const [estadoScripts, setEstadoScripts] = useState({
    "control-manual": false,
    "receptor-esp32cam": false,
    "publicador-backend": false,
  });

  const [sensorIds, setSensorIds] = useState({});
  const [originalSensorIds, setOriginalSensorIds] = useState({});
  const [cargandoSensores, setCargandoSensores] = useState(true);
  const [editandoSensores, setEditandoSensores] = useState(false);

  const [cargandoScripts, setCargandoScripts] = useState(true);

  const esAdmin = user?.rol === 3;

  const [nuevoUrlNgrok, setNuevoUrlNgrok] = useState('');

  const esUrlValida = (cadena) => {
    if (!cadena || cadena.trim() === "") return false;

    try {
      const url = new URL(cadena.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const guardarUrlNgrok = async () => {
    if (!esUrlValida(nuevoUrlNgrok)) {
      Swal.fire('Error', 'Debes ingresar una URL válida que comience con http:// o https://', 'error');
      return;
    }

    try {
      await setDoc(doc(db, 'configuracion', 'camara'), {
        urlNgrok: nuevoUrlNgrok.trim(),
        updated_at: new Date(),
      }, { merge: true });
      Swal.fire('Éxito', 'URL de la cámara actualizada', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo actualizar la URL', 'error');
    }
  };

  const consultarDatosPorFecha = async () => {
    if (!fechaInicio || !fechaFin) {
      Swal.fire('Alerta', 'Por favor selecciona ambas fechas.', 'warning');
      return;
    }

    const desde = new Date(fechaInicio);
    const hasta = new Date(fechaFin);

    if (desde > hasta) {
      Swal.fire('Alerta', 'La fecha de inicio no puede ser mayor que la fecha de fin.', 'warning');
      return;
    }

    try {
      const q = query(
        collection(db, "datos_prediccion"),
        where("timestamp", ">=", desde),
        where("timestamp", "<=", hasta)
      );

      const snapshot = await getDocs(q);
      const resultados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (resultados.length === 0) {
        Swal.fire('Error', 'No se encontraron datos en ese rango de fechas.', 'error');
        setDatosConsultados([]);
        return;
      }

      setDatosConsultados(resultados);
      setSeleccionados([]);
      setTodosSeleccionados(false);
    }
    catch (error) {
      console.error("Error consultando:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error al consultar datos',
        text: 'Hubo un problema al consultar datos en Firestore.',
      });
    }
  };

  const eliminarSeleccionados = async () => {
    if (seleccionados.length === 0) {
      Swal.fire('Atención', 'No has seleccionado ningún dato.', 'warning');
      return;
    }

    const confirmacion = await Swal.fire({
      title: `¿Eliminar ${seleccionados.length} registros?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const batch = writeBatch(db);

      seleccionados.forEach(id => batch.delete(doc(db, 'datos_prediccion', id)));

      await batch.commit();

      Swal.fire('Eliminado', 'Los registros seleccionados fueron eliminados.', 'success');

      consultarDatosPorFecha();

    } catch (error) {
      console.error('Error al eliminar:', error);
      Swal.fire('Error', 'No se pudieron eliminar los datos.', 'error');
    }
  };

  const consultarUsuarios = async () => {
    const coleccionUsuarios = await getDocs(collection(db, "usuarios"));
    const listaUsuarios = coleccionUsuarios.docs.map(doc => doc.data());

    // Ordenar por fecha de creación (createdAt) descendente.
    // Si no tiene fecha, se asume fecha muy antigua (0) para que quede al final.
    listaUsuarios.sort((a, b) => {
      const fechaA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const fechaB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return fechaB - fechaA; // Descendente: más nuevo primero
    });

    setUsuarios(listaUsuarios);
  };

  const guardarCambios = async (usuarioActualizado) => {
    try {
      const referenciaUsuario = doc(db, "usuarios", usuarioActualizado.uid);

      await updateDoc(referenciaUsuario, {
        displayName: usuarioActualizado.displayName,
        rol: usuarioActualizado.rol
      });

      Swal.fire({
        icon: 'success',
        title: 'Usuario actualizado',
        showConfirmButton: false,
        timer: 1500
      });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al actualizar',
        text: error.message
      });
    }
  };

  const eliminarUsuario = async (uid) => {
    const confirmacion = await Swal.fire({
      title: '¿Eliminar usuario?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "usuarios", uid));

      Swal.fire({
        icon: 'success',
        title: 'Usuario eliminado',
        showConfirmButton: false,
        timer: 1500
      });

      consultarUsuarios();

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al eliminar',
        text: error.message
      });
    }
  };

  useEffect(() => {
    const cargarEstadoScripts = async () => {
      try {
        const ref = doc(db, "control", "raspberry");
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          const estadoInicial = {
            "control-manual": false,
            "receptor-esp32cam": false,
            "publicador-backend": false
          };
          await setDoc(ref, estadoInicial);
          setEstadoScripts(estadoInicial);
        } else {
          setEstadoScripts(snap.data());
        }

      } catch (err) {
        console.error(err);
        Swal.fire("Error", "No se pudo cargar el estado de los scripts", "error");
      } finally {
        setCargandoScripts(false);
      }
    };
    cargarEstadoScripts();

    const cargarConfigSensores = async () => {
      try {
        const ref = doc(db, "configuracion", "sensores_ids");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setSensorIds(snap.data());
          setOriginalSensorIds(snap.data());
        } else {
          // Valores por defecto si no existe
          const defaultIds = {
            "lux": "c__xAdagZt",
            "temperatura": "2YP05e2OJn",
            "humedad": "bE2cfFYNOb",
            "fotoresistor14": "5yGByZteCo",
            "fotoresistor15": "5F8G85TZbx",
            "fotoresistor16": "f_YuWDYdEK",
            "fotoresistor17": "bDSxbLv8WC",
            "servo9": "UABLf30rXs",
            "servo10": "ukM1OFB7aK",
            "voltaje_producido": "bCWJ8-N523",
            "corriente_producida": "BaFyMI7dyt",
            "potencia_producida": "M3aST67ykz",
            "irradiancia": "7MgDweKh1O",
            "voltaje_bateria": "dN2Qi1v1hE",
            "corriente_bateria": "qLiz_RNNqD",
            "potencia_bateria": "4-zoFUcK4R",
            "nubosidad": "4PJ31yj_Lf",
          };
          setSensorIds(defaultIds);
          setOriginalSensorIds(defaultIds);
          await setDoc(ref, defaultIds);
        }
      } catch (error) {
        console.error("Error cargando IDs de sensores:", error);
        Swal.fire("Error", "No se pudieron cargar los IDs de sensores", "error");
      } finally {
        setCargandoSensores(false);
      }
    };
    cargarConfigSensores();
  }, []);

  useEffect(() => {
    if (esAdmin) {
      consultarUsuarios();
    }
  }, [esAdmin]);

  if (!esAdmin) {
    return <AccesoRestringido />;
  }

  const actualizarScript = async (nombre, valor) => {
    try {
      const nuevoEstado = { ...estadoScripts, [nombre]: valor };
      setEstadoScripts(nuevoEstado);
      await setDoc(doc(db, "control", "raspberry"), nuevoEstado);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo actualizar el estado en Firestore", "error");
    }
  };

  const guardarSensorIds = async () => {
    try {
      await setDoc(doc(db, "configuracion", "sensores_ids"), sensorIds);
      setOriginalSensorIds(sensorIds);
      setEditandoSensores(false);
      Swal.fire("Éxito", "Configuración de IDs actualizada correctamente", "success");
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo guardar la configuración", "error");
    }
  };

  const cancelarEdicion = () => {
    setSensorIds(originalSensorIds);
    setEditandoSensores(false);
  };

  const avatarFallback = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  return (
    <div className=' '>



      <div className='div-externo '>
        <h1 className='text-2xl font-bold p-1 text-center block bg-white dark:bg-black rounded-full dark:text-white transition-all'>
          Usuarios Registrados
        </h1>
      </div>

      <div className=''>
        <ul className='space-y-3 m-3'>
          {usuarios.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage).map((usuario) => (
            <li
              key={usuario.uid}
              className="flex justify_between items-center bg-white dark:bg-zinc-800 dark:text-gray-00 p-3 rounded shadow transition-all"
            >
              <div className="flex items-center gap-4">
                <img
                  src={usuario.photoURL || avatarFallback}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full"
                  onError={(e) => {
                    if (e.currentTarget.src !== avatarFallback) {
                      e.currentTarget.src = avatarFallback;
                    }
                  }}
                />
                <div>
                  <input
                    className="text-lg font-bold bg-transparent border-b border-gray-300"
                    value={usuario.displayName || ""}
                    onChange={(e) => {
                      const nuevos = usuarios.map(u => u.uid === usuario.uid ? { ...u, displayName: e.target.value } : u);
                      setUsuarios(nuevos);
                    }}
                  />
                  <p className="text-sm text-gray-600">{usuario.email}</p>

                  <div className="mt-1">
                    Rol:
                    <select
                      className="ml-2 px-1 border rounded"
                      value={usuario.rol}
                      onChange={(e) => {
                        const nuevos = usuarios.map(u => u.uid === usuario.uid ? { ...u, rol: parseInt(e.target.value) } : u);
                        setUsuarios(nuevos);
                      }}
                    >
                      <option value={1}>Usuario</option>
                      <option value={3}>Administrador</option>
                    </select>

                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => guardarCambios(usuario)}
                  className="bg-blue-500 text-white px-3 py-1 cursor-pointer rounded"
                >
                  Guardar
                </button>

                <button
                  onClick={() => eliminarUsuario(usuario.uid)}
                  className="bg-red-500 text-white px-3 py-1 cursor-pointer rounded"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 mx-3 p-2 bg-white dark:bg-zinc-800 rounded shadow">
          <div className='flex items-center gap-2 mb-2 sm:mb-0'>
            <span className='text-sm text-gray-600 dark:text-gray-300'>Mostrar</span>
            <select
              className='border rounded p-1 dark:bg-zinc-700 dark:text-white'
              value={usersPerPage}
              onChange={(e) => {
                setUsersPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 25, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className='text-sm text-gray-600 dark:text-gray-300'>usuarios por página</span>
          </div>

          <div className='flex items-center gap-2'>
            <button
              className='px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50'
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </button>
            <span className='text-sm'>
              Página {currentPage} de {Math.max(1, Math.ceil(usuarios.length / usersPerPage))}
            </span>
            <button
              className='px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50'
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(usuarios.length / usersPerPage)))}
              disabled={currentPage >= Math.ceil(usuarios.length / usersPerPage)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <div className='div-externo mt-6'>
        <h1 className='text-2xl font-bold p-1 text-center block bg-white dark:bg-black rounded-full dark:text-white transition-all'>
          Gestión del Prototipo IoT
        </h1>
      </div>

      <div className="bg-white dark:bg-zinc-800 p-4 rounded shadow mb-4">
        <h2 className="text-xl font-semibold mb-2">Opciones del Prototipo</h2>
        {cargandoScripts ? (
          <p>Cargando estado de los scripts...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[
              { id: 'publicador-backend', label: 'Activar envío de datos' },
              { id: 'receptor-esp32cam', label: 'Activar captura de imagenes' }
            ].map((opcion) => (
              <div key={opcion.id} className="flex items-center justify-between">
                <span className="capitalize">{opcion.label}</span>
                <label className="inline-flex relative items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={estadoScripts[opcion.id] || false}
                    onChange={(e) => actualizarScript(opcion.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700/50 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <span>📡</span> Configuración de IDs de Sensores
          </h2>
          <div className="flex gap-2">
            {!editandoSensores ? (
              <button
                onClick={() => setEditandoSensores(true)}
                className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 transition-colors"
              >
                Editar
              </button>
            ) : (
              <>
                <button
                  onClick={cancelarEdicion}
                  className="text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none dark:bg-zinc-700 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarSensorIds}
                  className="text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus:ring-emerald-800 transition-colors shadow-lg"
                >
                  Guardar
                </button>
              </>
            )}
          </div>
        </div>

        {cargandoSensores ? (
          <div className="flex justify-center p-4">
            <p className="text-gray-500 animate-pulse">Cargando configuración...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-indigo-900 uppercase bg-indigo-50 dark:bg-zinc-900 dark:text-indigo-300">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold tracking-wider">Sensor</th>
                  <th scope="col" className="px-6 py-4 font-bold tracking-wider">ID Sensor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                {Object.entries(sensorIds)
                  .sort(([keyA], [keyB]) => {
                    const order = ['lux', 'temperatura', 'humedad', 'nubosidad'];
                    const indexA = order.indexOf(keyA);
                    const indexB = order.indexOf(keyB);

                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;

                    return keyA.localeCompare(keyB);
                  })
                  .map(([key, value]) => (
                    <tr key={key} className="bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors duration-150">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white capitalize flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${['lux', 'temperatura', 'humedad', 'nubosidad'].includes(key) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500'
                          }`}></div>
                        {key.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setSensorIds(prev => ({ ...prev, [key]: e.target.value }))}
                          disabled={!editandoSensores}
                          maxLength={100}
                          className={`block w-full p-2.5 text-sm rounded-lg border transition-all
                                            ${editandoSensores
                              ? 'bg-gray-50 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-900 dark:border-zinc-600 dark:text-white shadow-sm focus:shadow-md'
                              : 'bg-gray-100 border-transparent text-gray-500 cursor-not-allowed dark:bg-zinc-900/50 dark:text-gray-400'
                            }`}
                          placeholder="Ingrese ID..."
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/*
      <div className='p-4 mt-10 bg-white dark:bg-zinc-800 rounded shadow'>
        <h2 className='text-xl font-semibold mb-3 text-center'>
          Subir datos meteorológicos (CSV)
        </h2>

        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="input-csv"
          onChange={(e) => {
            const archivo = e.target.files[0];
            if (!archivo) return;

            Papa.parse(archivo, {
              header: true,
              skipEmptyLines: true,
              complete: (result) => {
                const datos = result.data.map(fila => {
                  const { anio, mes, dia, hora, minuto } = fila;
                  const fecha = new Date(anio, mes - 1, dia, hora, minuto);

                  return {
                    timestamp: fecha,
                    anio: parseInt(anio),
                    mes: parseInt(mes),
                    dia: parseInt(dia),
                    hora: parseInt(hora),
                    minuto: parseInt(minuto),
                    lux: parseFloat(fila.lux),
                    temperatura: parseFloat(fila.temperatura),
                    humedad: parseFloat(fila.humedad),
                    irradiancia: parseFloat(fila.irradiancia),
                    nubosidad: parseFloat(fila.nubosidad),
                    potencia_producida: parseFloat(fila.potencia_producida),
                  };
                });

                setDatosCargados(datos);
              },
              error: (err) => {
                console.error("Error al leer el archivo CSV:", err);
                Swal.fire({
                  icon: 'error',
                  title: 'Error al leer CSV',
                  text: 'No se pudo procesar el archivo CSV.',
                });
              }
            });
          }}
        />

        <div className="flex flex-col items-center gap-4 mt-4">
          <label htmlFor="input-csv" className="bg-indigo-600 text-white px-6 py-2 rounded-lg cursor-pointer shadow hover:bg-indigo-700 transition">
            Seleccionar archivo CSV
          </label>

          {datosCargados.length > 0 && (
            <>
              <div className="max-h-[400px] overflow-y-auto w_full border rounded-lg shadow bg-white dark:bg-zinc-700">
                <table className="table-auto w-full text-sm text-center">
                  <thead className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-white sticky top-0 z-10">
                    <tr>
                      <th>Fecha</th>
                      <th>Lux</th>
                      <th>Temp</th>
                      <th>Humedad</th>
                      <th>Irrad.</th>
                      <th>Nubosidad</th>
                      <th>Potencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosCargados.map((fila, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-600">
                        <td>{fila.dia}/{fila.mes}/{fila.anio} {fila.hora}:{fila.minuto}</td>
                        <td>{fila.lux}</td>
                        <td>{fila.temperatura}</td>
                        <td>{fila.humedad}</td>
                        <td>{fila.irradiancia}</td>
                        <td>{fila.nubosidad}</td>
                        <td>{fila.potencia_producida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 mt-4">
                <button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg shadow transition"
                  onClick={async () => {
                    try {
                      const col = collection(db, "datos_prediccion");
                      let batch = writeBatch(db);
                      let operacionesEnBatch = 0;
                      let subidos = 0;

                      for (let i = 0; i < datosCargados.length; i++) {
                        const dato = datosCargados[i];
                        const docId = `${dato.anio}-${dato.mes}-${dato.dia}-${dato.hora}-${dato.minuto}`;
                        const ref = doc(col, docId);

                        batch.set(ref, dato);
                        operacionesEnBatch++;
                        subidos++;

                        if (operacionesEnBatch === 500) {
                          await batch.commit();
                          batch = writeBatch(db);
                          operacionesEnBatch = 0;
                        }
                      }

                      if (operacionesEnBatch > 0) {
                        await batch.commit();
                      }

                      Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: `Subidos: ${subidos} registros`,
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true,
                      });

                      setDatosCargados([]);
                    } catch (error) {
                      console.error("Error al subir a Firestore:", error);
                      Swal.fire('Error', 'No se pudieron subir los datos.', 'error');
                    }
                  }}
                >
                  Subir a Firestore
                </button>

                <button
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg shadow transition"
                  onClick={() => {
                    setDatosCargados([]);
                  }}
                >
                  Limpiar tabla
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      */}

      {/*
      <div className="my-6 p-4 bg-white dark:bg-zinc-800 rounded shadow">
        <h2 className="text-xl font-semibold mb-4 text-center">
          Consulta de Datos Metereológicos Disponibles
        </h2>

        <div className="flex flex-col items-center gap-4 mb-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <label className="text-sm">
              Desde:
              <input
                type="datetime-local"
                className="ml-2 border px-2 py-1 rounded"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
              />
            </label>

            <label className="text-sm">
              Hasta:
              <input
                type="datetime-local"
                className="ml-2 border px-2 py-1 rounded"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
              />
            </label>
          </div>

          <button
            onClick={consultarDatosPorFecha}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
          >
            Consultar
          </button>
        </div>

        {datosConsultados.length > 0 && (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded">
              <table className="table-auto w-full text-sm text-center">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={todosSeleccionados}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setTodosSeleccionados(checked);
                          setSeleccionados(checked ? datosConsultados.map(d => d.id) : []);
                        }}
                      />
                    </th>
                    <th>Fecha</th>
                    <th>Lux</th>
                    <th>Temp</th>
                    <th>Humedad</th>
                    <th>Irrad.</th>
                    <th>Nubosidad</th>
                    <th>Potencia</th>
                  </tr>
                </thead>

                <tbody>
                  {datosConsultados.map((fila, idx) => (
                    <tr key={fila.id} className="hover:bg-gray-50">
                      <td>
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(fila.id)}
                          onChange={(e) => {
                            const nuevos = [...seleccionados];
                            if (e.target.checked) {
                              nuevos.push(fila.id);
                            } else {
                              const index = nuevos.indexOf(fila.id);
                              if (index !== -1) nuevos.splice(index, 1);
                            }
                            setSeleccionados(nuevos);
                            setTodosSeleccionados(nuevos.length === datosConsultados.length);
                          }}
                        />
                      </td>

                      <td>{fila.dia}/{fila.mes ?? '??'}/{fila.anio ?? '??'} {fila.hora}:{fila.minuto}</td>
                      <td>{fila.lux}</td>
                      <td>{fila.temperatura}</td>
                      <td>{fila.humedad}</td>
                      <td>{fila.irradiancia}</td>
                      <td>{fila.nubosidad}</td>
                      <td>{fila.potencia_producida ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={eliminarSeleccionados}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow"
            >
              Eliminar seleccionados
            </button>
          </>
        )}

        <div className="mt-8 p-4 bg-white dark:bg-zinc-800 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Configurar URL de la Cámara</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://mi-nuevo-link.ngrok.io"
              value={nuevoUrlNgrok}
              onChange={(e) => setNuevoUrlNgrok(e.target.value)}
              className="flex-1 px-2 py-1 border rounded"
            />
            <button
              onClick={guardarUrlNgrok}
              className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
            >
              Guardar
            </button>
          </div>
        </div>

      </div>
      */}

    </div>
  )
}
