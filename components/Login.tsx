
import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../types';

interface LoginProps {
  initialRole?: UserRole;
  onLoginSuccess: (userData: Partial<User>) => void;
  onCancel: () => void;
}

const Login: React.FC<LoginProps> = ({ initialRole = UserRole.CLIENT, onLoginSuccess, onCancel }) => {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [step, setStep] = useState<'info' | 'otp'>('info');
  const [loading, setLoading] = useState(false);
  
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
  }, [initialRole]);

  // Funções de Máscara Robusta
  const maskPhone = (value: string) => {
    let v = value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (v.length > 11) v = v.substring(0, 11);
    
    if (v.length > 10) {
      // Celular: (11) 99614-5691
      v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (v.length > 0) {
      v = v.replace(/^(\d{0,2})/, '($1');
    }
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
    // Formato: UF 000000
    let v = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length > 8) v = v.substring(0, 8);
    
    if (v.length > 2) {
      v = v.substring(0, 2) + ' ' + v.substring(2);
    }
    return v;
  };

  const handleInputChange = (field: string, value: string) => {
    let maskedValue = value;
    if (field === 'phone') maskedValue = maskPhone(value);
    if (field === 'documentId') maskedValue = maskCPF(value);
    if (field === 'birthDate') maskedValue = maskDate(value);
    if (field === 'oab') maskedValue = maskOAB(value);

    setFormData({ ...formData, [field]: maskedValue });
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 1000);
  };

  const handleFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        ...formData,
        role,
        isLoggedIn: true
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1e1b4b]/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col relative">
        <div className="p-8 md:p-12 overflow-y-auto">
          {/* Header com Toggle e Voltar */}
          <div className="flex items-center mb-10">
            <button onClick={onCancel} className="p-2 text-slate-400 hover:text-[#593EFF] transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex bg-[#F1F5F9] p-1.5 rounded-2xl mx-auto">
              <button 
                type="button"
                onClick={() => setMode('login')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white text-slate-400 shadow-sm' : 'text-slate-400'}`}
              >
                Já tenho conta
              </button>
              <button 
                type="button"
                onClick={() => setMode('register')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-[#593EFF] shadow-lg shadow-indigo-100' : 'text-slate-400'}`}
              >
                Primeiro Acesso
              </button>
            </div>
          </div>

          <div className="mb-10 text-center">
            <h2 className="text-[2.6rem] font-black text-[#1e1b4b] italic uppercase tracking-tighter mb-1 leading-none">
              {mode === 'login' ? 'BOM TE VER DE ' : 'JUNTE-SE AO '}
              <span className="text-[#593EFF]">{mode === 'login' ? 'VOLTA' : 'RADAR'}</span>
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              {mode === 'login' ? 'Acesse sua área restrita' : 'Crie seu perfil em segundos'}
            </p>
          </div>

          {step === 'info' ? (
            <form onSubmit={handleNext} className="space-y-6">
              {/* Role Selector estilizado igual imagem */}
              <div className="p-1.5 bg-[#F8FAFC] rounded-[1.8rem] grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => setRole(UserRole.CLIENT)}
                  className={`py-4 rounded-[1.3rem] font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${role === UserRole.CLIENT ? 'bg-[#593EFF] text-white shadow-[0_10px_20px_rgba(89,62,255,0.3)]' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                  Condutor
                </button>
                <button 
                  type="button"
                  onClick={() => setRole(UserRole.LAWYER)}
                  className={`py-4 rounded-[1.3rem] font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${role === UserRole.LAWYER ? 'bg-[#593EFF] text-white shadow-[0_10px_20px_rgba(89,62,255,0.3)]' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  Advogado
                </button>
              </div>

              {/* Campos do Formulário com Máscaras */}
              <div className="space-y-4">
                {mode === 'register' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Nome Completo</label>
                      <input 
                        required
                        placeholder="Ex: João da Silva"
                        className="w-full px-7 py-5 bg-[#F8FAFC] border-2 border-transparent rounded-[1.5rem] outline-none focus:border-[#593EFF]/30 focus:bg-white font-bold text-[#1e1b4b] transition-all"
                        value={formData.name}
                        onChange={e => handleInputChange('name', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">CPF / CNPJ</label>
                        <input 
                          required
                          placeholder="000.000.000-00"
                          className="w-full px-7 py-5 bg-[#F8FAFC] border-2 border-transparent rounded-[1.5rem] outline-none focus:border-[#593EFF]/30 focus:bg-white font-bold text-[#1e1b4b] transition-all"
                          value={formData.documentId}
                          onChange={e => handleInputChange('documentId', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Data de Nascimento</label>
                        <div className="relative">
                           <input 
                            required
                            placeholder="00/00/0000"
                            className="w-full px-7 py-5 bg-[#F8FAFC] border-2 border-transparent rounded-[1.5rem] outline-none focus:border-[#593EFF]/30 focus:bg-white font-bold text-[#1e1b4b] transition-all"
                            value={formData.birthDate}
                            onChange={e => handleInputChange('birthDate', e.target.value)}
                          />
                          <svg className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z"/></svg>
                        </div>
                      </div>
                    </div>
                    {role === UserRole.LAWYER && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Registro OAB</label>
                        <input 
                          required
                          placeholder="UF 000.000"
                          className="w-full px-7 py-5 bg-[#F8FAFC] border-2 border-transparent rounded-[1.5rem] outline-none focus:border-[#593EFF]/30 focus:bg-white font-bold text-[#1e1b4b] transition-all"
                          value={formData.oab}
                          onChange={e => handleInputChange('oab', e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Telefone (WhatsApp)</label>
                  <div className="relative group">
                    <span className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 font-bold">+55</span>
                    <input 
                      required
                      placeholder="(00) 00000-0000"
                      className="w-full pl-16 pr-7 py-6 bg-white border-2 border-[#593EFF] rounded-[1.8rem] outline-none font-black text-[#1e1b4b] transition-all shadow-inner"
                      value={formData.phone}
                      onChange={e => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-[#593EFF] text-white font-black rounded-[1.8rem] shadow-[0_15px_30px_rgba(89,62,255,0.4)] hover:scale-[1.02] active:scale-95 transition-all uppercase text-[11px] tracking-widest mt-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                ) : mode === 'register' ? 'Criar minha conta agora' : 'Entrar na conta'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleFinalize} className="space-y-8 text-center py-6 animate-in zoom-in-95 duration-300">
              <div className="space-y-2">
                <p className="text-[#1e1b4b] font-black uppercase text-xs">Código de Verificação</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">Acabamos de enviar para {formData.phone}</p>
              </div>
              <div className="flex justify-center">
                <input 
                  autoFocus
                  required
                  maxLength={6}
                  placeholder="000000"
                  className="w-full max-w-[280px] px-6 py-7 bg-[#F8FAFC] border-2 border-transparent rounded-[2.5rem] outline-none focus:border-[#593EFF]/30 font-black text-5xl text-center tracking-[0.4em] shadow-inner text-[#593EFF]"
                  value={formData.otp}
                  onChange={e => setFormData({...formData, otp: e.target.value})}
                />
              </div>
              <div className="space-y-4 pt-4">
                <button 
                  type="submit"
                  className="w-full py-6 bg-[#593EFF] text-white font-black rounded-[1.8rem] uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-100"
                >
                  Confirmar Acesso
                </button>
                <button type="button" onClick={() => setStep('info')} className="text-[#593EFF] font-black uppercase text-[9px] tracking-[0.2em] hover:underline">Voltar e corrigir dados</button>
              </div>
            </form>
          )}
        </div>
        <div className="p-8 bg-[#F8FAFC]/50 border-t border-slate-100 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Sua segurança é nossa prioridade. Dados protegidos via Radar Hub Protocol.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
