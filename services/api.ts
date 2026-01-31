
import { User, UserRole, ProcessRequest, ProcessStatus } from '../types';

const API_BASE_URL = 'https://api.radarhub.com.br/v1';

export const RadarApiService = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    console.log(`[API REST] Chamando: ${API_BASE_URL}${endpoint}`, options);
    await new Promise(resolve => setTimeout(resolve, 800));
    throw new Error("Simulação de Backend");
  },

  async login(phone: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const user = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      phone,
      name: 'Dr. Anderson Silva',
      role: UserRole.LAWYER,
      isLoggedIn: true,
      token: 'jwt_mock_' + Date.now()
    };
    localStorage.setItem('radar_token', user.token);
    return user;
  },

  async submitDefenseRequest(data: any): Promise<{ success: boolean; messageId: string }> {
    console.log(`[RABBITMQ] Publicando mensagem na fila: queue_defense_requests`, data);
    await new Promise(resolve => setTimeout(resolve, 1800));
    return {
      success: true,
      messageId: 'mq_' + Math.random().toString(36).substr(2, 9)
    };
  },

  async getOpportunities(): Promise<ProcessRequest[]> {
    return [
      { 
        id: 'opt_1', 
        readable_id: 'RAD-7721', 
        client_id: 'c1', 
        clientName: 'Roberto Almeida', 
        type: 'Suspensão', 
        // Fix: Changed 'points' to 'totalPoints' and added 'fines' to match ProcessRequest interface
        totalPoints: 22, 
        fines: [],
        value: 490, 
        deadline: '24h', 
        // Fix: Changed non-existent 'PENDING' to 'AWAITING_LAWYERS' to represent initial state
        status: ProcessStatus.AWAITING_LAWYERS, 
        description: 'Multa por excesso de velocidade capturada por radar fixo.',
        created_at: new Date().toISOString()
      },
      { 
        id: 'opt_2', 
        readable_id: 'RAD-9902', 
        client_id: 'c2', 
        clientName: 'Juliana Paes', 
        type: 'Cassação', 
        // Fix: Changed 'points' to 'totalPoints' and added 'fines' to match ProcessRequest interface
        totalPoints: 45, 
        fines: [],
        value: 980, 
        deadline: 'Amanhã', 
        // Fix: Changed non-existent 'PENDING' to 'AWAITING_LAWYERS' for consistency
        status: ProcessStatus.AWAITING_LAWYERS, 
        description: 'Reincidência em dirigir sob efeito de álcool (Lei Seca).',
        created_at: new Date().toISOString()
      }
    ];
  },

  async getClientHistory(clientId: string): Promise<ProcessRequest[]> {
    const saved = localStorage.getItem(`defenses_${clientId}`);
    return saved ? JSON.parse(saved) : [];
  }
};

export const DatabaseService = {
  async getOpenOpportunities(): Promise<ProcessRequest[]> {
    return RadarApiService.getOpportunities();
  },

  async acceptProcess(id: string, lawyerId: string): Promise<boolean> {
    console.log(`[API REST] PATCH /api/processes/${id} - Lawyer: ${lawyerId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }
};
