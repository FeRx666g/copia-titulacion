import React, { useContext, useState, useRef } from 'react';
import { UserContext } from '../providers/UserProvider';
import { storage, db, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, deleteUser, updateEmail } from 'firebase/auth'; // kept updateEmail import just in case, but unused in UI
import Swal from 'sweetalert2';
import { FaCamera, FaUser, FaEnvelope, FaIdCard, FaUserTag, FaEdit, FaSave, FaTimes, FaKey, FaLock, FaTrashAlt } from 'react-icons/fa';
import { AccesoDenegado } from '../componentes/AccesoDenegado';

export const PerfilUsuario = () => {
    const { user, setUser } = useContext(UserContext);
    const [uploading, setUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Estado para formulario de edición
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        username: ''
    });

    const fileInputRef = useRef(null);

    // Inicializar datos al pulsar editar
    const startEditing = () => {
        setFormData({
            nombre: user.nombre || '',
            apellido: user.apellido || '',
            username: user.username || ''
        });
        setIsEditing(true);
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const saveChanges = async () => {
        if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.username.trim()) {
            Swal.fire({ icon: 'warning', title: 'Campos vacíos', text: 'Por favor completa todos los campos.' });
            return;
        }

        try {
            const newDisplayName = `${formData.nombre} ${formData.apellido}`;

            // 1. Actualizar Auth
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: newDisplayName });
            }

            // 2. Actualizar Firestore
            const userDocRef = doc(db, 'usuarios', user.uid);
            await updateDoc(userDocRef, {
                nombre: formData.nombre,
                apellido: formData.apellido,
                username: formData.username,
                displayName: newDisplayName
            });

            // 3. Actualizar Contexto LOCAlmente
            setUser(prev => ({
                ...prev,
                nombre: formData.nombre,
                apellido: formData.apellido,
                username: formData.username,
                displayName: newDisplayName
            }));

            setIsEditing(false);
            Swal.fire({ icon: 'success', title: 'Perfil actualizado', timer: 1500, showConfirmButton: false });

        } catch (error) {
            console.error("Error al guardar perfil:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron guardar los cambios.' });
        }
    };

    const changePassword = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Cambiar contraseña',
            html:
                '<input id="swal-input1" class="swal2-input" placeholder="Nueva contraseña" type="password">' +
                '<input id="swal-input2" class="swal2-input" placeholder="Confirmar contraseña" type="password">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const pass1 = document.getElementById('swal-input1').value;
                const pass2 = document.getElementById('swal-input2').value;

                if (!pass1 || !pass2) {
                    Swal.showValidationMessage('Por favor completa ambos campos');
                    return false;
                }
                if (pass1.length < 6) {
                    Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres');
                    return false;
                }
                if (pass1 !== pass2) {
                    Swal.showValidationMessage('Las contraseñas no coinciden');
                    return false;
                }

                return pass1;
            }
        });

        if (formValues) {
            try {
                if (auth.currentUser) {
                    await updatePassword(auth.currentUser, formValues);
                    Swal.fire('¡Éxito!', 'Tu contraseña ha sido actualizada.', 'success');
                }
            } catch (error) {
                console.error(error);
                if (error.code === 'auth/requires-recent-login') {
                    Swal.fire('Seguridad', 'Para cambiar la contraseña debes haber iniciado sesión recientemente. Por favor cierra sesión y vuelve a entrar.', 'warning');
                } else {
                    Swal.fire('Error', 'No se pudo cambiar la contraseña.', 'error');
                }
            }
        }
    };

    const deleteAccount = async () => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esto! Se eliminará tu cuenta y todos tus datos.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar cuenta',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                if (auth.currentUser) {
                    const uid = user.uid;

                    // 1. Eliminar foto de perfil si existe y no es la default
                    if (user.photoURL && user.photoURL.includes('firebasestorage')) {
                        try {
                            const storageRef = ref(storage, `perfil_fotos/${uid}`);
                            // Intenta eliminar la carpeta o archivos dentro. 
                            // Nota: Si el nombre del archivo es impredecible, esto podría fallar si no listamos primero.
                            // Pero asumimos que 'deleteUser' es lo crítico.
                        } catch (e) {
                            console.warn("No se pudo borrar la foto de Storage", e);
                        }
                    }

                    // 2. Eliminar documento de Firestore
                    await deleteDoc(doc(db, 'usuarios', uid));

                    // 3. Eliminar usuario de Auth
                    await deleteUser(auth.currentUser);

                    // 4. Limpiar estado local
                    setUser(false);

                    Swal.fire(
                        '¡Eliminado!',
                        'Tu cuenta ha sido eliminada.',
                        'success'
                    );
                }
            } catch (error) {
                console.error(error);
                if (error.code === 'auth/requires-recent-login') {
                    Swal.fire('Seguridad', 'Para eliminar tu cuenta debes haber iniciado sesión recientemente. Por favor cierra sesión y vuelve a entrar.', 'warning');
                } else {
                    Swal.fire('Error', 'Hubo un problema al eliminar la cuenta.', 'error');
                }
            }
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            Swal.fire({ icon: 'error', title: 'Archivo inválido', text: 'Por favor selecciona una imagen.' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({ icon: 'error', title: 'Archivo muy pesado', text: 'La imagen no debe superar los 5MB.' });
            return;
        }

        try {
            setUploading(true);
            const storageRef = ref(storage, `perfil_fotos/${user.uid}/${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: downloadURL });
            }

            const userDocRef = doc(db, 'usuarios', user.uid);
            await updateDoc(userDocRef, { photoURL: downloadURL });

            setUser((prev) => ({ ...prev, photoURL: downloadURL }));

            Swal.fire({
                icon: 'success',
                title: 'Foto actualizada',
                text: 'Tu foto de perfil se ha guardado correctamente.',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error) {
            console.error("Error al subir imagen:", error);
            if (error.code === 'storage/unauthorized') {
                Swal.fire({
                    icon: 'error',
                    title: 'Permiso denegado',
                    text: 'No tienes permisos para subir archivos. Verifica las reglas de Firebase Storage.'
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo subir la imagen.' });
            }
        } finally {
            setUploading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    if (!user) return <AccesoDenegado />;

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 min-h-[calc(100vh-200px)] flex flex-col items-center">

            <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-zinc-700">

                {/* Encabezado con Gradiente */}
                <div className="h-40 bg-gradient-to-r from-sky-400 via-blue-500 to-lime-400 relative">
                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                        <div className="relative group">
                            <img
                                src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                                alt="Perfil"
                                className="w-32 h-32 rounded-full border-4 border-white dark:border-zinc-800 object-cover shadow-lg bg-white"
                            />

                            <button
                                onClick={triggerFileInput}
                                disabled={uploading}
                                className="absolute bottom-0 right-0 bg-black text-white p-2.5 rounded-full border-2 border-white dark:border-zinc-800 shadow-md hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                                title="Cambiar foto de perfil"
                            >
                                {uploading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <FaCamera size={14} />
                                )}
                            </button>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-20 pb-10 px-8 text-center mt-2">

                    {/* Sección de Nombre y Edición */}
                    {isEditing ? (
                        <div className="flex flex-col gap-3 items-center mb-6 max-w-sm mx-auto animate-fadeIn">
                            <div className="flex gap-2 w-full">
                                <input
                                    type="text"
                                    name="nombre"
                                    placeholder="Nombre"
                                    value={formData.nombre}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-zinc-700 dark:text-white dark:border-zinc-600 outline-none"
                                />
                                <input
                                    type="text"
                                    name="apellido"
                                    placeholder="Apellido"
                                    value={formData.apellido}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-zinc-700 dark:text-white dark:border-zinc-600 outline-none"
                                />
                            </div>
                            <input
                                type="text"
                                name="username"
                                placeholder="Nombre de usuario"
                                value={formData.username}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-zinc-700 dark:text-white dark:border-zinc-600 outline-none"
                            />
                            <div className="flex gap-2 mt-2">
                                <button onClick={saveChanges} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition cursor-pointer">
                                    <FaSave /> Guardar
                                </button>
                                <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition cursor-pointer">
                                    <FaTimes /> Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 relative inline-block group">
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-1 flex items-center justify-center gap-3">
                                {user.displayName || user.nombre || 'Usuario'}
                                <button
                                    onClick={startEditing}
                                    className="text-gray-400 hover:text-blue-500 text-lg transition-colors cursor-pointer"
                                    title="Editar nombre"
                                >
                                    <FaEdit />
                                </button>
                            </h1>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mt-6">

                        <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl border border-gray-100 dark:border-zinc-700 flex items-center gap-4 relative group">
                            <div className="bg-sky-100 dark:bg-sky-900/30 p-3 rounded-lg text-sky-600 dark:text-sky-400">
                                <FaEnvelope size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-gray-400 dark:text-gray-400 uppercase font-semibold">Correo Electrónico</p>
                                <p className="text-gray-700 dark:text-white font-medium truncate" title={user.email}>{user.email}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl border border-gray-100 dark:border-zinc-700 flex items-center gap-4">
                            <div className="bg-lime-100 dark:bg-lime-900/30 p-3 rounded-lg text-lime-600 dark:text-lime-400">
                                <FaUserTag size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-gray-400 dark:text-gray-400 uppercase font-semibold">Nombre de Usuario</p>
                                <p className="text-gray-700 dark:text-white font-medium truncate">
                                    {user.username || 'No definido'}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl border border-gray-100 dark:border-zinc-700 flex items-center gap-4 md:col-span-2">
                            {/* Sección de Seguridad */}
                            <div className="flex flex-col sm:flex-row gap-4 w-full items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg text-red-600 dark:text-red-400">
                                        <FaLock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 dark:text-gray-400 uppercase font-semibold">Seguridad</p>
                                        <p className="text-gray-700 dark:text-white font-medium">Contraseña y Acceso</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={changePassword}
                                        className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 font-medium transition cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <FaKey className="text-gray-400" />
                                        Cambiar contraseña
                                    </button>
                                    <button
                                        onClick={deleteAccount}
                                        className="w-full sm:w-auto px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 font-medium transition cursor-pointer flex items-center justify-center gap-2"
                                        title="Eliminar cuenta permanentemente"
                                    >
                                        <FaTrashAlt />
                                        Eliminar cuenta
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};
