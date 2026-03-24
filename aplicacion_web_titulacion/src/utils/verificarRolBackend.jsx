import { getIdToken } from 'firebase/auth';
import axios from 'axios';
import { auth } from '../firebase';

export const verificarRolBackend = async () => {

  const authUrl = '/auth';

  try {
    const token = await getIdToken(auth.currentUser);
    const response = await axios.get(`${authUrl}/verificar-rol`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 3000,
    });
    return response.data.rol;

  }
  catch (error) {
    console.warn('No se pudo verificar el rol en backend. Usando rol local.');
    return null;
  }
};