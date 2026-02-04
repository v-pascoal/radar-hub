
import { User, UserRole, ProcessRequest, TimelineEvent, ApiResponse, WalletStats, Tip } from '../types';
import { mockServerInstance } from './mockBackend';

const API_BASE_URL = 'https://api.radarhub.com.br/v1';

// --- HTTP CLIENT ABSTRACTION ---
// Simula o comportamento do Axios/Fetch interagindo com o servidor mock
async function httpClient<T>(method: string, endpoint: string, body?: any): Promise<T> {
    // Recupera Token do LocalStorage (Client Side Only)
    let token = '';
    const session = localStorage.getItem('radar_hub_session');
    if (session) {
        const user = JSON.parse(session);
        if (user.token) token = `Bearer ${user.token}`;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': token
    };

    console.log(`📡 [HTTP Client] Sending ${method} ${endpoint}`);
    
    // Chama o "Servidor"
    const response: ApiResponse = await mockServerInstance.handleRequest(method, endpoint, body, headers);

    if (!response.success) {
        throw new Error(response.error || 'Erro na comunicação com o servidor.');
    }

    return response.data as T;
}

export const RadarApiService = {
  // --- AUTH ---
  async requestOtp(phone: string, isLoginMode: boolean = false): Promise<string> {
    return httpClient<string>('POST', '/auth/otp/request', { phone, isLoginMode });
  },

  async verifyOtp(phone: string, code: string, role?: UserRole): Promise<User> {
    return httpClient<User>('POST', '/auth/otp/verify', { phone, code, role });
  },

  // --- CLIENT ---
  async submitDefenseRequest(data: { client_id: string, type: string, fines: any[], totalPoints: number, description?: string, clientName?: string }): Promise<{ success: boolean; messageId: string }> {
    // Calculo de valores agora é feito/validado no backend, mas enviamos a estimativa
    const value = data.type === 'Cassação' ? 980 : 490;
    return httpClient<{ success: boolean; messageId: string }>('POST', '/client/processes', { ...data, value });
  },

  async getClientHistory(clientId: string): Promise<ProcessRequest[]> {
    return httpClient<ProcessRequest[]>('GET', '/client/processes');
  },

  async getFinishedProcessDetail(processId: string): Promise<any> {
    return httpClient<any>('GET', `/client/processes/${processId}/history`);
  },

  async updateProfile(userId: string, data: any): Promise<boolean> {
    return httpClient<boolean>('PUT', `/users/${userId}`, data);
  }
};

export const DatabaseService = {
  // --- LAWYER ---
  async getOpenOpportunities(): Promise<ProcessRequest[]> {
    return httpClient<ProcessRequest[]>('GET', '/lawyer/opportunities');
  },

  async getLawyerProcesses(lawyerId: string): Promise<ProcessRequest[]> {
    return httpClient<ProcessRequest[]>('GET', `/lawyer/processes?lawyerId=${lawyerId}`);
  },

  async getProcessTimeline(processId: string): Promise<TimelineEvent[]> {
    return httpClient<TimelineEvent[]>('GET', `/lawyer/processes/${processId}/timeline`);
  },

  async getWalletStats(lawyerId: string): Promise<WalletStats> {
    return httpClient<WalletStats>('GET', `/lawyer/wallet/${lawyerId}`);
  },

  async getTips(lawyerId: string): Promise<Tip[]> {
    return httpClient<Tip[]>('GET', `/lawyer/tips/${lawyerId}`);
  },

  async acceptProcess(id: string, lawyerId: string): Promise<boolean> {
    // LawyerId agora é inferido pelo token no backend, mas mantemos assinatura
    return httpClient<boolean>('POST', `/lawyer/processes/${id}/accept`);
  },

  async updateProcessStatus(id: string, data: { status: string, note: string, files: File[] }): Promise<boolean> {
    return httpClient<boolean>('PUT', `/lawyer/processes/${id}/status`, {
        status: data.status,
        description: data.note
    });
  }
};
