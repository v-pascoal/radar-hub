
import React from 'react';
import { UserRole } from '../types';

interface LandingPageProps {
  onStart: (role: UserRole) => void;
  onViewHowItWorks: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onViewHowItWorks }) => {
  return (
    <div className="animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-40 -z-10"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-40 -z-10"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <span className="inline-block bg-[#593EFF]/10 text-[#593EFF] text-[10px] font-black px-5 py-2 rounded-full mb-8 tracking-[0.2em] uppercase shadow-sm">
              Tecnologia em Defesa Jurídica
            </span>
            <h1 className="text-5xl lg:text-7xl font-[900] text-[#2d2b6b] mb-8 leading-[1.1] italic tracking-tight uppercase">
              Conectamos você ao seu <span className="text-[#593EFF]">Especialista</span> em trânsito
            </h1>
            <p className="text-xl text-slate-600 mb-12 max-w-xl leading-relaxed">
              O Radar Hub é o meio seguro para contratar <strong>advogados independentes</strong>. Nós garantimos o melhor preço e a segurança do seu pagamento.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
              <button 
                onClick={() => onStart(UserRole.CLIENT)}
                className="px-10 py-5 bg-[#593EFF] text-white font-black rounded-2xl hover:bg-[#4836cc] hover:scale-105 transition-all shadow-2xl shadow-indigo-200 text-[11px] uppercase tracking-widest"
              >
                Garantir minha Defesa
              </button>
              <button 
                onClick={onViewHowItWorks}
                className="px-10 py-5 bg-white border-2 border-[#2d2b6b] text-[#2d2b6b] font-black rounded-2xl hover:bg-slate-50 transition-all text-[11px] uppercase tracking-widest"
              >
                Como Funciona
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative">
            <div className="bg-white p-3 rounded-[3rem] shadow-2xl border border-slate-100 rotate-1">
              <img 
                src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800&h=600" 
                alt="Defesa Jurídica Especializada" 
                className="rounded-[2.5rem] object-cover w-full h-[450px]"
              />
            </div>
            {/* Floating Info */}
            <div className="absolute -bottom-8 -left-8 bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-50 max-w-[240px]">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocolo Seguro</span>
                </div>
                <div className="text-[#2d2b6b] font-black text-sm leading-tight uppercase italic tracking-tighter">Honorários protegidos pela plataforma.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-[#2d2b6b] py-24 px-6 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <h2 className="text-4xl font-black mb-16 italic uppercase tracking-tighter">Nosso Ecossistema</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="p-10 border-2 border-dashed border-white/20 rounded-[3rem] hover:bg-white/5 transition-all">
                <div className="text-5xl mb-6">🚗</div>
                <h4 className="text-xl font-black uppercase italic tracking-tighter mb-2">Você (Condutor)</h4>
                <p className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-widest">Busca a melhor defesa técnica.</p>
            </div>
            
            <div className="flex flex-col items-center">
                <div className="bg-[#593EFF] p-12 rounded-[2.5rem] shadow-2xl shadow-indigo-500/20 mb-6 rotate-45 group hover:rotate-0 transition-transform duration-500">
                    <svg width="40" height="40" viewBox="0 0 35 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="-rotate-45 group-hover:rotate-0 transition-transform duration-500">
                        <path d="M24.6476 0H18.7884V13.3274L10.5522 2.89302L5.9567 6.52149L13.8069 16.4683L1.64561 12.9089L0 18.5283L12.1613 22.0918L0.182845 26.2322L2.09663 31.7664L14.075 27.6259L6.7084 37.9384L11.4746 41.3434L18.8412 31.0309L18.8087 43.7041L24.6638 43.7204L34.83 21.7383L24.6476 0Z" fill="white" />
                    </svg>
                </div>
                <h4 className="text-2xl font-[900] text-[#593EFF] uppercase tracking-tighter mb-1 italic leading-none">Radar Hub</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Smart Intermediation</p>
                <div className="flex gap-4 mt-8 opacity-20">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </div>
            </div>

            <div className="p-10 border-2 border-dashed border-white/20 rounded-[3rem] hover:bg-white/5 transition-all">
                <div className="text-5xl mb-6">⚖️</div>
                <h4 className="text-xl font-black uppercase italic tracking-tighter mb-2">Advogado Especialista</h4>
                <p className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-widest">Profissional técnico autônomo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1">
                <h2 className="text-4xl font-black text-[#2d2b6b] mb-8 italic uppercase tracking-tighter">Transparência <span className="text-[#593EFF]">Total</span></h2>
                <p className="text-slate-600 text-lg mb-8 leading-relaxed font-medium">
                    Nós eliminamos a incerteza. O Radar Hub padroniza honorários baseados na complexidade técnica. Você paga à plataforma, e nós liberamos o valor ao advogado somente após o protocolo comprovado.
                </p>
                <button 
                  onClick={onViewHowItWorks}
                  className="flex items-center gap-3 text-[#593EFF] font-black uppercase text-[11px] tracking-[0.2em] group transition-all"
                >
                    Entenda nosso modelo de negócio
                    <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
            </div>
            <div className="order-1 lg:order-2 bg-[#1e1b4b] p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#593EFF]/10 to-transparent pointer-events-none"></div>
                <div className="text-center relative z-10">
                    <span className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Honorário Sugerido</span>
                    <div className="text-7xl font-black text-white mt-6 mb-2 italic tracking-tighter">R$ 490<span className="text-2xl text-slate-500">,00</span></div>
                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mt-4">Protocolo Garantido Radar Hub</p>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
