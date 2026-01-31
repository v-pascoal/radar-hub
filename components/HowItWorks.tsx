
import React from 'react';

const HowItWorks: React.FC = () => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-[900] text-[#2d2b6b] mb-6 italic uppercase tracking-tighter">
            Transparência é nossa <span className="text-[#593EFF]">prioridade</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            O Radar Hub é uma plataforma de tecnologia que conecta condutores a advogados especialistas. 
            Nós cuidamos da inteligência de dados e do pagamento, enquanto o seu caso é defendido por um profissional autônomo.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#593EFF]/5 rounded-full"></div>
              <div className="w-12 h-12 bg-[#593EFF] text-white rounded-xl flex items-center justify-center font-black text-xl mb-6">1</div>
              <h3 className="text-2xl font-black text-[#2d2b6b] mb-4">Conexão</h3>
              <p className="text-slate-500 leading-relaxed">
                Você envia seu caso e nosso algoritmo identifica o advogado parceiro com melhor histórico de vitórias para o seu tipo de multa.
              </p>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
               <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#593EFF]/5 rounded-full"></div>
              <div className="w-12 h-12 bg-[#593EFF] text-white rounded-xl flex items-center justify-center font-black text-xl mb-6">2</div>
              <h3 className="text-2xl font-black text-[#2d2b6b] mb-4">Pagamento Seguro</h3>
              <p className="text-slate-500 leading-relaxed">
                O Radar Hub atua como o meio de pagamento. Seu investimento fica protegido e só é repassado ao advogado após o protocolo comprovado.
              </p>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
               <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#593EFF]/5 rounded-full"></div>
              <div className="w-12 h-12 bg-[#593EFF] text-white rounded-xl flex items-center justify-center font-black text-xl mb-6">3</div>
              <h3 className="text-2xl font-black text-[#2d2b6b] mb-4">Execução Técnica</h3>
              <p className="text-slate-500 leading-relaxed">
                O trabalho jurídico é realizado exclusivamente por um <strong>advogado devidamente inscrito na OAB</strong>, com total autonomia técnica.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#2d2b6b] text-white text-center">
        <div className="max-w-3xl mx-auto">
          <svg className="w-20 h-20 mx-auto mb-8 text-[#593EFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04 Pel6 6 0 00-1.2 7.81c.895 2.447 2.13 4.82 4.001 6.707L12 21l3.817-3.817c1.871-1.887 3.106-4.26 4.002-6.707a6 6 0 00-1.2-7.81z" />
          </svg>
          <h2 className="text-4xl font-black mb-6 italic">Garantia de Preço e Qualidade</h2>
          <p className="text-xl text-indigo-100 mb-10">
            Nossa plataforma padroniza os honorários para que você não pague preços abusivos, garantindo que o especialista receba o valor justo por uma defesa de alta qualidade.
          </p>
          <div className="inline-block px-8 py-4 bg-white/10 border border-white/20 rounded-2xl text-sm font-bold uppercase tracking-widest">
            Radar Hub: Tecnologia na Intermediação Jurídica
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
