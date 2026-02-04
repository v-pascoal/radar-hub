
import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../types';
import { RadarApiService } from '../services/api';

interface LoginProps {
  initialRole?: UserRole;
  onLoginSuccess: (userData: Partial<User>) => void;
  onCancel: () => void;
}

const Login: React.FC<LoginProps> = ({ initialRole = UserRole.CLIENT, onLoginSuccess, onCancel }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [step, setStep] = useState<'info' | 'otp'>('info');
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    documentId: '',
    birthDate: '',
    oab: '',
    otp: ''
  });

  useEffect(() => {
    setRole(initialRole);
    setError(null); // Limpa erro ao mudar role/inicialização
  }, [initialRole, mode]);

  const maskPhone = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    else if (v.length > 0) v = v.replace(/^(\d{0,2})/, '($1');
    return v;
  };

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

  const handleInputChange = (field: string, value: string) => {
    setError(null); // Limpa erro ao digitar
    let maskedValue = value;
    if (field === 'phone') maskedValue = maskPhone(value);
    if (field === 'documentId') maskedValue = maskCPF(value);
    if (field === 'birthDate') maskedValue = maskDate(value);
    if (field === 'oab') maskedValue = maskOAB(value);
    setFormData({ ...formData, [field]: maskedValue });
  };

  const cleanPhone = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validação de Campos Obrigatórios no Registro
    if (mode === 'register') {
      if (!formData.name || !formData.documentId || !formData.birthDate) {
        setError("Por favor, preencha todos os campos obrigatórios (Nome, CPF e Nascimento).");
        return;
      }
      if (role === UserRole.LAWYER && !formData.oab) {
        setError("Advogados devem preencher o número da OAB.");
        return;
      }
      // Validação básica de comprimento
      if (formData.documentId.length < 14) {
         setError("CPF incompleto.");
         return;
      }
    }

    const rawPhone = cleanPhone(formData.phone);
    if (rawPhone.length < 10) {
        setError("Por favor, digite um número de celular válido com DDD.");
        return;
    }

    setLoading(true);

    try {
        const isLoginMode = mode === 'login';
        const codeReceived = await RadarApiService.requestOtp(rawPhone, isLoginMode);
        
        setLoading(false);
        if (codeReceived) {
            setDebugOtp(codeReceived);
            setStep('otp');
            // Simulação do SMS chegando no celular
            setTimeout(() => {
                window.alert(`[SMS] Radar Hub: Seu código de acesso é ${codeReceived}`);
            }, 500);
        }
    } catch (error: any) {
        setLoading(false);
        // Exibe o erro visualmente no form
        setError(error.message || "Erro ao solicitar código. Verifique sua conexão.");
    }
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp.length < 4) {
      setError("Por favor, insira o código de 4 dígitos.");
      return;
    }

    setLoading(true);
    setError(null);
    const rawPhone = cleanPhone(formData.phone);

    try {
        // No fluxo de login unificado (mode='login'), não passamos role (undefined).
        // No fluxo de registro, passamos a role escolhida para criação da conta.
        const roleToPass = mode === 'register' ? role : undefined;
        
        // Se for registro, montamos o objeto com os dados preenchidos
        const userData = mode === 'register' ? {
            name: formData.name,
            documentId: formData.documentId,
            birthDate: formData.birthDate,
            oab: formData.oab
        } : undefined;
        
        const user = await RadarApiService.verifyOtp(rawPhone, formData.otp, roleToPass, userData);
        
        // Sucesso
        onLoginSuccess({
            ...user,
            // Mantém dados do form em memória caso o backend retorne algo diferente (backup), 
            // mas agora o backend deve retornar preenchido.
            name: user.name || formData.name, 
            documentId: user.documentId || formData.documentId,
            birthDate: user.birthDate || formData.birthDate,
            oab: user.oab || formData.oab
        });
    } catch (error: any) {
        setError(error.message || "Código inválido ou usuário não encontrado.");
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col relative">
        <div className="p-8 md:p-12 overflow-y-auto">
          
          {/* Header de Navegação Voltar */}
          <div className="flex items-center mb-8">
            <button onClick={step === 'otp' ? () => setStep('info') : onCancel} className="p-2 text-slate-400 hover:text-[#593EFF] transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {step === 'info' && (
              <div className="flex bg-[#F1F5F9] p-1.5 rounded-2xl mx-auto">
                <button 
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white text-[#593EFF] shadow-lg shadow-indigo-100' : 'text-slate-400'}`}
                >
                  Já tenho conta
                </button>
                <button 
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-[#593EFF] shadow-lg shadow-indigo-100' : 'text-slate-400'}`}
                >
                  Primeiro Acesso
                </button>
              </div>
            )}
          </div>

          <div className="mb-10 text-center">
            <h2 className="text-[2.6rem] font-black text-[#1e1b4b] italic uppercase tracking-tighter mb-1 leading-none">
              {mode === 'login' ? 'BEM-VINDO DE' : 'CRIE SUA'} <br />
              <span className="text-[#593EFF]">{mode === 'login' ? 'VOLTA' : 'CONTA'}</span>
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3">
              {mode === 'login' ? 'Acesse sua área restrita' : 'Comece sua jornada no Radar Hub'}
            </p>
          </div>

          {step === 'info' ? (
            <form onSubmit={handleNext} className="space-y-6">
              
              {/* Seletor de Role APENAS no Registro */}
              {mode === 'register' && (
                <div className="p-1.5 bg-[#F8FAFC] rounded-[1.8rem] grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                  <button type="button" onClick={() => setRole(UserRole.CLIENT)} className={`py-4 rounded-[1.3rem] font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${role === UserRole.CLIENT ? 'bg-[#593EFF] text-white shadow-[0_10px_20_rgba(89,62,255,0.3)]' : 'text-slate-400'}`}>Condutor</button>
                  <button type="button" onClick={() => setRole(UserRole.LAWYER)} className={`py-4 rounded-[1.3rem] font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${role === UserRole.LAWYER ? 'bg-[#593EFF] text-white shadow-[0_10px_20_rgba(89,62,255,0.3)]' : 'text-slate-400'}`}>Advogado</button>
                </div>
              )}

              <div className="space-y-4">
                {/* Campos Específicos de Cadastro */}
                {mode === 'register' && (
                  <div className="space-y-4 animate-in slide-in-from-top-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Nome Completo *</label>
                      <input required placeholder="Ex: João da Silva" className="w-full px-7 py-5 bg-[#F8FAFC] border-2 border-transparent rounded-[1.5rem] outline-none focus:border-[#593EFF]/30 font-bold text-[#1e1b4b]" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">CPF *</label>
                        <input required placeholder="000.000.000-00" className="w-full px-7 py-5 bg-[#F8FAFC] border-2 border-transparent rounded-[1.5rem] font-bold text-[#1e1b4b]" value={formData.documentId} onChange={e => handleInputChange('documentId', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Nascimento *</label>
                        <input required placeholder="00/00/0000" className="w-full px-7 py-5 bg-[#F8FAFC] border-2 border-transparent rounded-[1.5rem] font-bold text-[#1e1b4b]" value={formData.birthDate} onChange={e => handleInputChange('birthDate', e.target.value)} />
                      </div>
                    </div>
                    {role === UserRole.LAWYER && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">OAB *</label>
                        <input required placeholder="UF 000.000" className="w-full px-7 py-5 bg-[#F8FAFC] border-2 border-transparent rounded-[1.5rem] font-bold text-[#1e1b4b]" value={formData.oab} onChange={e => handleInputChange('oab', e.target.value)} />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Campo de Telefone (Comum para Login e Registro) */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">WhatsApp</label>
                  <div className="relative">
                    <span className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 font-bold">+55</span>
                    <input 
                      type="tel"
                      required 
                      placeholder="(00) 00000-0000" 
                      className={`w-full pl-16 pr-7 py-6 bg-white border-2 rounded-[1.8rem] outline-none font-black text-[#1e1b4b] transition-colors ${error ? 'border-rose-400 bg-rose-50' : 'border-[#593EFF]'}`}
                      value={formData.phone} 
                      onChange={e => handleInputChange('phone', e.target.value)} 
                    />
                  </div>
                </div>
              </div>
              
              {/* Exibição de Erro Visual */}
              {error && (
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                    <div className="w-8 h-8 bg-rose-100 text-rose-500 rounded-lg flex items-center justify-center font-bold text-sm">!</div>
                    <p className="text-[10px] font-bold text-rose-500 leading-tight uppercase tracking-wide flex-grow">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button type="submit" disabled={loading} className="w-full py-6 bg-[#593EFF] text-white font-black rounded-[1.8rem] shadow-[0_15px_30px_rgba(89,62,255,0.4)] hover:scale-[1.02] active:scale-95 transition-all uppercase text-[11px] tracking-widest disabled:opacity-70 disabled:cursor-not-allowed">
                  {loading ? 'Processando...' : mode === 'login' ? 'Receber Código de Acesso' : 'Criar minha conta'}
                </button>
                {mode === 'login' && (
                  <button type="button" onClick={() => { setMode('register'); setError(null); }} className="w-full py-4 bg-slate-100 text-[#1e1b4b] font-black rounded-[1.5rem] uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">
                    Não tenho conta
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* PASSO 2: CÓDIGO DE VERIFICAÇÃO */
            <form onSubmit={handleFinalize} className="space-y-10 text-center py-6 animate-in zoom-in-95 duration-300">
              <div className="space-y-2">
                <p className="text-[#1e1b4b] font-black uppercase text-xs tracking-[0.1em]">Código de Verificação</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">Enviado para {formData.phone || '(11) 11111-1111'}</p>
                {debugOtp && <p className="text-[9px] text-amber-500 font-bold bg-amber-50 inline-block px-2 py-1 rounded">Debug: {debugOtp}</p>}
              </div>
              
              <div className="flex justify-center">
                <input 
                  required 
                  maxLength={4} 
                  placeholder="0 0 0 0" 
                  autoFocus
                  autoComplete="off"
                  className={`w-full max-w-[340px] h-28 px-6 bg-white border-2 rounded-[2.5rem] font-black text-5xl text-center tracking-[0.5em] text-[#593EFF] outline-none transition-all uppercase shadow-sm placeholder-slate-200 ${error ? 'border-rose-400' : 'border-[#593EFF]/20 focus:border-[#593EFF]'}`}
                  value={formData.otp} 
                  onChange={e => {
                    setFormData({...formData, otp: e.target.value.toUpperCase()});
                    setError(null);
                  }}
                />
              </div>

              {/* Exibição de Erro Visual no Passo OTP */}
              {error && (
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 inline-flex items-center gap-3 animate-in slide-in-from-bottom-2">
                    <p className="text-[10px] font-bold text-rose-500 leading-tight uppercase tracking-wide">{error}</p>
                </div>
              )}

              <div className="space-y-6 pt-4 flex flex-col items-center">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-6 bg-[#593EFF] text-white font-black rounded-[1.8rem] uppercase text-[11px] tracking-widest shadow-2xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Validando...' : 'Confirmar Acesso'}
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setStep('info')} 
                  className="text-[#593EFF] font-black uppercase text-[9px] tracking-[0.2em] hover:underline transition-all"
                >
                  Voltar e corrigir número
                </button>
              </div>
            </form>
          )}
        </div>
        
        {/* Footer de Segurança */}
        <div className="p-8 bg-white text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
            Sua segurança é nossa prioridade. Dados protegidos via Radar Hub Protocol.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
