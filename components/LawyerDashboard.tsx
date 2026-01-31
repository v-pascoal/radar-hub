
import React, { useState, useEffect } from 'react';
import { ProcessRequest, ProcessStatus, User } from '../types';
import { DatabaseService } from '../services/api';

const LawyerDashboard: React.FC<{ onLogout: () => void, user: User }> = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'my_cases' | 'profile'>('requests');
  const [requests, setRequests] = useState<ProcessRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ProcessRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await DatabaseService.getOpenOpportunities();
      setRequests(data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleAccept = async (id: string) => {
    const success = await DatabaseService.acceptProcess(id, user.id || 'unknown');
    if (success) {
      // Fix: Changed non-existent 'ACCEPTED' to 'AWAITING_SELECTION' as the next logical state after a lawyer applies
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: ProcessStatus.AWAITING_SELECTION } : r));
      setSelectedRequest(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      <aside className="w-full md:w-80 bg-[#1e1b4b] text-white p-8 flex flex-col z-20 sticky top-0 md:h-screen shadow-2xl">
         <div className="mb-12 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#593EFF] rounded-lg flex items-center justify-center font-black italic">R</div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">Radar <span className="text-[#593EFF]">Hub</span></h1>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 block">Lawyer Panel</p>
         </div>
         <nav className="flex-grow space-y-3">
            {[
              { id: 'requests', label: 'Marketplace', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
              { id: 'my_cases', label: 'Minha Carteira', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { id: 'profile', label: 'Minha OAB', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745' }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)} 
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-[#593EFF] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                {item.label}
              </button>
            ))}
         </nav>
         <div className="mt-auto pt-8 border-t border-white/5">
            <button onClick={onLogout} className="w-full text-slate-500 hover:text-rose-400 font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-3 px-6">SAIR</button>
         </div>
      </aside>

      <main className="flex-grow p-6 md:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'requests' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div>
                     <h2 className="text-4xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">Feed de <span className="text-[#593EFF]">Oportunidades</span></h2>
                     <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Causas filtradas para sua especialidade</p>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Sincronizado via RabbitMQ</span>
                  </div>
               </header>

               {isLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {[1, 2, 3, 4].map(i => <div key={i} className="bg-white h-72 rounded-[3rem] animate-pulse"></div>)}
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {/* Fix: Changed non-existent 'PENDING' to 'AWAITING_LAWYERS' to filter open opportunities */}
                    {requests.filter(r => r.status === ProcessStatus.AWAITING_LAWYERS).map(req => (
                      <div 
                        key={req.id} 
                        className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer group flex flex-col" 
                        onClick={() => setSelectedRequest(req)}
                      >
                        <div className="flex justify-between items-start mb-8">
                           <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${req.type === 'Cassação' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                              {req.type}
                           </div>
                           <span className="text-2xl font-black text-[#1e1b4b] italic">R$ {req.value}</span>
                        </div>
                        
                        <h3 className="text-2xl font-black text-[#1e1b4b] mb-4 truncate">{req.clientName}</h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                           <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Carga Punitiva</span>
                              <span className="font-black text-[#1e1b4b] text-xl">{req.totalPoints} pts</span>
                           </div>
                           <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Multas</span>
                              <span className="font-black text-[#1e1b4b] text-xl">{req.fines?.length || 1} itens</span>
                           </div>
                        </div>

                        <button className="w-full mt-auto py-5 bg-[#1e1b4b] text-white font-black uppercase text-[10px] tracking-widest rounded-2xl group-hover:bg-[#593EFF] transition-all shadow-xl shadow-slate-100">
                           Analisar Detalhes do Caso
                        </button>
                      </div>
                    ))}
                    {/* Fix: Changed non-existent 'PENDING' to 'AWAITING_LAWYERS' to correctly check for empty state */}
                    {requests.filter(r => r.status === ProcessStatus.AWAITING_LAWYERS).length === 0 && (
                       <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                          <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma nova causa no radar no momento</p>
                       </div>
                    )}
                 </div>
               )}
            </div>
          )}

          {activeTab === 'profile' && (
             <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100">
                   <header className="flex items-center gap-8 mb-12">
                      <div className="w-24 h-24 bg-[#1e1b4b] rounded-[2rem] flex items-center justify-center text-4xl text-white font-black border-4 border-[#593EFF]">
                         {user.name?.[0]}
                      </div>
                      <div>
                         <h3 className="text-3xl font-black text-[#1e1b4b] italic uppercase tracking-tighter">{user.name}</h3>
                         <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Especialista OAB Ativo</p>
                      </div>
                   </header>
                   <div className="space-y-4">
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registro OAB</span>
                         <span className="font-black text-[#1e1b4b]">{user.oab || 'SP 000.000'}</span>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento (CPF/CNPJ)</span>
                         <span className="font-black text-[#1e1b4b]">{user.documentId}</span>
                      </div>
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>

      {/* Modal de Detalhes - Transparência Total para o Advogado */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 md:p-14 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
              <header className="flex justify-between items-start mb-10">
                 <div>
                    <span className="text-[10px] font-black text-[#593EFF] uppercase tracking-[0.2em]">{selectedRequest.readable_id}</span>
                    <h2 className="text-3xl font-black text-[#1e1b4b] uppercase italic tracking-tighter leading-none mt-2">Análise da <span className="text-[#593EFF]">Causa</span></h2>
                 </div>
                 <button onClick={() => setSelectedRequest(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-rose-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </header>

              <div className="space-y-8">
                 <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Relato do Condutor</span>
                    <p className="text-slate-600 font-medium leading-relaxed italic">{selectedRequest.description || "O condutor não forneceu descrição adicional."}</p>
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-6">
                       <span className="text-[10px] font-black text-[#1e1b4b] uppercase tracking-widest">Composição Punitiva ({selectedRequest.fines?.length} multas)</span>
                       <span className="text-[10px] font-black text-[#593EFF] uppercase tracking-widest">Total: {selectedRequest.totalPoints} pts</span>
                    </div>
                    <div className="space-y-4">
                       {selectedRequest.fines?.map((fine, idx) => (
                          <div key={idx} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm hover:border-[#593EFF]/30 transition-all group">
                             <div className="flex items-center gap-5">
                                <div className="w-10 h-10 bg-indigo-50 text-[#593EFF] rounded-xl flex items-center justify-center font-black border border-indigo-100">{idx + 1}</div>
                                <div>
                                   <span className="font-black text-[#1e1b4b] text-sm">{fine.points} Pontos</span>
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Notificação Verificada</p>
                                </div>
                             </div>
                             <button className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                             </button>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="flex gap-4 pt-6">
                    <button onClick={() => setSelectedRequest(null)} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Ignorar</button>
                    <button 
                      onClick={() => handleAccept(selectedRequest.id)} 
                      className="flex-1 py-5 bg-[#593EFF] text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
                    >Vincular-se à Causa</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default LawyerDashboard;
