//UserProvider.jsx
import React, { createContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Crea el contexto para el usuario, que se usará para acceder a la información en toda la app.
export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Estado para almacenar el usuario autenticado o `false` si no hay sesión.
  const [user, setUser] = useState(false);

  // Hook para escuchar los cambios en la autenticación de Firebase.
  useEffect(() => {
    // Se suscribe a los cambios de autenticación.
    const unsuscribe = onAuthStateChanged(auth, async (usuarioFirebase) => {
      if (usuarioFirebase) {
        try {
          // Si hay usuario autenticado, busca su documento en Firestore.
          const refDoc = doc(db, "usuarios", usuarioFirebase.uid);
          const documentoObtenido = await getDoc(refDoc);

          if (documentoObtenido.exists()) {
            // Si existe en Firestore, actualiza el estado con sus datos.
            const datos = documentoObtenido.data();
            setUser(datos);
          } else {
            // Si no existe en Firestore, lo considera sin sesión.
            setUser(false);
          }
        } catch (error) {
          // Manejo de errores al consultar Firestore.
          console.error("Error al obtener usuario de Firestore:", error);
          setUser(false);
        }
      } else {
        // Si no hay usuario autenticado en Firebase, establece el estado en `false`.
        setUser(false);
      }
    });

    // Limpia la suscripción al desmontar el componente.
    return () => unsuscribe();
  }, []);

  /**
   * Cierra la sesión del usuario.
   */
  const cerrarSesion = async () => {
    try {
      await signOut(auth); // Cierra sesión en Firebase Auth.
      setUser(false);      // Limpia el estado local.
      console.log("Sesión cerrada");
    } catch (error) {
      console.error("Error al cerrar sesión.", error);
    }
  };

  /**
   * Inicia sesión con Google y crea el documento en Firestore si no existe.
   */
  /**
   * Registra un usuario con correo y contraseña y datos extendidos.
   */
  const registrarUsuario = async (email, password, nombre, apellido, username) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Actualizar el perfil con el nombre completo o username (usaremos Nombre + Apellido)
      const fullName = `${nombre} ${apellido}`;
      await updateProfile(user, { displayName: fullName });

      // Crear documento en Firestore con todos los campos
      const refDoc = doc(db, "usuarios", user.uid);
      const userData = {
        uid: user.uid,
        email: user.email,
        nombre: nombre,
        apellido: apellido,
        username: username,
        displayName: fullName,
        photoURL: null,
        rol: 1,
        createdAt: new Date().toISOString()
      };

      await setDoc(refDoc, userData);

      // Actualizar estado local
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error("Error en registro:", error);
      return { success: false, error };
    }
  };

  /**
   * Inicia sesión con correo y contraseña.
   */
  const loginConEmail = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // El onAuthStateChanged se encargará de actualizar el estado user
      return { success: true };
    } catch (error) {
      console.error("Error en login:", error);
      return { success: false, error };
    }
  };

  /**
   * Envía correo de recuperación de contraseña.
   */
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error("Error en reset password:", error);
      return { success: false, error };
    }
  };

  const loginConGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Abre el popup de autenticación con Google.
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const refDoc = doc(db, "usuarios", user.uid);
      let documentoObtenido = await getDoc(refDoc);

      if (!documentoObtenido.exists()) {
        // Si el documento no existe, lo crea con los datos del usuario.
        const nuevoUsuario = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          rol: 1 // Asigna rol por defecto.
        };

        await setDoc(refDoc, nuevoUsuario);
        documentoObtenido = await getDoc(refDoc);
      }

      // Actualiza el estado local con los datos del documento de Firestore.
      const datosActualizados = documentoObtenido.data();
      setUser(datosActualizados);

      console.log("Usuario autenticado y cargado desde Firestore:", datosActualizados);
    } catch (error) {
      console.error("Error en login con Google:", error);
    }
  };

  // Devuelve el provider para que los hijos tengan acceso al contexto.
  return (
    <UserContext.Provider value={{
      user,
      setUser,
      loginConGoogle,
      cerrarSesion,
      registrarUsuario,
      loginConEmail,
      resetPassword
    }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
