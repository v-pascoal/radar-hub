
import { User, UserRole, ProcessRequest, ProcessStatus } from '../types';
import { mockBackendInstance } from './mockBackend';

const API_BASE_URL = 'https://api.radarhub.com.br/v1';

// Função auxiliar para logar requests (Simulando interceptor do Axios)
const logRequest = (method: string, url: string, body?: any) => {
    console.log(`%c[API Request] ${method} ${url}`, 'color: #593EFF; font-weight: bold;');
    if (body) console.log('Body:', body);
};

export const RadarApiService = {
  // --- AUTH ENDPOINTS ---
  // Retorna string (o código debug) para exibir no alerta, ou lança erro se falhar
  async requestOtp(phone: string, isLoginMode: boolean = false): Promise<string> {
    logRequest('POST', '/auth/otp/request', { phone, isLoginMode });
    // Se der erro no mock (ex: usuário não encontrado), ele lança exceção e o componente trata.
    const debugCode = await mockBackendInstance.requestAuthOtp(phone, isLoginMode);
    return debugCode;
  },

  async verifyOtp(phone: string, code: string, role?: UserRole): Promise<User> {
    logRequest('POST', '/auth/otp/verify', { phone, code, role });
    const user = await mockBackendInstance.authVerify(phone, code, role);
    if (!user) throw new Error("Falha na autenticação");
    return user;
  },

  // --- CLIENT ENDPOINTS ---
  async submitDefenseRequest(data: { client_id: string, type: string, fines: any[], totalPoints: number, description?: string, clientName?: string }): Promise<{ success: boolean; messageId: string }> {
    logRequest('POST', '/client/processes', data);
    
    const value = data.type === 'Cassação' ? 980 : 490;
    const result = await mockBackendInstance.submitProcess({ ...data, value });
    
    return {
      success: result.success,
      messageId: result.id
    };
  },

  async getClientHistory(clientId: string): Promise<ProcessRequest[]> {
    logRequest('GET', `/client/processes?clientId=${clientId}`);
    // Retorna todos os processos do cliente (ativos e finalizados)
    return mockBackendInstance.getMyProcesses(clientId, UserRole.CLIENT);
  },

  async getFinishedProcessDetail(processId: string): Promise<any> {
    logRequest('GET', `/client/processes/${processId}/history`);
    return mockBackendInstance.getHistoryDetail(processId);
  },

  async updateProfile(userId: string, data: any): Promise<boolean> {
    logRequest('PUT', `/users/${userId}`, data);
    return mockBackendInstance.updateUser(userId, data);
  }
};

export const DatabaseService = {
  // --- LAWYER ENDPOINTS ---
  async getOpenOpportunities(): Promise<ProcessRequest[]> {
    logRequest('GET', '/lawyer/opportunities');
    return mockBackendInstance.getOpportunities();
  },

  async getLawyerProcesses(lawyerId: string): Promise<ProcessRequest[]> {
    logRequest('GET', `/lawyer/processes?lawyerId=${lawyerId}`);
    return mockBackendInstance.getMyProcesses(lawyerId, UserRole.LAWYER);
  },

  async getWalletStats(lawyerId: string) {
    logRequest('GET', `/lawyer/wallet/${lawyerId}`);
    return mockBackendInstance.getWalletStats(lawyerId);
  },

  async getTips(lawyerId: string) {
    logRequest('GET', `/lawyer/tips/${lawyerId}`);
    return mockBackendInstance.getLawyerTips(lawyerId);
  },

  async acceptProcess(id: string, lawyerId: string): Promise<boolean> {
    logRequest('POST', `/lawyer/processes/${id}/accept`, { lawyerId });
    return mockBackendInstance.acceptOpportunity(id, lawyerId);
  },

  async updateProcessStatus(id: string, data: { status: string, note: string, files: File[] }): Promise<boolean> {
    // Conversão de status string para Enum
    let newStatus = ProcessStatus.IN_PROGRESS;
    if (data.status === 'Finalizado') newStatus = ProcessStatus.FINISHED;
    if (data.status === 'Aguardando Pagamento') newStatus = ProcessStatus.AWAITING_PAYMENT;

    logRequest('PUT', `/lawyer/processes/${id}/status`, { 
        status: newStatus, 
        note: data.note, 
        filesCount: data.files.length 
    });

    return mockBackendInstance.updateProcessStatus(id, {
        status: newStatus,
        lastUpdateNote: data.status, // Usando o label vindo do front
        description: data.note
    });
  }
};
