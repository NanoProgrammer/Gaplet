'use client';
import React, { useEffect } from 'react';

export default function TV() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      document.getElementById('face')?.classList.add('opacity-0');
      document.getElementById('loading')?.classList.add('opacity-100');
    }, 400); // más rápido si quieres transición corta

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="rotate-z-25">
      <div className="w-[160px] h-[145px] bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-[12px] border-slate-400 rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden">



        {/* ANIMACIÓN DE CARGANDO */}
        <div
          id="loading"
          className="absolute flex gap-[10px] opacity-0 transition-opacity duration-700 ease-in-out"
        >
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>

      </div>
    </div>
  );
}
