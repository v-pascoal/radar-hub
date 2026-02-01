
import React, { useState, useEffect, useRef } from 'react';
import { ProcessRequest, ProcessStatus, User } from '../types';
import { DatabaseService } from '../services/api';

const LawyerDashboard: React.FC<{ onLogout: () => void, user: User }> = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState<'new_requests' | 'my_processes' | 'wallet' | 'profile'>('wallet');
  const [requests, setRequests] = useState<ProcessRequest[]>([]);
  const [myProcesses, setMyProcesses] = useState<ProcessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDocAlert, setShowDocAlert] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState(user.avatar || '');
  
  // Estados para Modal de Atualização de Status
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedProcessForUpdate, setSelectedProcessForUpdate] = useState<ProcessRequest | null>(null);
  const [updateFormData, setUpdateFormData] = useState({
    processNumber: '',
    statusLabel: '',
    note: '',
    attachedFiles: [] as File[]
  });

  // Estado para Perfil
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    cpf: user.documentId || '',
    birthDate: user.birthDate || '',
    oabNumber: user.oab || ''
  });

  // Estados de Controle de Validação e Documentos
  const [verificationStatus, setVerificationStatus] = useState<'VERIFIED' | 'PENDING' | 'REJECTED'>('VERIFIED');
  const [rejectionReason, setRejectionReason] = useState('O documento OAB enviado está ilegível ou vencido. Por favor, envie uma nova digitalização.');
  const [oabDoc, setOabDoc] = useState<{ name: string; url: string } | null>(user.oabPdfUrl ? { name: 'Comprovante_OAB.pdf', url: user.oabPdfUrl } : null);
  const [idDoc, setIdDoc] = useState<{ name: string; url: string } | null>(user.documentPdfUrl ? { name: 'CNH_CPF.pdf', url: user.documentPdfUrl } : null);
  
  // Datas de Validade
  const [oabValidity, setOabValidity] = useState(user.oabValidity || '');
  const [idValidity, setIdValidity] = useState(user.documentValidity || '');

  // Flags para controlar se o arquivo foi trocado (libera a edição da data)
  const [oabFileChanged, setOabFileChanged] = useState(false);
  const [idFileChanged, setIdFileChanged] = useState(false);

  // Estados para Análise de Causa
  const [selectedRequestForAnalysis, setSelectedRequestForAnalysis] = useState<ProcessRequest | null>(null);
  const [showValueTooltip, setShowValueTooltip] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const oabPdfRef = useRef<HTMLInputElement>(null);
  const documentPdfRef = useRef<HTMLInputElement>(null);
  const statusFilesRef = useRef<HTMLInputElement>(null);

  const walletStats = {
    totalAccepted: 12450.00,
    retained: 5800.00,
    receivableThisMonth: 3200.00,
    activeCount: 8,
    finishedCount: 4,
    totalCount: 12
  };

  // Funções de Máscara
  const maskCPF = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  };

  const maskDate = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 8) v = v.substring(0, 8);
    v = v.replace(/(\d{2})(\d)/, '$1/$2');
    v = v.replace(/(\d{2})(\d)/, '$1/$2');
    return v;
  };

  const maskOAB = (value: string) => {
    let v = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length > 8) v = v.substring(0, 8);
    if (v.length > 2) v = v.substring(0, 2) + ' ' + v.substring(2);
    return v;
  };

  useEffect(() => {
    const isDocPending = !oabDoc || !idDoc || !oabValidity || !idValidity;
    if (isDocPending) {
      setShowDocAlert(true);
    } else {
      setShowDocAlert(false);
    }

    const fetchData = async () => {
      setIsLoading(true);
      const openOps = await DatabaseService.getOpenOpportunities();
      setRequests(openOps);
      setMyProcesses([
        {
          id: 'p_1',
          readable_id: 'RAD-1022',
          client_id: 'c_9',
          clientName: 'Marcos Oliveira',
          type: 'Suspensão',
          totalPoints: 24,
          fines: [],
          value: 490,
          deadline: 'Iniciado',
          status: ProcessStatus.AWAITING_PAYMENT,
          description: 'Multa de radar em rodovia federal.',
          processNumber: '',
          organ: 'DETRAN/SP - 2ª JARI',
          lastUpdateNote: 'Aguardando Pagamento',
          created_at: new Date().toISOString()
        }
      ]);
      setIsLoading(false);
    };
    fetchData();
  }, [user, oabDoc, idDoc, oabValidity, idValidity]);

  const handleOpenUpdateModal = (process: ProcessRequest) => {
    setSelectedProcessForUpdate(process);
    setUpdateFormData({
      processNumber: process.processNumber || '',
      statusLabel: process.lastUpdateNote || 'Aguardando Pagamento',
      note: '',
      attachedFiles: []
    });
    setIsUpdateModalOpen(true);
  };

  const handleStatusFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUpdateFormData(prev => ({
      ...prev,
      attachedFiles: [...prev.attachedFiles, ...files]
    }));
  };

  const removeStatusFile = (index: number) => {
    setUpdateFormData(prev => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter((_, i) => i !== index)
    }));
  };

  const handleSaveUpdate = () => {
    if (!selectedProcessForUpdate) return;

    const needsDocs = ['Protocolado', 'Finalizado'].includes(updateFormData.statusLabel);
    if (needsDocs && updateFormData.attachedFiles.length === 0) {
      alert("Para este status, é obrigatório anexar o comprovante em PDF.");
      return;
    }

    setMyProcesses(prev => prev.map(p => 
      p.id === selectedProcessForUpdate.id 
        ? { 
            ...p, 
            processNumber: updateFormData.processNumber, 
            lastUpdateNote: needsDocs ? `Em Análise Radar (${updateFormData.statusLabel})` : updateFormData.statusLabel,
            description: updateFormData.note || p.description, 
            status: updateFormData.statusLabel === 'Finalizado' ? ProcessStatus.FINISHED : ProcessStatus.IN_PROGRESS
          } 
        : p
    ));

    setIsUpdateModalOpen(false);
    if (needsDocs) {
      alert("A atualização foi enviada para análise da nossa consultoria jurídica. Prazo de 24h úteis para validação.");
    } else {
      alert("Processo atualizado com sucesso!");
    }
  };

  const handleAcceptOpportunity = () => {
    if (!selectedRequestForAnalysis) return;
    
    const newProcess: ProcessRequest = {
      ...selectedRequestForAnalysis,
      status: ProcessStatus.AWAITING_PAYMENT,
      lastUpdateNote: 'Aguardando Pagamento'
    };
    
    setMyProcesses(prev => [newProcess, ...prev]);
    setRequests(prev => prev.filter(r => r.id !== selectedRequestForAnalysis.id));
    setSelectedRequestForAnalysis(null);
    setActiveTab('my_processes');
    alert("Causa aceita! O cliente foi notificado para realizar o pagamento.");
  };

  const handleRejectOpportunity = () => {
    if (!selectedRequestForAnalysis) return;
    setRequests(prev => prev.filter(r => r.id !== selectedRequestForAnalysis.id));
    setSelectedRequestForAnalysis(null);
    alert("Causa recusada.");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (type: 'oab' | 'id', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const mockUrl = URL.createObjectURL(file);
      if (type === 'oab') {
        setOabDoc({ name: file.name, url: mockUrl });
        setOabFileChanged(true); // Libera edição da data
        setOabValidity(''); // Reseta data para forçar preenchimento
      } else {
        setIdDoc({ name: file.name, url: mockUrl });
        setIdFileChanged(true); // Libera edição da data
        setIdValidity(''); // Reseta data para forçar preenchimento
      }
    }
  };

  const handleSaveProfile = () => {
    if (oabFileChanged || idFileChanged) {
        // Se houve troca de arquivo, valida se datas foram preenchidas
        if ((oabFileChanged && !oabValidity) || (idFileChanged && !idValidity)) {
            alert("Por favor, preencha a data de validade dos novos documentos anexados.");
            return;
        }
        setVerificationStatus('PENDING');
        alert("Documentos enviados com sucesso! Seu perfil entrou em análise interna.");
        
        // Trava novamente os campos após salvar
        setOabFileChanged(false);
        setIdFileChanged(false);
    } else {
        alert("Dados pessoais atualizados com sucesso!");
    }
  };

  const calculatePie = () => {
    const total = walletStats.totalCount;
    const active = walletStats.activeCount;
    const percentage = (active / total) * 100;
    const dashArray = `${percentage} ${100 - percentage}`;
    return dashArray;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      <aside className="w-full md:w-80 bg-[#1e1b4b] text-white p-8 flex flex-col z-20 sticky top-0 md:h-screen shadow-2xl">
         <div className="mb-12 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#593EFF] rounded-lg flex items-center justify-center font-black italic shadow-lg shadow-indigo-500/20">R</div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">Radar <span className="text-[#593EFF]">Hub</span></h1>
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">SISTEMA JURÍDICO</span>
            </div>
         </div>
         
         <nav className="flex-grow space-y-2">
            {[
              { id: 'wallet', label: 'Minha Carteira', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
              { id: 'new_requests', label: 'Novos Processos', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
              { id: 'my_processes', label: 'Meus Processos', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-[#593EFF] text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                {item.label}
              </button>
            ))}
         </nav>

         <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-2">
            <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}>
              {profileAvatar ? (
                <img src={profileAvatar} alt="Perfil" className="w-4 h-4 rounded-full object-cover border border-white/20" />
              ) : (
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )}
              Meu Perfil
              {showDocAlert && <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse ml-auto"></div>}
            </button>
            <button onClick={onLogout} className="w-full text-slate-500 hover:text-rose-400 font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-3 px-6 py-4">SAIR DA CONTA</button>
         </div>
      </aside>

      <main className="flex-grow p-6 md:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'wallet' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <header className="mb-12 flex justify-between items-end">
                  <div>
                    <h2 className="text-4xl font-black text-[#1e1b4b] italic uppercase tracking-tighter">Minha <span className="text-[#593EFF]">Carteira</span></h2>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Visão geral financeira e performance</p>
                  </div>
                  <button className="text-[9px] font-black text-[#593EFF] uppercase tracking-widest border-b-2 border-[#593EFF] pb-1 hover:opacity-70 transition-opacity">Ver extrato completo</button>
               </header>

               {showDocAlert && (
                 <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4">
                   <div className="flex items-center gap-5">
                     <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl">⚠️</div>
                     <div>
                        <h4 className="text-sm font-black text-amber-900 uppercase">Perfil Pendente</h4>
                        <p className="text-amber-700/70 text-[10px] font-black uppercase tracking-widest mt-1">Acesse seu perfil para enviar OAB e documentos obrigatórios.</p>
                     </div>
                   </div>
                   <button onClick={() => setActiveTab('profile')} className="px-8 py-3 bg-amber-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg shadow-amber-200 hover:scale-105 transition-all">Regularizar Agora</button>
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Total Acumulado</span>
                     <div className="text-3xl font-black text-[#1e1b4b]">R$ {walletStats.totalAccepted.toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="bg-[#1e1b4b] p-8 rounded-[2.5rem] text-white">
                     <span className="text-[9px] font-black text-slate-400 uppercase block mb-4">Garantia Radar (Retido)</span>
                     <div className="text-3xl font-black">R$ {walletStats.retained.toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#593EFF] flex flex-col justify-between">
                     <div>
                        <span className="text-[9px] font-black text-[#593EFF] uppercase block mb-4 tracking-widest">Disponível p/ Saque</span>
                        <div className="text-3xl font-black text-[#1e1b4b]">R$ {walletStats.receivableThisMonth.toLocaleString('pt-BR')}</div>
                     </div>
                     <button className="mt-6 w-full py-3 bg-[#593EFF] text-white rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-all">Sacar Valor</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
                     <div className="relative w-32 h-32">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                           <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="4"></circle>
                           <circle cx="18" cy="18" r="16" fill="none" className="stroke-[#593EFF]" strokeWidth="4" strokeDasharray={calculatePie()} strokeDashoffset="0"></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className="text-xl font-black text-[#1e1b4b] leading-none">{walletStats.totalCount}</span>
                           <span className="text-[7px] font-black text-slate-400 uppercase">Total</span>
                        </div>
                     </div>
                     <div className="flex-grow space-y-4 w-full">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Distribuição de Casos</h4>
                        <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-2xl">
                           <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-[#593EFF] rounded-full"></div>
                              <span className="text-[10px] font-black text-[#1e1b4b] uppercase">Em Andamento</span>
                           </div>
                           <span className="font-black text-[#593EFF]">{walletStats.activeCount}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                           <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                              <span className="text-[10px] font-black text-slate-400 uppercase">Concluídos</span>
                           </div>
                           <span className="font-black text-slate-400">{walletStats.finishedCount}</span>
                        </div>
                     </div>
                  </div>

                  <div className="bg-[#1e1b4b] p-10 rounded-[3rem] text-white relative overflow-hidden flex flex-col justify-center">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                     <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-[#593EFF] rounded-xl flex items-center justify-center text-xl">💡</div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Dica do Radar</h4>
                     </div>
                     <p className="text-lg font-bold italic leading-snug mb-6">
                        "Protocolar a defesa em até <span className="text-[#593EFF]">24h</span> após o aceite aumenta sua taxa de retenção de clientes em 40%."
                     </p>
                     <button className="text-[9px] font-black uppercase tracking-widest text-[#593EFF] flex items-center gap-2 group">
                        Ver mais insights 
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                     </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'my_processes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="mb-12">
                  <h2 className="text-4xl font-black text-[#1e1b4b] italic uppercase tracking-tighter">Meus <span className="text-[#593EFF]">Processos</span></h2>
              </header>
              <div className="grid grid-cols-1 gap-6">
                {myProcesses.map(process => (
                   <div key={process.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm group hover:shadow-xl transition-all">
                      <div className="flex items-center gap-6">
                         <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#593EFF]">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                         </div>
                         <div>
                            <span className="text-[9px] font-black text-[#593EFF] uppercase tracking-widest">{process.readable_id}</span>
                            <h3 className="text-xl font-black text-[#1e1b4b] uppercase italic">{process.clientName}</h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">Nº: {process.processNumber || 'Aguardando protocolo'}</p>
                         </div>
                      </div>
                      <div className="flex flex-col md:items-end gap-2">
                         <span className={`px-4 py-1.5 text-[9px] font-black rounded-full uppercase border ${process.status === ProcessStatus.FINISHED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-[#593EFF] border-indigo-100'}`}>
                           {process.lastUpdateNote || 'Pendente'}
                         </span>
                         <span className="text-[10px] font-bold text-slate-400 mr-2">Última att: {new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-3">
                         <button onClick={() => handleOpenUpdateModal(process)} className="px-6 py-4 border-2 border-slate-100 text-[#1e1b4b] font-black uppercase text-[10px] rounded-2xl hover:bg-slate-50 transition-colors">Atualizar Status</button>
                         <button className="px-8 py-4 bg-[#1e1b4b] text-white font-black uppercase text-[10px] rounded-2xl hover:bg-[#593EFF] transition-colors shadow-lg shadow-indigo-100/20">Detalhes</button>
                      </div>
                   </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'new_requests' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
              {requests.map(req => (
                <div key={req.id} className="bg-white rounded-[3rem] p-10 border border-slate-100 flex flex-col shadow-sm hover:shadow-xl transition-all">
                   <div className="flex justify-between items-start mb-8">
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${req.type === 'Cassação' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>{req.type}</div>
                      <span className="text-2xl font-black italic text-[#593EFF]">R$ {req.value}</span>
                   </div>
                   <h3 className="text-2xl font-black mb-6 text-[#1e1b4b]">{req.clientName}</h3>
                   
                   <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Qtd. Multas</span>
                         <span className="text-lg font-black text-[#1e1b4b]">{req.fines?.length || 1}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Pontos</span>
                         <span className="text-lg font-black text-[#1e1b4b]">{req.totalPoints} pts</span>
                      </div>
                   </div>

                   <button 
                     onClick={() => setSelectedRequestForAnalysis(req)}
                     className="w-full mt-auto py-5 bg-[#1e1b4b] text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-[#593EFF] transition-colors shadow-lg shadow-indigo-100/10"
                   >
                     Analisar Causa
                   </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'profile' && (
             <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100">
                   {/* Perfil Header */}
                   <header className="flex flex-col md:flex-row items-center gap-10 mb-16 text-center md:text-left border-b border-slate-100 pb-12">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-32 h-32 bg-[#1e1b4b] rounded-[2.5rem] flex items-center justify-center text-5xl text-white font-black border-4 border-[#593EFF] shadow-2xl relative overflow-hidden group cursor-pointer"
                      >
                         {profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover" /> : user.name?.[0]}
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                         </div>
                         <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                      </div>
                      <div className="flex-grow">
                         <h3 className="text-4xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">{profileData.name || "Seu Nome"}</h3>
                         
                         {/* Badges de Status */}
                         <div className="mt-4 flex items-center gap-3 justify-center md:justify-start">
                            {verificationStatus === 'VERIFIED' && (
                                <span className="px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    Perfil Verificado
                                </span>
                            )}
                            {verificationStatus === 'PENDING' && (
                                <span className="px-4 py-2 bg-amber-50 border border-amber-100 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm animate-pulse">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Em Análise
                                </span>
                            )}
                            {verificationStatus === 'REJECTED' && (
                                <div className="relative group">
                                    <span className="px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm cursor-help hover:bg-rose-100 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Reprovado
                                    </span>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 p-4 bg-[#1e1b4b] text-white rounded-2xl shadow-xl z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform translate-y-2 group-hover:translate-y-0 duration-200">
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e1b4b] rotate-45"></div>
                                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest block mb-1">Motivo da Reprovação</span>
                                        <p className="text-[10px] font-medium leading-relaxed italic">
                                            "{rejectionReason}"
                                        </p>
                                    </div>
                                </div>
                            )}
                         </div>
                      </div>
                   </header>

                   {/* Documentos PDF (Cards interativos com Validade) */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                      {/* CARD CNH / CPF */}
                      <div 
                        onClick={() => documentPdfRef.current?.click()}
                        className={`p-8 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all ${idFileChanged ? 'border-[#593EFF] bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:border-[#593EFF]'}`}
                      >
                         <h4 className="text-[10px] font-black text-[#1e1b4b] uppercase tracking-widest mb-4 text-center">CNH / CPF</h4>
                         <div className={`px-4 py-2 rounded-xl flex items-center gap-2 mb-4 ${idDoc ? 'bg-[#593EFF] text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 shadow-inner'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <span className="text-[9px] font-black uppercase truncate max-w-[120px]">{idDoc ? idDoc.name : 'pdf file'}</span>
                            {idDoc && <button onClick={(e) => { e.stopPropagation(); setIdDoc(null); }} className="ml-1 text-white/50 hover:text-white">✕</button>}
                         </div>
                         <input type="file" ref={documentPdfRef} onChange={(e) => handleFileUpload('id', e)} className="hidden" accept=".pdf" />
                         
                         {/* Campo de Validade CNH */}
                         <div className="w-full px-4" onClick={(e) => e.stopPropagation()}>
                           <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center mb-1">Validade</label>
                           <input 
                              type="text" 
                              placeholder="DD/MM/AAAA"
                              className={`w-full text-center py-2 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none transition-all ${
                                idFileChanged ? 'bg-white border-2 border-[#593EFF] text-[#593EFF]' : 'bg-transparent border-none text-slate-500'
                              }`}
                              value={idValidity}
                              onChange={(e) => setIdValidity(maskDate(e.target.value))}
                              disabled={!idFileChanged}
                           />
                         </div>
                      </div>

                      {/* CARD OAB */}
                      <div 
                        onClick={() => oabPdfRef.current?.click()}
                        className={`p-8 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all ${oabFileChanged ? 'border-[#593EFF] bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:border-[#593EFF]'}`}
                      >
                         <h4 className="text-[10px] font-black text-[#1e1b4b] uppercase tracking-widest mb-4 text-center">Comprovante OAB</h4>
                         <div className={`px-4 py-2 rounded-xl flex items-center gap-2 mb-4 ${oabDoc ? 'bg-[#593EFF] text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 shadow-inner'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <span className="text-[9px] font-black uppercase truncate max-w-[120px]">{oabDoc ? oabDoc.name : 'pdf file'}</span>
                            {oabDoc && <button onClick={(e) => { e.stopPropagation(); setOabDoc(null); }} className="ml-1 text-white/50 hover:text-white">✕</button>}
                         </div>
                         <input type="file" ref={oabPdfRef} onChange={(e) => handleFileUpload('oab', e)} className="hidden" accept=".pdf" />

                         {/* Campo de Validade OAB */}
                         <div className="w-full px-4" onClick={(e) => e.stopPropagation()}>
                           <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center mb-1">Validade</label>
                           <input 
                              type="text" 
                              placeholder="DD/MM/AAAA"
                              className={`w-full text-center py-2 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none transition-all ${
                                oabFileChanged ? 'bg-white border-2 border-[#593EFF] text-[#593EFF]' : 'bg-transparent border-none text-slate-500'
                              }`}
                              value={oabValidity}
                              onChange={(e) => setOabValidity(maskDate(e.target.value))}
                              disabled={!oabFileChanged}
                           />
                         </div>
                      </div>
                   </div>

                   {/* Grid de Dados Pessoais */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome Completo</label>
                            <input 
                              type="text" 
                              className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner"
                              value={profileData.name}
                              onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">CPF</label>
                            <input 
                              type="text" 
                              className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner"
                              value={profileData.cpf}
                              onChange={(e) => setProfileData({...profileData, cpf: maskCPF(e.target.value)})}
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Data de Nascimento</label>
                            <input 
                              type="text" 
                              placeholder="DD/MM/AAAA"
                              className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner"
                              value={profileData.birthDate}
                              onChange={(e) => setProfileData({...profileData, birthDate: maskDate(e.target.value)})}
                            />
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Registro OAB</label>
                            <input 
                              type="text" 
                              placeholder="UF 000.000"
                              className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner"
                              value={profileData.oabNumber}
                              onChange={(e) => setProfileData({...profileData, oabNumber: maskOAB(e.target.value)})}
                            />
                         </div>
                      </div>
                   </div>

                   {/* Botão Salvar Alterações Centralizado */}
                   <div className="mt-16 flex justify-center">
                      <button 
                        onClick={handleSaveProfile}
                        className="px-20 py-6 bg-[#593EFF] text-white font-black rounded-[2.2rem] uppercase text-[11px] tracking-widest shadow-2xl shadow-indigo-300 hover:scale-105 active:scale-95 transition-all"
                      >
                        Salvar Alterações
                      </button>
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>

      {/* Modal de Atualização de Processo (Meus Processos) */}
      {isUpdateModalOpen && selectedProcessForUpdate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
             <div className="p-10 md:p-14 overflow-y-auto">
                <header className="flex justify-between items-center mb-10">
                   <div>
                      <h2 className="text-3xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">Gestão de <span className="text-[#593EFF]">Andamento</span></h2>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-2">{selectedProcessForUpdate.readable_id} • {selectedProcessForUpdate.clientName}</p>
                   </div>
                   <button onClick={() => setIsUpdateModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </header>

                <div className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Número do Processo Judicial/Adm</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 0012345-67.2023.8.26..." 
                        className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] outline-none focus:border-[#593EFF]/20 font-bold text-[#1e1b4b] shadow-inner"
                        value={updateFormData.processNumber}
                        onChange={e => setUpdateFormData({...updateFormData, processNumber: e.target.value})}
                      />
                   </div>

                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Status do Andamento</label>
                      <select 
                        className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] outline-none focus:border-[#593EFF]/20 font-bold text-[#1e1b4b] appearance-none cursor-pointer"
                        value={updateFormData.statusLabel}
                        onChange={e => setUpdateFormData({...updateFormData, statusLabel: e.target.value, attachedFiles: []})}
                      >
                         <option value="Aguardando Pagamento">Aguardando Pagamento</option>
                         <option value="Aguardando Protocolação">Aguardando Protocolação</option>
                         <option value="Protocolado">Protocolado</option>
                         <option value="Aguardando resposta do órgão">Aguardando resposta do órgão</option>
                         <option value="Aguardando ação do advogado">Aguardando ação do advogado</option>
                         <option value="Finalizado">Finalizado</option>
                      </select>
                   </div>

                   {['Protocolado', 'Finalizado'].includes(updateFormData.statusLabel) && (
                     <div className="space-y-4 animate-in slide-in-from-top-4">
                        <div className="p-6 bg-indigo-50 border-2 border-indigo-100 rounded-3xl space-y-3">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs">📄</div>
                              <h4 className="text-[10px] font-black uppercase text-indigo-900">Anexar Comprovantes (PDF)</h4>
                           </div>
                           <p className="text-[9px] text-indigo-700 font-bold leading-relaxed">
                              Atenção: Para este status, é obrigatório anexar comprovantes. A alteração será validada pela Consultoria Jurídica da Radar em até <span className="underline italic">24h úteis</span>.
                           </p>
                           
                           <div className="space-y-2">
                              {updateFormData.attachedFiles.map((file, idx) => (
                                 <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-200">
                                    <span className="text-[9px] font-black text-[#1e1b4b] truncate max-w-[80%]">{file.name}</span>
                                    <button onClick={() => removeStatusFile(idx)} className="text-rose-500 font-black text-xs hover:scale-110 transition-transform">✕</button>
                                 </div>
                              ))}
                              <button 
                                 type="button" 
                                 onClick={() => statusFilesRef.current?.click()}
                                 className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-xl text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:bg-white transition-colors"
                              >
                                 + Adicionar Documentos
                              </button>
                              <input 
                                 type="file" 
                                 ref={statusFilesRef} 
                                 className="hidden" 
                                 accept=".pdf" 
                                 multiple 
                                 onChange={handleStatusFilesChange} 
                              />
                           </div>
                        </div>
                     </div>
                   )}

                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nota Explicativa (Texto Livre)</label>
                      <textarea 
                        placeholder="Descreva aqui o último passo ou orientação para o cliente..." 
                        className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] outline-none focus:border-[#593EFF]/20 font-bold text-[#1e1b4b] h-32 resize-none shadow-inner"
                        value={updateFormData.note}
                        onChange={e => setUpdateFormData({...updateFormData, note: e.target.value})}
                      />
                   </div>

                   <div className="pt-4 flex gap-4">
                      <button onClick={handleSaveUpdate} className="flex-grow py-5 bg-[#593EFF] text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all">Salvar Atualização</button>
                      <button onClick={() => setIsUpdateModalOpen(false)} className="px-10 py-5 bg-slate-50 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest">Cancelar</button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Análise de Causa (Novos Processos) */}
      {selectedRequestForAnalysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
             <div className="p-10 md:p-14 overflow-y-auto relative">
                <header className="flex justify-between items-start mb-12">
                   <div>
                      <span className="px-4 py-1.5 bg-indigo-50 text-[#593EFF] text-[9px] font-black rounded-full uppercase tracking-widest border border-indigo-100">{selectedRequestForAnalysis.type}</span>
                      <h2 className="text-3xl font-black text-[#1e1b4b] italic uppercase tracking-tighter mt-4 leading-none">{selectedRequestForAnalysis.clientName}</h2>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">ID: {selectedRequestForAnalysis.readable_id}</p>
                   </div>
                   <div className="text-right relative">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Honorário</span>
                      <div className="flex items-center justify-end gap-2">
                         <span className="text-3xl font-black text-[#593EFF] italic">R$ {selectedRequestForAnalysis.value}</span>
                         <div 
                           className="relative group cursor-help"
                           onMouseEnter={() => setShowValueTooltip(true)}
                           onMouseLeave={() => setShowValueTooltip(false)}
                         >
                            <div className="w-5 h-5 rounded-full border-2 border-slate-200 text-slate-400 flex items-center justify-center font-black text-[10px] transition-all group-hover:bg-[#593EFF] group-hover:text-white group-hover:border-[#593EFF]">?</div>
                            {showValueTooltip && (
                              <div className="absolute top-full right-0 mt-3 w-64 p-6 bg-[#1e1b4b] text-white rounded-[1.5rem] shadow-2xl z-50 text-[10px] font-bold leading-relaxed text-left animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 mb-2 text-[#593EFF]">
                                  <div className="w-2 h-2 bg-[#593EFF] rounded-full"></div>
                                  <span className="uppercase tracking-widest">Regra Radar</span>
                                </div>
                                50% é depositado ao protocolar o processo e os outros 50% é liberado ao finalizar o processo.
                              </div>
                            )}
                         </div>
                      </div>
                   </div>
                </header>

                <div className="grid grid-cols-2 gap-6 mb-12">
                   <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                      <div className="text-4xl mb-4 text-center">📄</div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 text-center">Documentos</span>
                      <span className="text-xl font-black text-[#1e1b4b] block text-center">{selectedRequestForAnalysis.fines?.length || 1} multas anexadas</span>
                   </div>
                   <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                      <div className="text-4xl mb-4 text-center">📉</div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 text-center">Complexidade</span>
                      <span className="text-xl font-black text-[#1e1b4b] block text-center">{selectedRequestForAnalysis.totalPoints} pontos totais</span>
                   </div>
                </div>

                <div className="mb-12">
                   <h4 className="text-[10px] font-black text-[#1e1b4b] uppercase tracking-widest mb-4 border-b-2 border-slate-100 inline-block pb-1">Relato do Condutor</h4>
                   <p className="text-slate-600 font-medium leading-relaxed italic bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100/50">
                      "{selectedRequestForAnalysis.description || "Nenhuma observação técnica fornecida pelo cliente."}"
                   </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                   <button 
                     onClick={handleAcceptOpportunity}
                     className="flex-grow py-6 bg-[#593EFF] text-white font-black rounded-[1.8rem] uppercase text-[11px] tracking-widest shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                     Aceitar Causa
                   </button>
                   <button 
                     onClick={handleRejectOpportunity}
                     className="px-10 py-6 bg-rose-50 text-rose-600 font-black rounded-[1.8rem] uppercase text-[11px] tracking-widest border border-rose-100 hover:bg-rose-100 transition-colors"
                   >
                     Recusar
                   </button>
                   <button 
                     onClick={() => setSelectedRequestForAnalysis(null)}
                     className="px-8 py-6 bg-slate-100 text-slate-400 font-black rounded-[1.8rem] uppercase text-[11px] tracking-widest"
                   >
                     Voltar
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LawyerDashboard;
