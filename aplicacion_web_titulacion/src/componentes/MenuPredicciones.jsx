// MenuPredicciones.jsx
import React, { useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { FiChevronRight, FiChevronDown } from "react-icons/fi";
import { IoChevronForwardSharp } from "react-icons/io5";

export const MenuPredicciones = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  const timeoutRef = useRef(null);
  const subTimeoutRef = useRef(null); // Nuevo ref para el submenu

  if (!user || user.rol < 1) return null;

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsSubOpen(false);
    }, 200);
  };

  // Manejadores para el submenu con retardo
  const handleSubMouseEnter = () => {
    clearTimeout(subTimeoutRef.current);
    setIsSubOpen(true);
  };

  const handleSubMouseLeave = () => {
    subTimeoutRef.current = setTimeout(() => {
      setIsSubOpen(false);
    }, 400); // 400ms de gracia para mover el mouse al submenu
  };

  return (
    <div
      className="relative inline-block text-black dark:text-white text-lg font-bold"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="cursor-pointer hover:text-lime-400 px-2 flex items-center space-x-1">
        <span>Predicciones</span>

        <span className="text-xl transition-transform duration-200">
          {isOpen ? <FiChevronDown /> : <FiChevronRight />}
        </span>
      </div>


      {isOpen && (
        <div
          className="
            absolute left-0 mt-1
            bg-white dark:bg-gray-900
            shadow-xl rounded-md
            w-48 z-50
            transition-all
          "
          style={{ paddingTop: "4px", paddingBottom: "4px" }}
        >
          {/* Tiempo Real como estaba antes */}
          <NavLink
            to="/predicciontiemporeal"
            className="
              block px-4 py-2 
              text-black dark:text-white text-base font-bold 
              hover:bg-gray-100 dark:hover:bg-zinc-700
            "
            onClick={() => setIsOpen(false)}
          >
            Tiempo Real
          </NavLink>

          {/* Estática con submenú */}
          <div
            className="relative"
            onMouseEnter={handleSubMouseEnter}
            onMouseLeave={handleSubMouseLeave}
          >
            <div
              className="
                flex items-center justify-between
                px-4 py-2
                text-black dark:text-white text-base font-bold
                hover:bg-gray-100 dark:hover:bg-zinc-700
                cursor-default
              "
            >
              <span>Estática</span>
              {/* Flechita indicando submenú */}
              <div className="ml-2 text-xl">
                {isSubOpen ? (
                  <FiChevronRight />   // flecha vacía cuando está abierto
                ) : (
                  <IoChevronForwardSharp /> // flecha rellena cuando está cerrado
                )}
              </div>
            </div>

            {isSubOpen && (
              <div
                className="
                  absolute top-0 left-full ml-1
                  bg-white dark:bg-gray-900
                  shadow-xl rounded-md
                  w-56 z-50
                "
                style={{ paddingTop: "4px", paddingBottom: "4px" }}
                onMouseEnter={handleSubMouseEnter} // Mantiene abierto si entras al hijo
              >
                <NavLink
                  to="/prediccionestatica"
                  className="
                    block px-4 py-2
                    text-black dark:text-white text-base font-bold
                    hover:bg-gray-100 dark:hover:bg-zinc-700
                  "
                  onClick={() => {
                    setIsSubOpen(false);
                    setIsOpen(false);
                  }}
                >
                  Carga manual
                </NavLink>

                <NavLink
                  to="/prediccionestaticacsv"
                  className="
                    block px-4 py-2
                    text-black dark:text-white text-base font-bold
                    hover:bg-gray-100 dark:hover:bg-zinc-700
                  "
                  onClick={() => {
                    setIsSubOpen(false);
                    setIsOpen(false);
                  }}
                >
                  Carga con CSV
                </NavLink>
              </div>
            )}
          </div>


        </div>
      )}
    </div>
  );
};
