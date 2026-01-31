
import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onLogin: (role: UserRole) => void;
  onNavigateHome: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onLogin, onNavigateHome }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm px-4 md:px-6 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo Radar Hub */}
        <div 
          className="flex items-center gap-2 md:gap-3 cursor-pointer group"
          onClick={() => { onNavigateHome(); setIsMenuOpen(false); }}
        >
          <svg width="30" height="38" viewBox="0 0 35 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform group-hover:scale-110 transition-transform duration-300">
            <path d="M24.6476 0H18.7884V13.3274L10.5522 2.89302L5.9567 6.52149L13.8069 16.4683L1.64561 12.9089L0 18.5283L12.1613 22.0918L0.182845 26.2322L2.09663 31.7664L14.075 27.6259L6.7084 37.9384L11.4746 41.3434L18.8412 31.0309L18.8087 43.7041L24.6638 43.7204L34.83 21.7383L24.6476 0Z" fill="#593EFF"/>
          </svg>
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-[900] text-[#2d2b6b] italic tracking-tighter leading-none uppercase">
              Radar <span className="text-[#593EFF]">Hub</span>
            </span>
            <span className="text-[8px] md:text-[10px] font-bold text-[#2d2b6b] tracking-[0.1em] leading-none mt-0.5 uppercase">
              sua melhor defesa
            </span>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => { onNavigateHome(); setIsMenuOpen(false); }} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-[#593EFF] transition-colors">Como funciona</button>
          
          <div className="w-px h-4 bg-slate-200 mx-2"></div>

          {user.isLoggedIn ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-black text-[#2d2b6b] leading-tight">{user.name}</div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{user.role === UserRole.LAWYER ? 'Especialista' : 'Condutor'}</div>
              </div>
              <button onClick={onLogout} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => onLogin(UserRole.LAWYER)} className="text-[10px] font-black uppercase tracking-widest text-[#2d2b6b] hover:text-[#593EFF] transition-colors">Sou Advogado</button>
              <button onClick={() => onLogin(UserRole.CLIENT)} className="bg-[#593EFF] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 transition-all">Garantir Defesa</button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-[#2d2b6b]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 p-6 flex flex-col gap-4 animate-slide">
          {!user.isLoggedIn ? (
            <>
              <button onClick={() => { onLogin(UserRole.LAWYER); setIsMenuOpen(false); }} className="w-full py-4 text-[#2d2b6b] font-black uppercase text-xs tracking-widest border-2 border-slate-100 rounded-2xl">Sou Advogado</button>
              <button onClick={() => { onLogin(UserRole.CLIENT); setIsMenuOpen(false); }} className="w-full py-4 bg-[#593EFF] text-white font-black uppercase text-xs tracking-widest rounded-2xl">Minha Conta</button>
            </>
          ) : (
            <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full py-4 bg-rose-50 text-rose-600 font-black uppercase text-xs tracking-widest rounded-2xl">Sair da Conta</button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
