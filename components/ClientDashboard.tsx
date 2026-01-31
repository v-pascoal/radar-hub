
import React, { useState, useEffect, useRef } from 'react';
import { ProcessRequest, ProcessStatus, User, FineDetail } from '../types';
import { RadarApiService } from '../services/api';

const ClientDashboard: React.FC<{ onLogout: () => void, user: User }> = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'history' | 'profile'>('requests');
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myProcesses, setMyProcesses] = useState<ProcessRequest[]>([]);
  const [profileAvatar, setProfileAvatar] = useState(user.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    type: 'Suspensão' as 'Suspensão' | 'Cassação',
    description: '',
    fines: [{ id: '1', points: 0, documentUrl: '', documentName: '' }] as FineDetail[]
  });

  useEffect(() => {
    const loadData = async () => {
      const history = await RadarApiService.getClientHistory(user.id || 'guest');
      setMyProcesses(history);
    };
    loadData();
  }, [user.id]);

  const getStatusLabel = (status: ProcessStatus) => {
    const labels: Record<ProcessStatus, string> = {
      [ProcessStatus.AWAITING_LAWYERS]: 'Aguardando Advogados',
      [ProcessStatus.AWAITING_SELECTION]: 'Aguardando Sua Escolha',
      [ProcessStatus.AWAITING_PAYMENT]: 'Aguardando Pagamento',
      [ProcessStatus.STARTED]: 'Processo Iniciado',
      [ProcessStatus.IN_PROGRESS]: 'Processo em Andamento',
      [ProcessStatus.FINISHED]: 'Processo Finalizado',
    };
    return labels[status] || status;
  };

  const addFine = () => {
    setFormData({
      ...formData,
      fines: [...formData.fines, { id: Date.now().toString(), points: 0, documentUrl: '', documentName: '' }]
    });
  };

  const updateFine = (id: string, field: keyof FineDetail, value: any) => {
    setFormData({
      ...formData,
      fines: formData.fines.map(f => f.id === id ? { ...f, [field]: value } : f)
    });
  };

  const removeFine = (id: string) => {
    if (formData.fines.length > 1) {
      setFormData({ ...formData, fines: formData.fines.filter(f => f.id !== id) });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteData = () => {
    if (confirm("LGPD: Deseja apagar permanentemente todos os seus dados e histórico da plataforma? Esta ação não pode ser desfeita.")) {
      localStorage.clear();
      onLogout();
    }
  };

  const handleSubmitDefense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const totalPoints = formData.fines.reduce((sum, f) => sum + (f.points || 0), 0);
    try {
      const result = await RadarApiService.submitDefenseRequest({
        client_id: user.id,
        type: formData.type,
        fines: formData.fines,
        totalPoints
      });
      if (result.success) {
        const newProcess: ProcessRequest = {
          id: result.messageId,
          readable_id: 'RAD-' + Math.floor(1000 + Math.random() * 9000),
          client_id: user.id || 'guest',
          clientName: user.name,
          type: formData.type,
          fines: formData.fines,
          totalPoints,
          value: formData.type === 'Cassação' ? 980 : 490,
          deadline: 'Análise imediata',
          status: ProcessStatus.AWAITING_LAWYERS,
          description: formData.description,
          created_at: new Date().toISOString()
        };
        const updated = [newProcess, ...myProcesses];
        setMyProcesses(updated);
        localStorage.setItem(`defenses_${user.id}`, JSON.stringify(updated));
        setShowNewRequestModal(false);
        setFormData({ type: 'Suspensão', description: '', fines: [{ id: '1', points: 0, documentUrl: '', documentName: '' }] });
      }
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      <aside className="w-full md:w-80 bg-[#1e1b4b] text-white p-8 flex flex-col z-20 sticky top-0 md:h-screen">
         <div className="mb-12 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#593EFF] rounded-lg flex items-center justify-center font-black italic shadow-lg shadow-indigo-500/30">R</div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">Radar <span className="text-[#593EFF]">Hub</span></h1>
         </div>
         <nav className="flex-grow space-y-3">
            {[
              { id: 'requests', label: 'Meus processos', icon: 'M9 12l2 2 4-4' },
              { id: 'history', label: 'Histórico', icon: 'M12 8v4l3 3' },
              { id: 'profile', label: 'Meus Dados', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)} 
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-[#593EFF] text-white shadow-xl shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                {item.label}
              </button>
            ))}
         </nav>
         <div className="mt-auto pt-8 border-t border-white/5">
            <button onClick={onLogout} className="w-full text-slate-500 hover:text-rose-400 font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-3 px-6 py-4">SAIR DA CONTA</button>
         </div>
      </aside>

      <main className="flex-grow p-6 md:p-12">
         {/* Cabeçalho de Meus Processos */}
         {activeTab === 'requests' && (
           <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">Meus <span className="text-[#593EFF]">processos</span></h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Acompanhamento Radar Hub</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowTimelineModal(true)}
                    className="px-6 py-4 rounded-2xl border-2 border-slate-200 text-slate-400 font-black uppercase text-[9px] tracking-widest hover:border-[#593EFF] hover:text-[#593EFF] transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Timeline das Etapas
                  </button>
                  <button 
                      onClick={() => setShowNewRequestModal(true)}
                      className="bg-[#593EFF] text-white px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                      Nova Solicitação
                  </button>
                </div>
             </header>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {myProcesses.map(process => (
                   <div key={process.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                      <div className="flex justify-between items-start mb-6">
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-[#593EFF] uppercase tracking-widest">{process.readable_id}</span>
                            <h3 className="text-2xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">{process.type}</h3>
                         </div>
                         <div className="bg-indigo-50 px-4 py-2 rounded-xl text-center border border-indigo-100">
                            <span className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest">Total</span>
                            <span className="font-black text-[#593EFF] text-lg">{process.totalPoints} pts</span>
                         </div>
                      </div>
                      
                      <div className="space-y-4 mb-8">
                         <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2">{process.description || `Defesa de ${process.type} composta por ${process.fines.length} multas.`}</p>
                         <div className="flex flex-wrap gap-2">
                            {process.fines.map((f, idx) => (
                               <div key={f.id} className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                                  <div className="w-4 h-4 bg-[#593EFF]/10 text-[#593EFF] rounded flex items-center justify-center text-[9px] font-black">{idx + 1}</div>
                                  <span className="text-[10px] font-black text-slate-500 uppercase">{f.points} PTS</span>
                               </div>
                            ))}
                         </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-6 flex justify-between items-center border border-slate-100">
                         <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Radar</span>
                            <span className="text-[11px] font-black text-[#593EFF] uppercase italic flex items-center gap-2">
                               <div className="w-2 h-2 bg-[#593EFF] rounded-full animate-pulse"></div>
                               {getStatusLabel(process.status)}
                            </span>
                         </div>
                      </div>
                   </div>
                ))}
                {myProcesses.length === 0 && (
                   <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                      <div className="text-5xl mb-6 grayscale opacity-20">📡</div>
                      <h4 className="text-xl font-black text-slate-300 uppercase italic tracking-tighter">Nenhuma causa ativa</h4>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Clique em "Nova Solicitação" para iniciar sua defesa.</p>
                   </div>
                )}
             </div>
           </div>
         )}

         {activeTab === 'history' && (
           <div className="max-w-6xl mx-auto py-24 text-center animate-in fade-in duration-500">
              <div className="text-5xl mb-6 opacity-30">📚</div>
              <h4 className="text-xl font-black text-slate-300 uppercase italic tracking-tighter">Histórico Vazio</h4>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Quando concluir um processo você poderá visualizar todo o histórico aqui.</p>
           </div>
         )}

         {activeTab === 'profile' && (
           <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100">
                <header className="flex items-center gap-8 mb-12 relative group">
                   <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 bg-[#1e1b4b] rounded-full flex items-center justify-center text-4xl text-white font-black shadow-2xl border-4 border-[#593EFF] relative overflow-hidden cursor-pointer group"
                    >
                      {profileAvatar ? (
                        <img src={profileAvatar} className="w-full h-full object-cover" alt="Perfil" />
                      ) : user.name?.[0]}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                   </div>
                   <div>
                      <h3 className="text-3xl font-[900] text-[#1e1b4b] italic uppercase tracking-tighter leading-none">{user.name}</h3>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Condutor Verificado Radar Hub</p>
                   </div>
                </header>
                <div className="grid grid-cols-1 gap-4">
                   {[
                     { label: 'Documento ID', value: user.documentId },
                     { label: 'Data de Nascimento', value: user.birthDate || 'N/A' },
                     { label: 'WhatsApp', value: user.phone },
                     { label: 'Plataforma Ativa', value: 'Desde Out/2023' }
                   ].map(item => (
                     <div key={item.label} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                        <span className="font-bold text-[#1e1b4b] uppercase text-xs">{item.value}</span>
                     </div>
                   ))}
                </div>
                <div className="mt-12 space-y-4">
                  <button onClick={onLogout} className="w-full py-5 bg-rose-50 text-rose-600 font-black rounded-2xl border border-rose-100 uppercase text-[10px] tracking-[0.2em] hover:bg-rose-100 transition-all">Encerrar Sessão</button>
                  <button onClick={handleDeleteData} className="w-full py-4 text-slate-400 font-black uppercase text-[8px] tracking-widest hover:text-rose-500 transition-all text-center">LGPD: Apagar meus dados e esquecer conta</button>
                </div>
             </div>
           </div>
         )}
      </main>

      {/* Modal - Timeline das Etapas */}
      {showTimelineModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden p-10 md:p-14 animate-in zoom-in-95">
             <header className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">Jornada <span className="text-[#593EFF]">Radar</span></h2>
                <button onClick={() => setShowTimelineModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </header>
             <div className="space-y-6">
                {[
                  { t: 'Aguardando Advogados', d: 'Seu caso foi publicado no marketplace. Advogados especialistas estão analisando seu caso.' },
                  { t: 'Aguardando Sua Escolha', d: 'Um ou mais advogados aceitaram o desafio. Escolha o profissional que melhor lhe atende.' },
                  { t: 'Aguardando Pagamento', d: 'O pagamento é retido pelo Radar Hub e só liberado ao advogado após o protocolo comprovado.' },
                  { t: 'Processo Iniciado', d: 'O advogado recebeu a documentação e começou a redigir sua peça técnica de defesa.' },
                  { t: 'Processo em Andamento', d: 'A defesa foi protocolada. Estamos acompanhando os prazos e respostas dos órgãos.' },
                  { t: 'Processo Finalizado', d: 'O trâmite foi encerrado e o resultado final da sua defesa foi disponibilizado.' },
                ].map((step, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-[#593EFF] text-white flex items-center justify-center text-[10px] font-black">{i+1}</div>
                      {i < 5 && <div className="w-0.5 flex-grow bg-slate-100 mt-1"></div>}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-[#1e1b4b] uppercase tracking-widest mb-1">{step.t}</h4>
                      <p className="text-slate-500 text-[10px] leading-relaxed font-medium">{step.d}</p>
                    </div>
                  </div>
                ))}
             </div>
             <button onClick={() => setShowTimelineModal(false)} className="w-full mt-10 py-5 bg-[#1e1b4b] text-white font-black rounded-2xl uppercase text-[10px] tracking-widest">Entendi</button>
          </div>
        </div>
      )}

      {/* Modal - Nova Defesa (Mobile Friendly) */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
            <div className="p-10 md:p-14 overflow-y-auto">
              <header className="flex justify-between items-center mb-8">
                 <h2 className="text-3xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">Causa <span className="text-[#593EFF]">Digital</span></h2>
                 <button onClick={() => setShowNewRequestModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-rose-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </header>

              <div className="mb-8 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-black text-[#593EFF] uppercase tracking-widest">Dúvidas sobre o fluxo?</p>
                   <button onClick={() => setShowTimelineModal(true)} className="text-[10px] font-black text-[#1e1b4b] uppercase underline decoration-[#593EFF] underline-offset-4 mt-1">Ver etapas do processo</button>
                </div>
                <div className="text-2xl">⚡</div>
              </div>

              <form onSubmit={handleSubmitDefense} className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Modalidade da Defesa</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['Suspensão', 'Cassação'].map(t => (
                      <button key={t} type="button" onClick={() => setFormData({...formData, type: t as any})} className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 transition-all ${formData.type === t ? 'border-[#593EFF] bg-indigo-50 text-[#593EFF]' : 'border-slate-100 text-slate-400'}`}>{t}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detalhes das Multas</label>
                      <button type="button" onClick={addFine} className="text-[9px] font-black text-[#593EFF] uppercase tracking-[0.2em] bg-indigo-50 px-4 py-2 rounded-xl">+ Nova Multa</button>
                   </div>
                   
                   <div className="space-y-3">
                      {formData.fines.map((fine, index) => (
                         <div key={fine.id} className="p-4 bg-slate-50 rounded-[1.8rem] border border-slate-100 relative animate-in slide-in-from-right-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Pontos {index + 1}</label>
                                  <input 
                                    type="number" 
                                    required
                                    placeholder="Ex: 7"
                                    className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-[#593EFF] font-black text-[#1e1b4b]"
                                    value={fine.points || ''}
                                    onChange={e => updateFine(fine.id, 'points', parseInt(e.target.value))}
                                  />
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">PDF Notificação</label>
                                  <div className="relative h-[48px]">
                                     <input 
                                       type="file" 
                                       required
                                       className="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                       onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) updateFine(fine.id, 'documentName', file.name);
                                       }}
                                     />
                                     <div className={`w-full h-full px-4 flex items-center rounded-xl border-2 border-dashed transition-all ${fine.documentName ? 'border-[#593EFF] bg-indigo-50 text-[#593EFF]' : 'border-slate-200 text-slate-400'}`}>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <span className="text-[9px] font-black uppercase truncate">{fine.documentName || 'Anexar PDF'}</span>
                                     </div>
                                  </div>
                               </div>
                            </div>
                            {formData.fines.length > 1 && (
                               <button type="button" onClick={() => removeFine(fine.id)} className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                            )}
                         </div>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Observações Técnicas</label>
                   <textarea 
                     className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100 outline-none focus:border-[#593EFF] h-24 resize-none font-medium text-slate-600 shadow-inner"
                     placeholder="Relate aqui irregularidades que o advogado deve saber..."
                     value={formData.description}
                     onChange={e => setFormData({...formData, description: e.target.value})}
                   />
                </div>

                <div className="bg-[#1e1b4b] p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                   <div className="flex justify-between items-center relative z-10">
                      <div>
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total a Investir</span>
                         <span className="text-3xl font-[900] text-white italic">R$ {formData.type === 'Cassação' ? '980' : '490'}<span className="text-xs font-normal text-slate-400 ml-1">/ Único</span></span>
                      </div>
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="px-8 py-5 bg-[#593EFF] text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all"
                      >
                         {isSubmitting ? '...' : 'Iniciar Defesa'}
                      </button>
                   </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
