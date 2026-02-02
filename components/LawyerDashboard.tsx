
import React, { useState, useEffect, useRef } from 'react';
import { ProcessRequest, ProcessStatus, User } from '../types';
import { DatabaseService, RadarApiService } from '../services/api';

const LawyerDashboard: React.FC<{ onLogout: () => void, user: User }> = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState<'new_requests' | 'my_processes' | 'wallet' | 'profile'>('wallet');
  const [requests, setRequests] = useState<ProcessRequest[]>([]);
  const [myProcesses, setMyProcesses] = useState<ProcessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDocAlert, setShowDocAlert] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState(user.avatar || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [walletStats, setWalletStats] = useState({ totalAccepted: 0, retained: 0, receivableThisMonth: 0, activeCount: 0, finishedCount: 0, totalCount: 0 });
  const [tips, setTips] = useState<{ title: string; description: string; type: 'urgent' | 'info' | 'success' }[]>([]);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedProcessForUpdate, setSelectedProcessForUpdate] = useState<ProcessRequest | null>(null);
  const [updateFormData, setUpdateFormData] = useState({ processNumber: '', statusLabel: '', note: '', attachedFiles: [] as File[] });

  const [selectedProcessForDetails, setSelectedProcessForDetails] = useState<ProcessRequest | null>(null);

  const [profileData, setProfileData] = useState({
    name: user.name || '',
    cpf: user.documentId || '',
    birthDate: user.birthDate || '',
    oabNumber: user.oab || ''
  });

  // --- ESTADOS DE VERIFICAÇÃO ---
  const [verificationStatus, setVerificationStatus] = useState(user.verificationStatus || 'PENDING');
  const [rejectionReason, setRejectionReason] = useState('Documentação pendente. Envie CNH e OAB.');
  
  const [oabDoc, setOabDoc] = useState<{ name: string; url: string } | null>(user.oabPdfUrl ? { name: 'Comprovante_OAB.pdf', url: user.oabPdfUrl } : null);
  const [idDoc, setIdDoc] = useState<{ name: string; url: string } | null>(user.documentPdfUrl ? { name: 'CNH_CPF.pdf', url: user.documentPdfUrl } : null);
  
  const [oabValidity, setOabValidity] = useState(user.oabValidity || '');
  const [idValidity, setIdValidity] = useState(user.documentValidity || '');
  
  const [oabDateError, setOabDateError] = useState('');
  const [idDateError, setIdDateError] = useState('');

  const [oabFileChanged, setOabFileChanged] = useState(false);
  const [idFileChanged, setIdFileChanged] = useState(false);

  const [selectedRequestForAnalysis, setSelectedRequestForAnalysis] = useState<ProcessRequest | null>(null);
  const [showValueTooltip, setShowValueTooltip] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const oabPdfRef = useRef<HTMLInputElement>(null);
  const documentPdfRef = useRef<HTMLInputElement>(null);
  const statusFilesRef = useRef<HTMLInputElement>(null);

  // Masks
  const maskCPF = (value: string) => { let v = value.replace(/\D/g, ''); if (v.length > 11) v = v.substring(0, 11); v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); return v; };
  const maskDate = (value: string) => { let v = value.replace(/\D/g, ''); if (v.length > 8) v = v.substring(0, 8); v = v.replace(/(\d{2})(\d)/, '$1/$2'); v = v.replace(/(\d{2})(\d)/, '$1/$2'); return v; };
  const maskOAB = (value: string) => { let v = value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v.length > 8) v = v.substring(0, 8); if (v.length > 2) v = v.substring(0, 2) + ' ' + v.substring(2); return v; };

  const validateFutureDate = (dateString: string): boolean => {
    if (!dateString || dateString.length !== 10) return false;
    const [day, month, year] = dateString.split('/').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    const inputDate = new Date(year, month - 1, day);
    if (inputDate.getFullYear() !== year || inputDate.getMonth() !== month - 1 || inputDate.getDate() !== day) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 30);
    return inputDate > minDate;
  };

  const handleDateChange = (type: 'oab' | 'id', value: string) => {
    const maskedValue = maskDate(value);
    if (type === 'oab') {
        setOabValidity(maskedValue);
        if (maskedValue.length === 10) {
            if (!validateFutureDate(maskedValue)) setOabDateError('Vencimento deve ser maior que 30 dias.');
            else setOabDateError('');
        } else setOabDateError(''); 
    } else {
        setIdValidity(maskedValue);
        if (maskedValue.length === 10) {
            if (!validateFutureDate(maskedValue)) setIdDateError('Vencimento deve ser maior que 30 dias.');
            else setIdDateError('');
        } else setIdDateError('');
    }
  };

  useEffect(() => {
    // Atualiza status baseado na prop user
    if (user.verificationStatus) {
        setVerificationStatus(user.verificationStatus);
        setShowDocAlert(user.verificationStatus === 'PENDING' || user.verificationStatus === 'REJECTED');
    }

    const fetchData = async () => {
      if (!user.id) return;
      setIsLoading(true);
      try {
        const openOps = await DatabaseService.getOpenOpportunities();
        setRequests(openOps);
        const myProcs = await DatabaseService.getLawyerProcesses(user.id);
        setMyProcesses(myProcs);
        const stats = await DatabaseService.getWalletStats(user.id);
        setWalletStats(stats);
        const tipsData = await DatabaseService.getTips(user.id);
        setTips(tipsData);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.id, user.verificationStatus]);

  const handleOpenUpdateModal = (p:any) => { setSelectedProcessForUpdate(p); setUpdateFormData({ processNumber: p.processNumber || '', statusLabel: p.lastUpdateNote || 'Aguardando Pagamento', note: '', attachedFiles: [] }); setIsUpdateModalOpen(true); };
  const handleStatusFilesChange = (e:any) => { const files = Array.from(e.target.files || []); setUpdateFormData(prev => ({ ...prev, attachedFiles: [...prev.attachedFiles, ...files] as File[] })); };
  const removeStatusFile = (i:number) => { setUpdateFormData(prev => ({ ...prev, attachedFiles: prev.attachedFiles.filter((_, idx) => idx !== i) })); };
  const handleSaveUpdate = async () => { 
    if (!selectedProcessForUpdate || !user.id) return;
    await DatabaseService.updateProcessStatus(selectedProcessForUpdate.id, {
        status: updateFormData.statusLabel,
        note: updateFormData.note,
        files: updateFormData.attachedFiles
    });
    const updatedProcs = await DatabaseService.getLawyerProcesses(user.id);
    setMyProcesses(updatedProcs);
    setIsUpdateModalOpen(false); 
    alert("Processo atualizado com sucesso!"); 
  };
  const handleAcceptOpportunity = async () => { 
      if (!selectedRequestForAnalysis || !user.id) return;
      await DatabaseService.acceptProcess(selectedRequestForAnalysis.id, user.id);
      const openOps = await DatabaseService.getOpenOpportunities();
      setRequests(openOps);
      const myProcs = await DatabaseService.getLawyerProcesses(user.id);
      setMyProcesses(myProcs);
      const stats = await DatabaseService.getWalletStats(user.id);
      setWalletStats(stats);
      setSelectedRequestForAnalysis(null);
      setActiveTab('my_processes');
      alert("Causa aceita! O cliente foi notificado.");
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
        setOabFileChanged(true); setOabValidity(''); setOabDateError('');
      } else {
        setIdDoc({ name: file.name, url: mockUrl });
        setIdFileChanged(true); setIdValidity(''); setIdDateError('');
      }
    }
  };

  const handleSaveProfile = async () => {
    if (oabDateError || idDateError) {
        alert("Por favor, corrija as datas inválidas antes de salvar.");
        return;
    }
    if (!profileData.name || !profileData.cpf || !profileData.birthDate || !profileData.oabNumber) {
        alert("Por favor, preencha todos os campos obrigatórios (Nome, CPF, Nascimento e OAB).");
        return;
    }
    if (!user.id) return;

    if (oabFileChanged || idFileChanged) {
        if (oabFileChanged && (!oabValidity || !validateFutureDate(oabValidity))) {
            alert("Verifique a data da OAB."); return;
        }
        if (idFileChanged && (!idValidity || !validateFutureDate(idValidity))) {
            alert("Verifique a data do documento."); return;
        }
    }

    await RadarApiService.updateProfile(user.id, {
        name: profileData.name,
        documentId: profileData.cpf,
        birthDate: profileData.birthDate,
        oab: profileData.oabNumber,
        oabValidity: oabValidity || user.oabValidity,
        documentValidity: idValidity || user.documentValidity,
        oabPdfUrl: oabDoc?.url || user.oabPdfUrl,
        documentPdfUrl: idDoc?.url || user.documentPdfUrl,
        avatar: profileAvatar
    });

    if (oabFileChanged || idFileChanged) {
        alert("Documentos enviados para análise!");
        setOabFileChanged(false);
        setIdFileChanged(false);
        if (verificationStatus !== 'VERIFIED') {
            setVerificationStatus('UNDER_ANALYSIS');
            setShowDocAlert(false);
        }
    } else {
        alert("Dados pessoais atualizados com sucesso!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#1e1b4b] text-white p-6 sticky top-0 z-30 flex justify-between items-center shadow-lg">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#593EFF] rounded-lg flex items-center justify-center font-black italic shadow-lg">R</div>
            <div className="flex flex-col">
              <span className="text-sm font-black italic uppercase tracking-tighter leading-none">Radar <span className="text-[#593EFF]">Hub</span></span>
            </div>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-1">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
         </button>
      </div>

      {/* Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 md:w-80 bg-[#1e1b4b] text-white p-8 flex flex-col shadow-2xl md:relative md:translate-x-0 transition-transform duration-300 ease-in-out md:h-screen md:sticky md:top-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="mb-12 hidden md:flex items-center gap-3">
            <div className="w-8 h-8 bg-[#593EFF] rounded-lg flex items-center justify-center font-black italic shadow-lg shadow-indigo-500/20">R</div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">Radar <span className="text-[#593EFF]">Hub</span></h1>
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">SISTEMA JURÍDICO</span>
            </div>
         </div>
         
         <nav className="flex-grow space-y-2 mt-4 md:mt-0">
            {[
              { id: 'wallet', label: 'Minha Carteira', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
              { id: 'new_requests', label: 'Novos Processos', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
              { id: 'my_processes', label: 'Meus Processos', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
            ].map(item => (
              <button 
                key={item.id} 
                onClick={() => { setActiveTab(item.id as any); setIsMobileMenuOpen(false); }} 
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-[#593EFF] text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                {item.label}
              </button>
            ))}
         </nav>

         <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-2">
            <button onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}>
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

               {/* Cards Financeiros */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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

               {/* Seção Gráficos e Dicas */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Gráfico Donut */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 self-start">Performance de Casos</h3>
                        
                        <div className="relative w-48 h-48">
                            <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                                {/* Background Circle */}
                                <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                {/* Active Segment */}
                                <path className="text-[#593EFF]" strokeDasharray={`${(walletStats.activeCount / (walletStats.totalCount || 1)) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-[#1e1b4b]">{walletStats.totalCount}</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                            </div>
                        </div>

                        <div className="flex gap-6 mt-6">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#593EFF]"></div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Andamento ({walletStats.activeCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Finalizados ({walletStats.finishedCount})</span>
                            </div>
                        </div>
                    </div>

                    {/* Dicas */}
                    <div className="lg:col-span-2 bg-indigo-50/50 p-10 rounded-[2.5rem] border border-indigo-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 bg-[#593EFF] text-white rounded-lg flex items-center justify-center text-sm">💡</div>
                            <h3 className="text-lg font-black text-[#1e1b4b] italic uppercase tracking-tighter">Dicas do Especialista</h3>
                        </div>

                        <div className="space-y-4">
                            {tips.length > 0 ? tips.map((tip, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex gap-4 hover:shadow-md transition-shadow">
                                    <div className={`w-1 shrink-0 rounded-full ${tip.type === 'urgent' ? 'bg-rose-500' : tip.type === 'success' ? 'bg-emerald-500' : 'bg-[#593EFF]'}`}></div>
                                    <div>
                                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${tip.type === 'urgent' ? 'text-rose-600' : tip.type === 'success' ? 'text-emerald-600' : 'text-[#593EFF]'}`}>{tip.title}</h4>
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed">{tip.description}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 font-medium italic">Carregando dicas...</p>
                            )}
                        </div>
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
                {myProcesses.length === 0 ? (
                    <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100">
                        <div className="text-4xl mb-4 grayscale opacity-20">📂</div>
                        <h4 className="text-xl font-black text-slate-300 uppercase italic tracking-tighter">Nenhum processo ativo</h4>
                    </div>
                ) : myProcesses.map(process => (
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
                      <div className="flex gap-3">
                         <button onClick={() => handleOpenUpdateModal(process)} className="px-6 py-4 border-2 border-slate-100 text-[#1e1b4b] font-black uppercase text-[10px] rounded-2xl hover:bg-slate-50 transition-colors">Atualizar Status</button>
                         <button onClick={() => setSelectedProcessForDetails(process)} className="px-8 py-4 bg-[#1e1b4b] text-white font-black uppercase text-[10px] rounded-2xl hover:bg-[#593EFF] transition-colors shadow-lg shadow-indigo-100/20">Detalhes</button>
                      </div>
                   </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'new_requests' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
              {requests.length === 0 ? (
                  <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-slate-100">
                      <h4 className="text-xl font-black text-slate-300 uppercase italic tracking-tighter">Sem novas oportunidades</h4>
                  </div>
              ) : requests.map(req => (
                <div key={req.id} className="bg-white rounded-[3rem] p-10 border border-slate-100 flex flex-col shadow-sm hover:shadow-xl transition-all">
                   <div className="flex justify-between items-start mb-8">
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${req.type === 'Cassação' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>{req.type}</div>
                      <span className="text-2xl font-black italic text-[#593EFF]">R$ {req.value}</span>
                   </div>
                   <h3 className="text-2xl font-black mb-6 text-[#1e1b4b]">{req.clientName}</h3>
                   <button onClick={() => setSelectedRequestForAnalysis(req)} className="w-full mt-auto py-5 bg-[#1e1b4b] text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-[#593EFF] transition-colors shadow-lg shadow-indigo-100/10">Analisar Causa</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'profile' && (
             <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100">
                   <header className="flex flex-col md:flex-row items-center gap-10 mb-16 text-center md:text-left border-b border-slate-100 pb-12">
                      <div onClick={() => fileInputRef.current?.click()} className="w-32 h-32 bg-[#1e1b4b] rounded-[2.5rem] flex items-center justify-center text-5xl text-white font-black border-4 border-[#593EFF] shadow-2xl relative overflow-hidden group cursor-pointer">
                         {profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover" /> : user.name?.[0]}
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
                            {verificationStatus === 'UNDER_ANALYSIS' && (
                                <span className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-[#593EFF] rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    Em Análise
                                </span>
                            )}
                            {verificationStatus === 'PENDING' && (
                                <span className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Pendente
                                </span>
                            )}
                            {verificationStatus === 'REJECTED' && (
                                <div className="relative group">
                                    <span className="px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm cursor-help hover:bg-rose-100 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Reprovado
                                    </span>
                                </div>
                            )}
                         </div>
                      </div>
                   </header>

                   {/* Cards de Upload (CNH e OAB) - Mantidos iguais */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                      <div onClick={() => documentPdfRef.current?.click()} className={`p-8 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all ${idFileChanged ? 'border-[#593EFF] bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:border-[#593EFF]'}`}>
                         {/* ... CNH ... */}
                         <h4 className="text-[10px] font-black text-[#1e1b4b] uppercase tracking-widest mb-4 text-center">CNH / CPF</h4>
                         <div className={`px-4 py-2 rounded-xl flex items-center gap-2 mb-4 ${idDoc ? 'bg-[#593EFF] text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 shadow-inner'}`}>
                            <span className="text-[9px] font-black uppercase truncate max-w-[120px]">{idDoc ? idDoc.name : 'pdf file'}</span>
                         </div>
                         <input type="file" ref={documentPdfRef} onChange={(e) => handleFileUpload('id', e)} className="hidden" accept=".pdf" />
                         <div className="w-full px-4" onClick={(e) => e.stopPropagation()}>
                           <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center mb-1">Validade</label>
                           <input type="text" placeholder="DD/MM/AAAA" className={`w-full text-center py-2 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none transition-all ${idFileChanged ? idDateError ? 'bg-rose-50 border-2 border-rose-500 text-rose-500 placeholder-rose-300' : 'bg-white border-2 border-[#593EFF] text-[#593EFF]' : 'bg-transparent border-none text-slate-500'}`} value={idValidity} onChange={(e) => handleDateChange('id', e.target.value)} disabled={!idFileChanged} />
                           {idDateError && <span className="text-[8px] font-bold text-rose-500 mt-1 block text-center bg-white/80 rounded px-1">{idDateError}</span>}
                         </div>
                      </div>

                      <div onClick={() => oabPdfRef.current?.click()} className={`p-8 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all ${oabFileChanged ? 'border-[#593EFF] bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:border-[#593EFF]'}`}>
                         {/* ... OAB ... */}
                         <h4 className="text-[10px] font-black text-[#1e1b4b] uppercase tracking-widest mb-4 text-center">Comprovante OAB</h4>
                         <div className={`px-4 py-2 rounded-xl flex items-center gap-2 mb-4 ${oabDoc ? 'bg-[#593EFF] text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 shadow-inner'}`}>
                            <span className="text-[9px] font-black uppercase truncate max-w-[120px]">{oabDoc ? oabDoc.name : 'pdf file'}</span>
                         </div>
                         <input type="file" ref={oabPdfRef} onChange={(e) => handleFileUpload('oab', e)} className="hidden" accept=".pdf" />
                         <div className="w-full px-4" onClick={(e) => e.stopPropagation()}>
                           <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center mb-1">Validade</label>
                           <input type="text" placeholder="DD/MM/AAAA" className={`w-full text-center py-2 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none transition-all ${oabFileChanged ? oabDateError ? 'bg-rose-50 border-2 border-rose-500 text-rose-500 placeholder-rose-300' : 'bg-white border-2 border-[#593EFF] text-[#593EFF]' : 'bg-transparent border-none text-slate-500'}`} value={oabValidity} onChange={(e) => handleDateChange('oab', e.target.value)} disabled={!oabFileChanged} />
                           {oabDateError && <span className="text-[8px] font-bold text-rose-500 mt-1 block text-center bg-white/80 rounded px-1">{oabDateError}</span>}
                         </div>
                      </div>
                   </div>

                   {/* Form Dados */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* ... inputs mantidos ... */}
                      <div className="space-y-6">
                         <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome Completo *</label><input type="text" required className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} /></div>
                         <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">CPF *</label><input type="text" required className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner" value={profileData.cpf} onChange={(e) => setProfileData({...profileData, cpf: maskCPF(e.target.value)})} /></div>
                         <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Data de Nascimento *</label><input type="text" required className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner" value={profileData.birthDate} onChange={(e) => setProfileData({...profileData, birthDate: maskDate(e.target.value)})} /></div>
                      </div>
                      <div className="space-y-6">
                         <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Registro OAB *</label><input type="text" required className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner" value={profileData.oabNumber} onChange={(e) => setProfileData({...profileData, oabNumber: maskOAB(e.target.value)})} /></div>
                      </div>
                   </div>

                   <div className="mt-16 flex justify-center">
                      <button onClick={handleSaveProfile} className="px-20 py-6 bg-[#593EFF] text-white font-black rounded-[2.2rem] uppercase text-[11px] tracking-widest shadow-2xl shadow-indigo-300 hover:scale-105 active:scale-95 transition-all">Salvar Alterações</button>
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>
      
      {/* Modais */}
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

      {selectedProcessForDetails && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
               <div className="p-10 md:p-14 overflow-y-auto">
                  <header className="flex justify-between items-center mb-10">
                     <div>
                        <span className="px-4 py-1.5 bg-indigo-50 text-[#593EFF] text-[9px] font-black rounded-full uppercase tracking-widest border border-indigo-100 mb-4 inline-block">{selectedProcessForDetails.type}</span>
                        <h2 className="text-3xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">DETALHES DO <span className="text-[#593EFF]">PROCESSO</span></h2>
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-2">{selectedProcessForDetails.readable_id} • {selectedProcessForDetails.clientName}</p>
                     </div>
                     <button onClick={() => setSelectedProcessForDetails(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                  </header>

                  <div className="space-y-8">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50 rounded-[1.8rem] border border-slate-100 text-center">
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total de Pontos</span>
                           <span className="text-2xl font-black text-[#1e1b4b]">{selectedProcessForDetails.totalPoints} pts</span>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-[1.8rem] border border-slate-100 text-center">
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Qtd. Infrações</span>
                           <span className="text-2xl font-black text-[#1e1b4b]">{selectedProcessForDetails.fines?.length || 0}</span>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Relato do Condutor</label>
                        <div className="p-6 bg-indigo-50/30 rounded-[1.8rem] border border-indigo-100">
                           <p className="text-sm font-medium text-slate-600 italic leading-relaxed">
                              "{selectedProcessForDetails.description || 'Nenhum relato adicional fornecido pelo condutor.'}"
                           </p>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                           Documentos Anexados
                           <span className="bg-[#593EFF] text-white text-[8px] px-2 py-0.5 rounded-full">{selectedProcessForDetails.fines?.length || 0}</span>
                        </label>
                        
                        <div className="space-y-3">
                           {selectedProcessForDetails.fines && selectedProcessForDetails.fines.length > 0 ? (
                              selectedProcessForDetails.fines.map((fine, idx) => (
                                 <div key={idx} className="p-4 bg-white rounded-2xl border-2 border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center font-black text-xs">PDF</div>
                                       <div>
                                          <span className="text-[9px] font-black text-[#1e1b4b] uppercase tracking-wide block">Infração {idx + 1} - {fine.points} pts</span>
                                          <span className="text-[9px] font-bold text-slate-400 truncate max-w-[150px] block">{fine.documentName || 'documento.pdf'}</span>
                                       </div>
                                    </div>
                                    <a 
                                       href={fine.documentUrl || '#'} 
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="px-4 py-2 bg-[#1e1b4b] text-white text-[9px] font-black uppercase rounded-lg hover:bg-[#593EFF] transition-colors shadow-lg shadow-indigo-200/50"
                                    >
                                       Baixar
                                    </a>
                                 </div>
                              ))
                           ) : (
                              <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl">
                                 Nenhuma multa detalhada neste processo.
                              </div>
                           )}
                        </div>
                     </div>

                     <button onClick={() => setSelectedProcessForDetails(null)} className="w-full py-5 bg-slate-100 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors mt-4">
                        Fechar Detalhes
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

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
