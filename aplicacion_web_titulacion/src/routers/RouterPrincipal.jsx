// RouterPrincipal.jsx
import { BrowserRouter } from 'react-router-dom';
import { RutasConLayout } from './RutasConLayout';

// Componente principal que define el enrutamiento de la aplicación
export const RouterPrincipal = () => {
  return (
    // Habilita las rutas y la navegación con historial de navegador
    <BrowserRouter>
      {/* Renderiza las rutas con el layout común de la app */}
      <RutasConLayout />
    </BrowserRouter>
  );
};
