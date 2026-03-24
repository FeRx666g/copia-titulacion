import { Routes, Route, useLocation } from 'react-router-dom';
import { Inicio } from '../paginas/Inicio';
import { PrediccionEstatica } from '../paginas/PrediccionEstatica';
import { PrediccionEstaticaCSV } from '../paginas/PrediccionEstaticaCSV';
import { Dashboard } from '../paginas/Dashboard';
import { APIRestinfo } from '../paginas/APIRestinfo';
import { Camara } from '../paginas/Camara';
import { Admin } from '../paginas/Admin';
import { Header } from '../componentes/Header';
import { ModoOscuro } from '../componentes/ModoOscuro';
import { Footer } from '../componentes/Footer';
import { APIKeysPage } from '../paginas/APIKeysPage';
import { useEffect, useContext } from 'react';
import { UserContext } from '../providers/UserProvider';
import { Dispositivos } from '../paginas/Dispositivos';
import { VistaTablero } from '../paginas/VistaTablero';
import { verificarRolBackend } from '../utils/verificarRolBackend';
import { auth } from '../firebase';
import { PrediccionTiempoReal } from '../paginas/PrediccionTiempoReal';
import { Error404 } from '../paginas/Error404';
import { PerfilUsuario } from '../paginas/PerfilUsuario';

export const RutasConLayout = () => {
  const { user, setUser } = useContext(UserContext);
  const location = useLocation();
  const ocultarModoOscuro = location.pathname.startsWith('/tablero/');
  const esVistaTablero = location.pathname.startsWith('/tablero/');

  const esVistaSinHeaderFooter = (
    (location.pathname === "/dashboard" || location.pathname.startsWith("/tablero/"))
    && user
  );

  const esPaginaInicio = location.pathname === '/' || location.pathname === '/inicio';

  useEffect(() => {
    const validarRol = async () => {
      if (user && auth.currentUser) {
        const rolSeguro = await verificarRolBackend();
        if (rolSeguro !== null && rolSeguro !== user.rol) {
          console.log("Rol actualizado desde backend:", rolSeguro);
          setUser((prev) => ({ ...prev, rol: rolSeguro }));
        }
      }
    };
    validarRol();
  }, [location.pathname]);

  useEffect(() => {
    const ruta = location.pathname;
    let titulo = "DeepSunly";

    if (ruta === "/" || ruta === "/inicio") titulo = "DeepSunly: Inicio";
    else if (ruta === "/dashboard") titulo = "DeepSunly: Dashboard";
    else if (ruta === "/apirestinfo") titulo = "DeepSunly: API REST";
    else if (ruta === "/mis-apikeys") titulo = "DeepSunly: API Keys";
    else if (ruta === "/dispositivos") titulo = "DeepSunly: Sensores";
    else if (ruta === "/admin") titulo = "DeepSunly: Administración";
    else if (ruta.startsWith("/tablero/")) titulo = "DeepSunly: Tablero";

    document.title = titulo;
  }, [location.pathname]);

  return (
    <div className='flex flex-col min-h-screen'>
      {!esVistaSinHeaderFooter && <Header />}

      {!ocultarModoOscuro && <ModoOscuro />}

      {esVistaTablero ? (
        <Routes>
          <Route path="/tablero/:idTablero" element={<VistaTablero />} />
        </Routes>
      ) : (
        <main className='flex-grow mt-4 rounded-2xl transition-all ml-14 mr-14'>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/prediccionestatica" element={<PrediccionEstatica />} />
            <Route path="/prediccionestaticacsv" element={<PrediccionEstaticaCSV />} />
            <Route path="/predicciontiemporeal" element={<PrediccionTiempoReal />} />
            <Route path="/apirestinfo" element={<APIRestinfo />} />
            <Route path="/mis-apikeys" element={<APIKeysPage />} />
            <Route path="/dispositivos" element={<Dispositivos />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/perfil" element={<PerfilUsuario />} />
            <Route path="/*" element={<Error404 />} />
          </Routes>
        </main>
      )}

      {esPaginaInicio && <Footer />}
    </div>
  );
};