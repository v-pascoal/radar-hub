
import React, { useState, useEffect, useRef } from 'react';
import { ProcessRequest, ProcessStatus, User, FineDetail } from '../types';
import { RadarApiService } from '../services/api';

// Interface auxiliar para a Timeline do Histórico
interface HistoryEvent {
  date: string;
  title: string;
  description: string;
  type: 'document' | 'note' | 'status' | 'success';
  docUrl?: string;
  docName?: string;
}

interface FinishedProcess extends ProcessRequest {
  finalResult: 'DEFERIDO' | 'INDEFERIDO';
  lawyerName: string;
  finishedDate: string;
  timeline: HistoryEvent[];
}

const ClientDashboard: React.FC<{ onLogout: () => void, user: User }> = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'history' | 'profile'>('requests');
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado de Dados
  const [myProcesses, setMyProcesses] = useState<ProcessRequest[]>([]);
  const [finishedProcesses, setFinishedProcesses] = useState<ProcessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [profileAvatar, setProfileAvatar] = useState(user.avatar || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Estado para o Modal de Detalhes do Histórico
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<FinishedProcess | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- ESTADOS PARA PERFIL E VERIFICAÇÃO ---
  // Inicializa com o status que veio do backend
  const [verificationStatus, setVerificationStatus] = useState(user.verificationStatus || 'PENDING');
  const [rejectionReason, setRejectionReason] = useState('Documentação incompleta.');
  const [showDocAlert, setShowDocAlert] = useState(false);
  
  // Dados do formulário de perfil
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    cpf: user.documentId || '', // Mapeado de documentId
    birthDate: user.birthDate || '',
    phone: user.phone || ''
  });

  // Upload CNH
  const [idDoc, setIdDoc] = useState<{ name: string; url: string } | null>(user.documentPdfUrl ? { name: 'Minha_CNH.pdf', url: user.documentPdfUrl } : null);
  const [idValidity, setIdValidity] = useState(user.documentValidity || '');
  const [idFileChanged, setIdFileChanged] = useState(false);
  
  // Estado de Erro na Data
  const [idDateError, setIdDateError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentPdfRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    type: 'Suspensão' as 'Suspensão' | 'Cassação',
    description: '',
    fines: [{ id: '1', points: 0, documentUrl: '', documentName: '' }] as FineDetail[]
  });

  // Funções de Máscara Auxiliares
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

  const maskPhone = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    else if (v.length > 0) v = v.replace(/^(\d{0,2})/, '($1');
    return v;
  };

  // Validador de Data Futura (> 30 dias)
  const validateFutureDate = (dateString: string): boolean => {
    if (!dateString || dateString.length !== 10) return false;
    
    const [day, month, year] = dateString.split('/').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;

    const inputDate = new Date(year, month - 1, day);
    
    // Verifica se a data é válida
    if (inputDate.getFullYear() !== year || inputDate.getMonth() !== month - 1 || inputDate.getDate() !== day) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Cria data limite (Hoje + 30 dias)
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 30);

    return inputDate > minDate;
  };

  const handleDateChange = (value: string) => {
    const maskedValue = maskDate(value);
    setIdValidity(maskedValue);
    
    if (maskedValue.length === 10) {
        if (!validateFutureDate(maskedValue)) {
            setIdDateError('Vencimento deve ser maior que 30 dias.');
        } else {
            setIdDateError('');
        }
    } else {
        setIdDateError('');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const allProcesses = await RadarApiService.getClientHistory(user.id || 'guest');
        // Filtra ativos vs finalizados
        setMyProcesses(allProcesses.filter(p => p.status !== ProcessStatus.FINISHED));
        setFinishedProcesses(allProcesses.filter(p => p.status === ProcessStatus.FINISHED));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();

    // Atualiza status baseado na prop user, caso mude
    if (user.verificationStatus) {
        setVerificationStatus(user.verificationStatus);
        setShowDocAlert(user.verificationStatus === 'PENDING' || user.verificationStatus === 'REJECTED');
        if (user.verificationStatus === 'PENDING') {
            setRejectionReason('Cadastro incompleto. Preencha seus dados e anexe a CNH.');
        }
    }
  }, [user.id, user.verificationStatus]);

  const handleViewHistoryDetail = async (process: ProcessRequest) => {
      setIsLoadingHistory(true);
      try {
          const details = await RadarApiService.getFinishedProcessDetail(process.id);
          if (details) {
              setSelectedHistoryItem(details);
          }
      } catch (e) {
          console.error(e);
          alert("Erro ao carregar histórico.");
      } finally {
          setIsLoadingHistory(false);
      }
  };

  const getStatusLabel = (status: ProcessStatus) => {
    const labels: Record<string, string> = {
      [ProcessStatus.AWAITING_LAWYERS]: 'Aguardando Advogados',
      [ProcessStatus.AWAITING_SELECTION]: 'Escolha seu Advogado',
      [ProcessStatus.AWAITING_PAYMENT]: 'Aguardando Pagamento',
      [ProcessStatus.AWAITING_PROTOCOL]: 'Aguardando Protocolação',
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const mockUrl = URL.createObjectURL(file);
      setIdDoc({ name: file.name, url: mockUrl });
      setIdFileChanged(true);
      setIdValidity(''); // Força re-preenchimento da validade
      setIdDateError('');
    }
  };

  const handleSaveProfile = async () => {
    if (idDateError) {
        alert("Por favor, corrija a data de validade antes de salvar.");
        return;
    }

    if (!profileData.name || !profileData.cpf || !profileData.birthDate) {
        alert("Por favor, preencha todos os campos obrigatórios (Nome, CPF e Data de Nascimento).");
        return;
    }

    if (!user.id) return;

    if (idFileChanged) {
        if (!idValidity) {
             alert("Por favor, preencha a data de validade da CNH.");
             return;
        }

        if (!validateFutureDate(idValidity)) {
             alert("A validade da CNH deve ser superior a 30 dias.");
             return;
        }
    }

    // Persiste no backend
    await RadarApiService.updateProfile(user.id, {
        name: profileData.name,
        documentId: profileData.cpf,
        birthDate: profileData.birthDate,
        phone: profileData.phone,
        documentValidity: idValidity || user.documentValidity,
        documentPdfUrl: idDoc?.url || user.documentPdfUrl,
        avatar: profileAvatar
    });

    if (idFileChanged) {
        alert("Documento CNH enviado para análise!");
        setIdFileChanged(false);
        // Atualiza estado local para refletir a mudança imediata (optimistic UI ou lógica do backend simulada)
        if (verificationStatus !== 'VERIFIED') {
            setVerificationStatus('UNDER_ANALYSIS');
            setShowDocAlert(false);
        }
    } else {
        alert("Dados atualizados com sucesso.");
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
        client_id: user.id || 'client_1',
        clientName: user.name || profileData.name || 'Cliente',
        type: formData.type,
        fines: formData.fines,
        totalPoints,
        description: formData.description
      });
      if (result.success) {
        // Recarrega lista
        const allProcesses = await RadarApiService.getClientHistory(user.id || 'client_1');
        setMyProcesses(allProcesses.filter(p => p.status !== ProcessStatus.FINISHED));
        
        setShowNewRequestModal(false);
        setFormData({ type: 'Suspensão', description: '', fines: [{ id: '1', points: 0, documentUrl: '', documentName: '' }] });
        alert("Solicitação enviada com sucesso! Aguarde o contato dos advogados.");
      }
    } catch (e) {
        alert("Erro ao enviar solicitação.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      
      {/* Mobile Header (Navbar com Sanduíche) */}
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

      {/* Backdrop Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar (Menu Lateral) - Responsivo */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-72 md:w-80 bg-[#1e1b4b] text-white p-8 flex flex-col shadow-2xl md:relative md:translate-x-0 transition-transform duration-300 ease-in-out md:h-screen md:sticky md:top-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
         {/* Logo Desktop */}
         <div className="mb-12 hidden md:flex items-center gap-3">
            <div className="w-8 h-8 bg-[#593EFF] rounded-lg flex items-center justify-center font-black italic shadow-lg shadow-indigo-500/30">R</div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">Radar <span className="text-[#593EFF]">Hub</span></h1>
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">SISTEMA JURÍDICO</span>
            </div>
         </div>
         
         <nav className="flex-grow space-y-3 mt-4 md:mt-0">
            {[
              { id: 'requests', label: 'Meus processos', icon: 'M9 12l2 2 4-4' },
              { id: 'history', label: 'Histórico', icon: 'M12 8v4l3 3' }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setIsMobileMenuOpen(false); }} 
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-[#593EFF] text-white shadow-xl shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                {item.label}
              </button>
            ))}
         </nav>
         
         {/* BOTÃO MEU PERFIL */}
         <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-2">
            <button 
                onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }} 
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}
            >
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
                {isLoading ? (
                    <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Carregando processos...</div>
                ) : myProcesses.map(process => (
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
                               {process.lastUpdateNote || getStatusLabel(process.status)}
                            </span>
                         </div>
                         {process.lastUpdateNote === 'Aguardando Pagamento' && (
                            <button className="px-6 py-3 bg-[#593EFF] text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-200">Pagar Honorários</button>
                         )}
                      </div>
                   </div>
                ))}
                {!isLoading && myProcesses.length === 0 && (
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
           <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="mb-12">
                  <h2 className="text-4xl font-black text-[#1e1b4b] italic uppercase tracking-tighter">Meus <span className="text-[#593EFF]">Arquivados</span></h2>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Casos Finalizados e Decisões</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {isLoading ? (
                    <div className="col-span-full text-center text-slate-400 font-black uppercase">Carregando histórico...</div>
                ) : finishedProcesses.map(item => {
                  // Tipagem estendida para exibição do card (mockado ou real)
                  const displayItem = item as any; // Em produção usaria um type guard
                  const isDeferido = displayItem.lastUpdateNote === 'Deferido';

                  return (
                  <div key={item.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col hover:shadow-2xl hover:border-indigo-100 transition-all group relative overflow-hidden">
                     {/* Borda lateral colorida baseada no resultado */}
                     <div className={`absolute left-0 top-0 bottom-0 w-3 ${isDeferido ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                     
                     <div className="pl-6">
                        <div className="flex justify-between items-start mb-6">
                           <div>
                              <span className="px-4 py-1.5 bg-slate-50 text-slate-400 text-[9px] font-black rounded-full uppercase tracking-widest border border-slate-100 mb-3 inline-block">Finalizado</span>
                              <h3 className="text-2xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">{item.type}</h3>
                              <span className="text-[10px] font-black text-[#593EFF] uppercase tracking-widest mt-1 block">{item.readable_id}</span>
                           </div>
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${isDeferido ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                              {isDeferido ? '✓' : '✕'}
                           </div>
                        </div>

                        <div className="mb-8">
                           <p className="text-slate-500 text-xs font-medium line-clamp-2 leading-relaxed">
                              {item.description}
                           </p>
                        </div>

                        <div className="flex items-center justify-between mt-auto">
                           <div>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1">Resultado Final</span>
                              <span className={`text-lg font-black uppercase italic ${isDeferido ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {isDeferido ? 'DEFERIDO' : 'INDEFERIDO'}
                              </span>
                           </div>
                           <button 
                              onClick={() => handleViewHistoryDetail(item)}
                              className="px-8 py-4 bg-[#1e1b4b] text-white font-black uppercase text-[9px] tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-100/50 flex items-center gap-2"
                           >
                              {isLoadingHistory && selectedHistoryItem?.id === item.id ? 'Carregando...' : 'Ver Histórico'}
                           </button>
                        </div>
                     </div>
                  </div>
                )})}
                {!isLoading && finishedProcesses.length === 0 && (
                    <div className="col-span-full py-24 text-center">
                        <h4 className="text-xl font-black text-slate-300 uppercase italic">Histórico Vazio</h4>
                    </div>
                )}
              </div>
           </div>
         )}

         {activeTab === 'profile' && (
           <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100">
                {/* Header Perfil com Avatar e Status */}
                <header className="flex flex-col md:flex-row items-center gap-10 mb-12 border-b border-slate-100 pb-12">
                   <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-32 bg-[#1e1b4b] rounded-[2.5rem] flex items-center justify-center text-4xl text-white font-black shadow-2xl border-4 border-[#593EFF] relative overflow-hidden cursor-pointer group"
                    >
                      {profileAvatar ? (
                        <img src={profileAvatar} className="w-full h-full object-cover" alt="Perfil" />
                      ) : user.name?.[0]}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                   </div>
                   
                   <div className="flex-grow text-center md:text-left">
                      <h3 className="text-4xl font-[900] text-[#1e1b4b] italic uppercase tracking-tighter leading-none mb-4">{profileData.name || "Seu Nome"}</h3>
                      
                      {/* BADGES DE VERIFICAÇÃO ATUALIZADOS */}
                      <div className="flex items-center gap-3 justify-center md:justify-start">
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
                                    Documento Reprovado
                                </span>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 p-4 bg-[#1e1b4b] text-white rounded-2xl shadow-xl z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform translate-y-2 group-hover:translate-y-0 duration-200">
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e1b4b] rotate-45"></div>
                                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest block mb-1">Motivo</span>
                                    <p className="text-[10px] font-medium leading-relaxed italic">"{rejectionReason}"</p>
                                </div>
                            </div>
                        )}
                     </div>
                   </div>
                </header>

                {/* AREA DE UPLOAD DA CNH */}
                <div className="mb-12">
                     <div 
                        onClick={() => documentPdfRef.current?.click()}
                        className={`p-8 border-2 border-dashed rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer transition-all ${idFileChanged ? 'border-[#593EFF] bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:border-[#593EFF]'}`}
                      >
                         <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${idDoc ? 'bg-[#593EFF] text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                                🚗
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-[#1e1b4b] uppercase tracking-widest mb-1">Minha CNH (PDF)</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{idDoc ? idDoc.name : 'Clique para enviar documento'}</p>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-4 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="w-full md:w-40">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Validade CNH</label>
                                <input 
                                    type="text" 
                                    placeholder="DD/MM/AAAA"
                                    className={`w-full text-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none transition-all ${
                                        idFileChanged 
                                            ? idDateError 
                                                ? 'bg-rose-50 border-2 border-rose-500 text-rose-500 placeholder-rose-300' 
                                                : 'bg-white border-2 border-[#593EFF] text-[#593EFF]' 
                                            : 'bg-transparent border border-slate-200 text-slate-500'
                                    }`}
                                    value={idValidity}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    disabled={!idFileChanged && !!idDoc} 
                                />
                                {idDateError && (
                                    <span className="text-[8px] font-bold text-rose-500 mt-1 block text-center bg-white/80 rounded px-1">{idDateError}</span>
                                )}
                            </div>
                         </div>
                         <input type="file" ref={documentPdfRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
                      </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome Completo *</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner"
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        />
                   </div>
                   <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">CPF *</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner"
                          value={profileData.cpf}
                          onChange={(e) => setProfileData({...profileData, cpf: maskCPF(e.target.value)})}
                        />
                   </div>
                   <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Data de Nascimento *</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner"
                          value={profileData.birthDate}
                          onChange={(e) => setProfileData({...profileData, birthDate: maskDate(e.target.value)})}
                        />
                   </div>
                   <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Celular (WhatsApp)</label>
                        <input 
                          type="text" 
                          className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.8rem] focus:border-[#593EFF]/20 outline-none font-bold text-[#1e1b4b] shadow-inner"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({...profileData, phone: maskPhone(e.target.value)})}
                        />
                   </div>
                   <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Plataforma Ativa</label>
                        <div className="w-full px-8 py-5 bg-slate-100 border-2 border-transparent rounded-[1.8rem] font-bold text-slate-400 flex items-center justify-between opacity-70 cursor-not-allowed">
                            <span>Desde Out/2023</span>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        </div>
                   </div>
                </div>

                <div className="mt-16 flex flex-col items-center gap-6">
                  <button 
                    onClick={handleSaveProfile} 
                    className="px-20 py-6 bg-[#593EFF] text-white font-black rounded-[2.2rem] uppercase text-[11px] tracking-widest shadow-2xl shadow-indigo-300 hover:scale-105 active:scale-95 transition-all"
                  >
                    Salvar Dados
                  </button>
                  <button onClick={handleDeleteData} className="text-slate-300 font-black uppercase text-[8px] tracking-widest hover:text-rose-400 transition-colors">
                    LGPD: Apagar meus dados e esquecer conta
                  </button>
                </div>
             </div>
           </div>
         )}
      </main>
      
      {/* Modais */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
           {/* Modal de Nova Solicitação */}
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
              <div className="p-10 md:p-14 overflow-y-auto">
                 <header className="flex justify-between items-center mb-10">
                    <div>
                       <h2 className="text-3xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">NOVA <span className="text-[#593EFF]">SOLICITAÇÃO</span></h2>
                       <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-2">Inicie sua defesa agora mesmo</p>
                    </div>
                    <button onClick={() => setShowNewRequestModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                 </header>

                 <form onSubmit={handleSubmitDefense} className="space-y-8">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Tipo de Processo</label>
                       <div className="p-1.5 bg-slate-100 rounded-[2rem] grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setFormData({...formData, type: 'Suspensão'})} className={`py-4 rounded-[1.6rem] font-black uppercase text-[10px] tracking-widest transition-all ${formData.type === 'Suspensão' ? 'bg-[#593EFF] text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>Suspensão</button>
                          <button type="button" onClick={() => setFormData({...formData, type: 'Cassação'})} className={`py-4 rounded-[1.6rem] font-black uppercase text-[10px] tracking-widest transition-all ${formData.type === 'Cassação' ? 'bg-[#593EFF] text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>Cassação</button>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between items-center px-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalhamento das Multas</label>
                          <button type="button" onClick={addFine} className="text-[9px] font-black text-[#593EFF] uppercase tracking-widest hover:underline">+ Adicionar Multa</button>
                       </div>
                       
                       {formData.fines.map((fine, index) => (
                          <div key={fine.id} className="p-6 border-2 border-slate-100 rounded-[2rem] space-y-4 relative group">
                             <div className="absolute -left-3 top-6 w-6 h-6 bg-[#1e1b4b] text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg z-10">{index + 1}</div>
                             {formData.fines.length > 1 && (
                                <button type="button" onClick={() => removeFine(fine.id)} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600 font-black text-xs">✕</button>
                             )}
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                   <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-2">Pontuação</label>
                                   <input 
                                     type="number" 
                                     placeholder="Ex: 7" 
                                     className="w-full px-5 py-3 bg-slate-50 rounded-2xl font-black text-[#1e1b4b] outline-none focus:ring-2 focus:ring-[#593EFF]/20"
                                     value={fine.points || ''}
                                     onChange={(e) => updateFine(fine.id, 'points', parseInt(e.target.value))}
                                   />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-2">Upload Notificação</label>
                                   <div className="relative">
                                      <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.png" />
                                      <div className="w-full px-5 py-3 bg-slate-50 rounded-2xl font-bold text-slate-400 text-[10px] uppercase truncate flex items-center gap-2">
                                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                         Selecionar Arquivo
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>

                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Relate o acontecido (Opcional)</label>
                       <textarea 
                          className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[2rem] outline-none focus:border-[#593EFF]/20 font-medium text-[#1e1b4b] h-32 resize-none shadow-inner"
                          placeholder="Descreva brevemente a situação..."
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                       ></textarea>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-[#593EFF] text-white font-black rounded-[2rem] uppercase text-[11px] tracking-widest shadow-2xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                       {isSubmitting ? 'Enviando...' : 'Enviar para Análise'}
                       {!isSubmitting && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {showTimelineModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 md:p-14 relative overflow-hidden animate-in zoom-in-95 duration-300">
               <button onClick={() => setShowTimelineModal(false)} className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200">✕</button>
               
               <h2 className="text-3xl font-black text-[#1e1b4b] italic uppercase tracking-tighter mb-10 leading-none">Etapas do <br/><span className="text-[#593EFF]">Processo</span></h2>
               
               <div className="relative border-l-2 border-slate-100 ml-3 space-y-10 pl-8 py-2">
                  {[
                     { title: 'Análise do Caso', desc: 'Advogados avaliam a viabilidade técnica.' },
                     { title: 'Pagamento Seguro', desc: 'Valor retido na plataforma até o protocolo.' },
                     { title: 'Elaboração da Defesa', desc: 'Especialista redige a peça jurídica.' },
                     { title: 'Protocolo no Órgão', desc: 'Envio oficial e liberação do honorário.' },
                     { title: 'Acompanhamento', desc: 'Monitoramento até a decisão final.' }
                  ].map((step, i) => (
                     <div key={i} className="relative">
                        <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-[#593EFF] border-4 border-white shadow-lg z-10"></div>
                        <h4 className="text-sm font-black text-[#1e1b4b] uppercase tracking-wide">{step.title}</h4>
                        <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">{step.desc}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}
      
      {/* Modal de Detalhes do Histórico */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
               <div className="p-10 md:p-14 overflow-y-auto">
                   <header className="flex justify-between items-center mb-10">
                      <div>
                         <span className="px-4 py-1.5 bg-slate-100 text-slate-400 text-[9px] font-black rounded-full uppercase tracking-widest border border-slate-200 mb-4 inline-block">Histórico Completo</span>
                         <h2 className="text-3xl font-black text-[#1e1b4b] italic uppercase tracking-tighter leading-none">LINHA DO <span className="text-[#593EFF]">TEMPO</span></h2>
                         <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-2">{selectedHistoryItem.readable_id} • {selectedHistoryItem.lawyerName}</p>
                      </div>
                      <button onClick={() => setSelectedHistoryItem(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                   </header>

                   <div className="relative border-l-2 border-slate-100 ml-4 pl-10 space-y-12 py-4">
                       {selectedHistoryItem.timeline.map((event, idx) => (
                           <div key={idx} className="relative">
                               <div className={`absolute -left-[51px] top-0 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${
                                   event.type === 'success' ? 'bg-emerald-500' : 
                                   event.type === 'document' ? 'bg-[#593EFF]' : 
                                   event.type === 'note' ? 'bg-amber-400' : 'bg-slate-300'
                               }`}></div>
                               
                               <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">{event.date}</span>
                               <h4 className="text-lg font-black text-[#1e1b4b] leading-tight mb-2">{event.title}</h4>
                               <p className="text-sm text-slate-500 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                   {event.description}
                               </p>
                               {event.docUrl && (
                                   <a href={event.docUrl} className="inline-flex items-center gap-2 mt-3 text-[10px] font-black text-[#593EFF] uppercase tracking-widest hover:underline">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                       Baixar {event.docName || 'Documento'}
                                   </a>
                               )}
                           </div>
                       ))}
                   </div>
               </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
