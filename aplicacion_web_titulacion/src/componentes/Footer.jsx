//Footer.jsx
import React from 'react'
import Herramientas from '../assets/Herramientas.png'
import { NavLink } from 'react-router-dom'
import Facebook from '../assets/Facebook.png'
import Instagram from '../assets/Instagram.png'
import Whatsapp from '../assets/Whatsapp.png'

export const Footer = () => {
    return (
        <div className='div-externo !rounded-3xl ml-13  mr-13 mt-4  '>
            <div className='bg-whie  text-white p-4   border-black rounded-3xl  bg-white  dark:bg-black  dark:text-black  '>
                <footer className='flex flex-row items-center md:items-start gap-8   '>
                    {/* Navegación */}
                    {/* <div className='flex flex-col items-center'>
                        <h2 className='text-black dark:text-white font-bold text-lg font-sans transition-colors duration-500 ease-in-out pb-2  '> Navegación </h2>
                        <nav className='flex flex-col pt-1  pl-4 '>

                            <ul>
                                <li className='div-externo text-center'>
                                    <NavLink to="/inicio" className="nav-header !text-base ">Inicio</NavLink>
                                </li>
                                <li className='div-externo text-center'>
                                    <NavLink to="/dashboard" className="nav-header !text-base ">Dashboard</NavLink>
                                </li>
                                <li className='div-externo text-center'>
                                    <NavLink to="/apirestinfo" className="nav-header !text-base ">API Rest Info</NavLink>
                                </li>
                                <li className='div-externo text-center'>
                                    <NavLink to="/camara" className="nav-header !text-base ">Cámara</NavLink>
                                </li>
                                <li className='div-externo text-center'>
                                    <NavLink to="/admin" className="nav-header !text-base ">Admin</NavLink>
                                </li>
                            </ul>
                        </nav>
                    </div> */}



                    {/* Encuentranos */}
                    <div className='flex flex-col items-center '>
                        <h2 className='text-black dark:text-white  font-bold text-lg font-sans transition-colors duration-500 ease-in-out pb-2 '>Encuéntranos</h2>
                        <iframe className="pl-20  w-[900px] h-50 " src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d997.0378214180355!2d-78.67976109217857!3d-1.6563362584192427!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x91d307e9dbe7e383%3A0x2dd6483268d79c2a!2sEscuela%20De%20Ingenieria%20En%20Sistemas!5e0!3m2!1ses!2sec!4v1746361242047!5m2!1ses!2sec" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                        <p className='text-black text-xs dark:text-white font-semibold '> Av. Pedro Vicente Maldonado, Edificio de Ingeniería en Software</p>
                    </div>

                    {/* Separador vertical */}
                    <div className="separador-vertical"></div>


                    {/* Redes Sociales */}
                    <div className='mr-8  flex flex-col items-center '>
                        <h2 className='text-black dark:text-white  font-bold text-lg font-sans transition-colors duration-500 ease-in-out pb-4  text-center '> Redes Sociales</h2>
                        <div className='flex flex-col gap-9 '>

                            <div className='flex flex-row items-center gap-2'>
                                <img src={Facebook} alt="Facebook" className="w-10 h-10" />
                                <h3 className='redes-efectos'>@DeepSunLy_fb</h3>
                            </div>

                            <div className='flex flex-row items-center gap-2'>
                                <img src={Instagram} alt="Instagram" className="w-10 h-10" />
                                <h3 className='redes-efectos'>@DeepSunLy_ig</h3>
                            </div>

                            <div className='flex flex-row items-center gap-2'>
                                <img src={Whatsapp} alt="Whatsapp" className="w-10 h-10" />
                                <h3 className='redes-efectos'>09 9462 2454</h3>
                            </div>


                        </div>
                    </div>
                </footer>

                {/* Línea horizontal */}
                <div className='relative mt-2 '>
                    <hr className='relative -mb-0.5  text-white dark:text-black  border-2  z-50 transition-colors duration-200s ' />
                    <div className='div-externo !h-[1px] relative z-10  ' />

                </div>

                {/* Texto final de la aplicación web */}
                <div className='text-black -mt-1   mb-0.5  text-center dark:text-white  font-semibold text-xs'>
                    <p>&copy; Todos los derechos reservados 2025 | Trabajo de Titulación: Sistema Inteligente Basado en Machine Learning para Predecir la Producción de Energía Solar | Integrantes: Fernando González, Dayana Paladines  </p>
                </div>

            </div>
        </div>
    )
}

