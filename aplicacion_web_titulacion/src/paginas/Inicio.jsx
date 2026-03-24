import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Arbol from '../assets/Arbol.png';
import Planeta from '../assets/Planeta2.png';
import DeepSunLyLetras from '../assets/DeepSunLyLetras.png';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserContext } from '../providers/UserProvider';
import { FaQuestion } from 'react-icons/fa'; 

export const Inicio = () => {
  const { user } = useContext(UserContext);
  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">¡Hola, {user?.displayName?.split(' ')[0] || 'Viajero'}!</h3>
          <p>Bienvenido a Deep SunLy. Te explicaremos brevemente qué puedes encontrar en el menú superior.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-header-inicio',
      content: 'Aquí siempre podrás volver a esta página principal para ver información general del proyecto.',
    },
    {
      target: '.tour-header-predicciones',
      content: 'En este menú desplegable encontrarás las herramientas de IA para predecir la producción de energía.',
    },
    {
      target: '.tour-header-tableros',
      content: 'Accede a tus tableros personalizados para visualizar los datos de tus sensores en tiempo real.',
    },
    {
      target: '.tour-header-dispositivos',
      content: 'Gestiona aquí tus sensores, conéctalos y configura sus parámetros.',
    },
    {
      target: '.tour-header-keys',
      content: 'En esta sección podrás generar tus API Keys para el envio de datos de sensores a la aplicación web.',
    },
    {
      target: '.tour-header-perfil',
      content: 'Aquí puedes entrar a tu perfil haciendo clic en tu nombre de usuario o cerrar sesión cuando termines.',
    }
  ];

  const stepsFiltrados = steps.filter(step => {
    if (step.target === 'body') return true;
    return document.querySelector(step.target);
  });

  useEffect(() => {
    const verificarTutorial = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            if (!docSnap.data().tutorialInicioVisto) {
              setStepIndex(0);
              setRunTutorial(true);
            }
          } else {
            setStepIndex(0);
            setRunTutorial(true);
          }
        } catch (error) {
          console.error("Error tutorial inicio:", error);
        }
      }
    };
    const timer = setTimeout(() => {
        verificarTutorial();
    }, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleJoyrideCallback = async (data) => {
    
    const { status, index, type, action } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTutorial(false);
      setStepIndex(0);
      
      if (user?.uid) {
        try {
          const docRef = doc(db, 'usuarios', user.uid);
          await setDoc(docRef, { tutorialInicioVisto: true }, { merge: true });
        } catch (error) {
          console.error("Error guardando tutorial inicio:", error);
        }
      }
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
        setStepIndex(nextIndex);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen pt-40 bg-white dark:bg-black text-center px-4">
      
      <Joyride
        steps={stepsFiltrados}
        run={runTutorial}
        stepIndex={stepIndex}
        continuous={true}
        showSkipButton={true}
        showProgress={false}
        callback={handleJoyrideCallback}
        
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#2563EB', 
            textColor: '#1F2937',
            backgroundColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.6)', 
            arrowColor: '#ffffff',
            width: 400, 
          },
          tooltip: {
            borderRadius: '16px', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', 
            padding: '20px',
            fontSize: '15px',
          },
          buttonNext: {
            backgroundColor: '#2563EB',
            color: '#fff',
            borderRadius: '8px', 
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            outline: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          },
          buttonBack: {
            color: '#6B7280', 
            marginRight: '15px',
            fontSize: '14px',
            fontWeight: '500',
          },
          buttonSkip: {
            color: '#EF4444', 
            fontSize: '14px',
          },
          title: {
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '10px',
            textAlign: 'left',
            color: '#111827',
          },
          content: {
            textAlign: 'left', 
            lineHeight: '1.6',
          }
        }}

        locale={{ 
          back: 'Atrás', 
          close: 'Cerrar', 
          last: 'Finalizar', 
          next: `Siguiente (${stepIndex + 1} de ${stepsFiltrados.length})`, 
          skip: 'Omitir' 
        }}
      />

      {/* Hero principal */}
      <div className="text-center max-w-4xl">
        <h1 className="text-5xl md:text-6xl font-extrabold text-cyan-400 mb-6">
          Bienvenido a Deep SunLy
        </h1>

        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
          Predice la producción de energía solar con inteligencia artificial, sensores IoT y visión por computadora.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/dashboard">
            <button className="px-6 py-2 rounded-full bg-white dark:bg-black text-cyan-400 border border-cyan-400 hover:bg-cyan-50 dark:hover:bg-zinc-900 font-bold transition">
              Ver Tableros
            </button>
          </Link>
        </div>
      </div>

      <div className="mt-10 text-sm text-gray-500 text-center mb-36">
        Proyecto de Titulación | Fernando González & Dayana Paladines — ESPOCH 2025
      </div>

      {/* Beneficios */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 px-6 max-w-6xl">
        {[
          {
            title: 'Adquisición de Datos',
            text: 'Captura de variables climáticas como temperatura, humedad y luz desde sensores IoT.'
          },
          {
            title: 'Predicción Inteligente',
            text: 'Modelo entrenado a través de datos históricos para estimar la producción energética.'
          },
          {
            title: 'Visualización Web',
            text: 'Tableros interactivos con gráficos para monitorear las información obtenida por sensores.'
          }
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl shadow-lg border border-cyan-400 transition"
          >
            <div className="bg-white dark:bg-black rounded-xl h-full p-5 text-black dark:text-white">
              <h3 className="text-xl font-bold mb-2 text-cyan-400">{item.title}</h3>
              <p className="text-base">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cómo funciona */}
      <div className="mt-16 max-w-5xl px-4">
        <h2 className="text-3xl font-bold mb-6 text-cyan-400">
          ¿Cómo funciona Deep SunLy?
        </h2>

        <div className="grid md:grid-cols-4 gap-6 text-left">
          {[
            'Sensado',
            'Procesamiento',
            'Predicción',
            'Visualización'
          ].map((title, idx) => (
            <div key={idx} className="relative bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-xl">
              <div className="absolute -top-3 -left-3 bg-cyan-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow">
                {idx + 1}
              </div>
              <h3 className="font-bold mb-2 text-cyan-400 mt-2">{title}</h3>
              <p className="text-gray-700 dark:text-gray-200">
                {[
                  'Los sensores IoT capturan datos de luz, temperatura, humedad y más.',
                  'Los datos no válidos se quitan en tiempo real.',
                  'Una modelo de Machine Learning predice la producción solar.',
                  'Los resultados se muestran en dashboards gráficos y en la nube.'
                ][idx]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Compromiso */}
      <div className="mt-20 max-w-6xl px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-cyan-400 mb-6">
          Nuestro compromiso con el planeta 🌍
        </h2>

        <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-10">
          En Deep SunLy creemos que la tecnología puede proteger el medio ambiente.
          Buscamos impulsar el uso inteligente de energía solar y apoyar comunidades sostenibles.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center justify-center">
          {[
            { img: Arbol, text: 'Monitoreamos variables naturales' },
            { img: Planeta, text: 'Reducimos la huella de carbono' },
            { img: DeepSunLyLetras, text: 'Proyecto ESPOCH 2025' }
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-lg border border-cyan-400"
            >
              <img src={item.img} alt={item.text} className="w-24 h-24 object-contain" />
              <p className="mt-2 text-sm text-black dark:text-white">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ¿Por qué usar? */}
      <div className="mt-20 max-w-6xl px-4 text-center">
        <h2 className="text-3xl font-bold text-cyan-400 mb-10">
          ¿Por qué usar Deep SunLy?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: '🔋 Optimiza tu Energía',
              text: 'Con predicciones diarias de producción solar, puedes planificar el uso de energía con eficiencia.'
            },
            {
              title: '📡 Visualiza en Tiempo Real',
              text: 'Dashboard interactivo y datos climáticos centralizados en un solo lugar.'
            },
            {
              title: '🌱 Ayuda al Planeta',
              text: 'Cada watt bien utilizado reduce emisiones y ayuda a construir un futuro más sostenible.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl shadow-lg border border-cyan-400"
            >
              <div className="bg-white dark:bg-black rounded-2xl p-6 text-black dark:text-white hover:scale-105 transition h-full">
                <h3 className="text-lg font-bold mb-2 text-cyan-400">{item.title}</h3>
                <p className="text-sm">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Despedida */}
      <div className="mt-20 mb-20 text-center px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-cyan-400 mb-4">
          ¡Gracias por visitarnos!
        </h2>

        <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
          Este proyecto ha sido desarrollado con dedicación, aprendizaje y mucho cariño.
          Te invitamos a seguir explorando y ser parte del cambio hacia un futuro más sostenible.
        </p>
      </div>
      
      {/* Botón Flotante de Ayuda (Solo visible si hay usuario) */}
      {user && (
        <button
          onClick={() => {
              setStepIndex(0);
              setRunTutorial(true);
          }}
          className="fixed bottom-6 right-6 w-12 h-12 bg-white text-blue-600 rounded-full cursor-pointer shadow-lg border border-blue-100 flex items-center justify-center text-xl hover:bg-blue-50 hover:scale-110 transition-all duration-300 z-40 group"
          title="Ver tutorial de ayuda"
        >
          <FaQuestion />
          
          <span className="absolute right-14 bg-gray-800 text-white text-xs px-2 py-1 cursor-pointer rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Ayuda
          </span>
        </button>
      )}

    </div>
  );
};