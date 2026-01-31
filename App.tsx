
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import LawyerDashboard from './components/LawyerDashboard';
import ClientDashboard from './components/ClientDashboard';
import HowItWorks from './components/HowItWorks';
import Login from './components/Login';
import { User, UserRole } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>({
    phone: '',
    name: 'Visitante',
    role: UserRole.GUEST,
    isLoggedIn: false
  });

  const [currentView, setCurrentView] = useState<'home' | 'lawyer-dashboard' | 'client-dashboard' | 'how-it-works' | 'login'>('home');
  const [loginInitialRole, setLoginInitialRole] = useState<UserRole>(UserRole.CLIENT);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      const savedUser = localStorage.getItem('radar_hub_session');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        if (currentView === 'home') {
          setCurrentView(user.role === UserRole.LAWYER ? 'lawyer-dashboard' : 'client-dashboard');
        }
      }
      setIsInitializing(false);
    };
    initSession();
  }, []);

  const handleLoginSuccess = async (userData: Partial<User>) => {
    const user = {
      ...currentUser,
      ...userData,
      isLoggedIn: true
    } as User;

    setCurrentUser(user);
    localStorage.setItem('radar_hub_session', JSON.stringify(user));
    setCurrentView(user.role === UserRole.LAWYER ? 'lawyer-dashboard' : 'client-dashboard');
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    setCurrentUser({ phone: '', name: 'Visitante', role: UserRole.GUEST, isLoggedIn: false });
    localStorage.removeItem('radar_hub_session');
    localStorage.removeItem('radar_token');
    setCurrentView('home');
    window.scrollTo(0, 0);
  };

  const handleNavToLogin = (role: UserRole = UserRole.CLIENT) => {
    if (currentUser.isLoggedIn) {
      setCurrentView(currentUser.role === UserRole.LAWYER ? 'lawyer-dashboard' : 'client-dashboard');
    } else {
      setLoginInitialRole(role);
      setCurrentView('login');
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e1b4b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#593EFF] border-t-white rounded-full animate-spin"></div>
          <span className="text-white font-black uppercase text-[10px] tracking-[0.2em] italic">Radar Hub Systems...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-[#593EFF] selection:text-white">
      <Navbar 
        user={currentUser} 
        onLogout={handleLogout} 
        onLogin={(role) => handleNavToLogin(role)}
        onNavigateHome={() => setCurrentView('home')}
      />
      
      <main className="flex-grow">
        {currentView === 'login' && (
          <Login 
            initialRole={loginInitialRole}
            onLoginSuccess={handleLoginSuccess} 
            onCancel={() => setCurrentView('home')} 
          />
        )}
        {currentView === 'home' && (
          <LandingPage 
            onStart={(role) => handleNavToLogin(role)} 
            onViewHowItWorks={() => setCurrentView('how-it-works')} 
          />
        )}
        {currentView === 'how-it-works' && <HowItWorks />}
        {currentView === 'lawyer-dashboard' && currentUser.role === UserRole.LAWYER && <LawyerDashboard onLogout={handleLogout} user={currentUser} />}
        {currentView === 'client-dashboard' && currentUser.role === UserRole.CLIENT && <ClientDashboard onLogout={handleLogout} user={currentUser} />}
      </main>

      {!(currentView === 'lawyer-dashboard' || currentView === 'client-dashboard') && (
        <footer className="bg-[#1a194d] text-white py-12 px-6">
          <div className="max-w-7xl mx-auto text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              Radar Hub Architecture: .NET + RabbitMQ + React MAUI Ready
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
