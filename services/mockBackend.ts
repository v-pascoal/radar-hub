
import { ProcessRequest, ProcessStatus, User, UserRole, TimelineEvent, ApiResponse } from '../types';

// --- DATABASE SIMULATION ---
interface DB {
  users: User[];
  processes: ProcessRequest[];
  historyDetails: Record<string, any>;
  processTimelines: Record<string, TimelineEvent[]>;
  tips: { title: string; description: string; type: 'urgent' | 'info' | 'success' }[];
  otps: Map<string, string>; // Tabela temporária de códigos
}

const INITIAL_DB: DB = {
  users: [
    // --- ADVOGADOS ---
    {
      id: 'lawyer_1',
      name: 'Dr. Carlos Mendes',
      phone: '11999999999',
      documentId: '325.271.398-50',
      role: UserRole.LAWYER,
      isLoggedIn: false,
      oab: 'SP 123.456',
      oabValidity: '12/12/2030',
      documentValidity: '10/10/2030',
      documentPdfUrl: 'mock_cnh.pdf', 
      oabPdfUrl: 'mock_oab.pdf',      
      avatar: 'https://i.pravatar.cc/150?u=lawyer_1',
      specialty: 'Direito de Trânsito',
      birthDate: '10/05/1980',
      verificationStatus: 'VERIFIED',
      createdAt: '2023-01-15T10:00:00Z'
    },
    {
      id: 'lawyer_2',
      name: 'Dra. Fernanda Lima',
      phone: '21988887777', 
      documentId: '999.888.777-66',
      role: UserRole.LAWYER,
      isLoggedIn: false,
      oab: 'RJ 987.654',
      oabValidity: '05/05/2028',
      documentValidity: '01/01/2029',
      documentPdfUrl: 'mock_cnh_2.pdf', 
      oabPdfUrl: 'mock_oab_2.pdf',      
      avatar: 'https://i.pravatar.cc/150?u=lawyer_2',
      specialty: 'Processos Administrativos',
      birthDate: '15/08/1985',
      verificationStatus: 'VERIFIED',
      createdAt: '2023-03-20T14:30:00Z'
    },
    // --- CLIENTES ---
    {
      id: 'client_1',
      name: 'Roberto Almeida',
      phone: '11988888888',
      role: UserRole.CLIENT,
      isLoggedIn: false,
      documentId: '333.444.555-66',
      documentValidity: '20/12/2026',
      documentPdfUrl: 'mock_doc_client.pdf', 
      avatar: 'https://i.pravatar.cc/150?u=client_1',
      birthDate: '01/02/1980',
      verificationStatus: 'VERIFIED',
      createdAt: '2023-10-05T09:00:00Z'
    }
  ],
  processes: [
    {
        id: 'proc_active_1',
        readable_id: 'RAD-7721',
        client_id: 'client_1',
        lawyer_id: 'lawyer_1',
        clientName: 'Roberto Almeida',
        type: 'Suspensão',
        totalPoints: 22,
        fines: [{ id: 'f1', points: 7, documentUrl: 'url_mock', documentName: 'Multa_Velocidade.pdf' }],
        value: 490,
        deadline: '24h',
        status: ProcessStatus.AWAITING_PROTOCOL,
        description: 'Multa por excesso de velocidade.',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        lastUpdateNote: 'Aguardando Protocolação',
        processNumber: '0012345-67.2024'
    },
    {
        id: 'proc_hist_1',
        readable_id: 'RAD-8842',
        client_id: 'client_1',
        clientName: 'Roberto Almeida',
        type: 'Cassação',
        totalPoints: 0,
        fines: [{ id: 'f1', points: 7, documentUrl: '#', documentName: 'Multa_Lei_Seca.pdf' }],
        value: 980,
        deadline: 'Finalizado',
        status: ProcessStatus.FINISHED,
        description: 'Processo administrativo de cassação.',
        lastUpdateNote: 'Deferido',
        created_at: '2023-08-10',
    }
  ],
  processTimelines: {
      'proc_active_1': [
          {
              id: 'evt_1',
              processId: 'proc_active_1',
              date: new Date(Date.now() - 3600000 * 2).toISOString(),
              title: 'Solicitação de Documento',
              description: 'Roberto, preciso de uma cópia legível do seu comprovante.',
              authorRole: 'LAWYER',
              authorName: 'Dr. Carlos Mendes',
              type: 'MESSAGE'
          }
      ]
  },
  tips: [
      { title: "Agilidade na Avaliação", description: "Aceite e avalie os casos disponíveis rapidamente.", type: 'urgent' },
      { title: "Protocolo Expresso", description: "Protocole o pedido do cliente nas primeiras 48 horas.", type: 'info' },
      { title: "Comunicação Proativa", description: "Atualize o status a cada movimentação.", type: 'success' }
  ],
  historyDetails: {
    'proc_hist_1': {
        finalResult: 'DEFERIDO',
        lawyerName: 'Dr. Carlos Mendes',
        finishedDate: '15/12/2023',
        timeline: [
            { date: '15/12/2023', type: 'success', title: 'Sentença Final - Deferido', description: 'O recurso foi julgado procedente.', docName: 'Decisao.pdf', docUrl: '#' }
        ]
    }
  },
  otps: new Map()
};

// --- SERVER LOGIC ---

class MockServer {
  private db: DB;

  constructor() {
    const saved = localStorage.getItem('mock_db_v7');
    this.db = saved ? JSON.parse(saved) : INITIAL_DB;
    // OTPs não persistem
    this.db.otps = new Map();
  }

  private save() {
    // Persiste apenas dados, não OTPs
    const toSave = { ...this.db, otps: undefined };
    localStorage.setItem('mock_db_v7', JSON.stringify(toSave));
  }

  // Helper de "JWT"
  private getUserIdFromToken(token: string | undefined): string | null {
    if (!token) return null;
    const parts = token.split(' ');
    if (parts.length !== 2) return null;
    
    // Tenta decodificar formato Base64 (Simulando JWT real)
    try {
        const tokenPart = parts[1];
        // Formato esperado: header.payload.signature
        const jwtParts = tokenPart.split('.');
        // Aceita tokens com 2 ou 3 partes (header.payload ou header.payload.signature)
        if (jwtParts.length >= 2) {
            // Em JWT, o payload é a segunda parte
            const payload = JSON.parse(atob(jwtParts[1]));
            return payload.sub;
        }
    } catch (e) {
        console.error("Erro ao decodificar token", e);
    }

    return null;
  }

  private authenticate(headers: any): User {
    const userId = this.getUserIdFromToken(headers['Authorization']);
    const user = this.db.users.find(u => u.id === userId);
    if (!user) {
        console.warn(`Auth failed. ID extracted: ${userId}`);
        throw { status: 401, message: 'Não autorizado. Token inválido.' };
    }
    return user;
  }

  // --- REQUEST HANDLER (Main Entry Point) ---
  async handleRequest(method: string, endpoint: string, body?: any, headers: any = {}): Promise<ApiResponse> {
    console.group(`🖥️ [Mock Server] ${method} ${endpoint}`);
    console.log('Headers:', headers);
    console.log('Body:', body);
    
    // Simula latência de rede
    await new Promise(r => setTimeout(r, 400 + Math.random() * 400));

    try {
        let result: any;

        // --- ROTAS ABERTAS (Public) ---
        
        if (method === 'POST' && endpoint === '/auth/otp/request') {
            result = this.authRequestOtp(body.phone, body.isLoginMode);
        }
        else if (method === 'POST' && endpoint === '/auth/otp/verify') {
            // Agora recebe userData também
            result = this.authVerifyOtp(body.phone, body.code, body.role, body.userData);
        }

        // --- ROTAS PROTEGIDAS ---
        else {
            const user = this.authenticate(headers);
            console.log(`👤 User Authenticated: ${user.name} (${user.role})`);

            // Rotas de Usuário Comum
            if (method === 'PUT' && endpoint.startsWith('/users/')) {
                const targetId = endpoint.split('/')[2];
                if (targetId !== user.id) throw { status: 403, message: 'Proibido alterar outro usuário.' };
                result = this.updateUserProfile(user.id!, body);
            }

            // Rotas de Advogado
            else if (user.role === UserRole.LAWYER) {
                 if (method === 'GET' && endpoint === '/lawyer/opportunities') {
                     result = this.db.processes.filter(p => p.status === ProcessStatus.AWAITING_LAWYERS);
                 }
                 else if (method === 'GET' && endpoint.includes('/processes') && !endpoint.includes('timeline')) {
                     // Filtra processos deste advogado
                     result = this.db.processes.filter(p => p.lawyer_id === user.id);
                 }
                 else if (method === 'GET' && endpoint.includes('/timeline')) {
                     const procId = endpoint.split('/')[3];
                     // Verifica se o processo pertence ao advogado
                     const proc = this.db.processes.find(p => p.id === procId && p.lawyer_id === user.id);
                     if (!proc) throw { status: 403, message: 'Acesso negado ao processo.' };
                     result = this.db.processTimelines[procId] || [];
                 }
                 else if (method === 'POST' && endpoint.endsWith('/accept')) {
                     const procId = endpoint.split('/')[3];
                     result = this.lawyerAcceptProcess(user, procId);
                 }
                 else if (method === 'PUT' && endpoint.endsWith('/status')) {
                     const procId = endpoint.split('/')[3];
                     result = this.lawyerUpdateStatus(user, procId, body);
                 }
                 else if (method === 'GET' && endpoint.includes('/wallet')) {
                     result = this.getWalletStats(user.id!);
                 }
                 else if (method === 'GET' && endpoint.includes('/tips')) {
                     result = this.db.tips;
                 }
                 else {
                     throw { status: 404, message: 'Endpoint não encontrado para Lawyer' };
                 }
            }

            // Rotas de Cliente
            else if (user.role === UserRole.CLIENT) {
                if (method === 'POST' && endpoint === '/client/processes') {
                    result = this.clientSubmitProcess(user, body);
                }
                else if (method === 'GET' && endpoint === '/client/processes') {
                    result = this.db.processes.filter(p => p.client_id === user.id);
                }
                else if (method === 'GET' && endpoint.endsWith('/history')) {
                     const procId = endpoint.split('/')[3];
                     // Valida propriedade
                     const proc = this.db.processes.find(p => p.id === procId && p.client_id === user.id);
                     if (!proc) throw { status: 403, message: 'Acesso negado.' };
                     
                     const details = this.db.historyDetails[procId];
                     result = details ? { ...proc, ...details } : null;
                }
                else {
                    throw { status: 404, message: 'Endpoint não encontrado para Client' };
                }
            }
            else {
                throw { status: 403, message: 'Role não autorizada.' };
            }
        }

        console.log('✅ Response:', result);
        console.groupEnd();
        return { success: true, data: result, status: 200 };

    } catch (err: any) {
        console.error('❌ Error:', err);
        console.groupEnd();
        return {
            success: false,
            error: err.message || 'Internal Server Error',
            status: err.status || 500
        };
    }
  }

  // --- CONTROLLERS (Business Logic) ---

  private authRequestOtp(phone: string, isLoginMode: boolean) {
      const userExists = this.db.users.some(u => u.phone === phone);
      
      // Regra de Ouro da Reversão: Validação Pré-OTP
      if (isLoginMode && !userExists) {
          throw { status: 404, message: "Usuário não encontrado. Crie uma conta." };
      }
      
      if (!isLoginMode && userExists) {
           throw { status: 409, message: "Este telefone já possui cadastro. Faça login." };
      }

      const code = "1234"; 
      this.db.otps.set(phone, code);
      return code; 
  }

  private authVerifyOtp(phone: string, code: string, role?: UserRole, userData?: Partial<User>) {
      // Backdoor para testes ou verifica mapa
      const valid = code === "1234" || this.db.otps.get(phone) === code;
      if (!valid) throw { status: 400, message: "Código inválido." };

      let user = this.db.users.find(u => u.phone === phone);
      
      if (!user && role) {
          // Lógica de Registro (Register logic)
          // Agora usamos os dados passados (userData) para popular o objeto
          user = {
              id: `usr_${Date.now()}`,
              phone,
              name: userData?.name || '',
              documentId: userData?.documentId || '',
              birthDate: userData?.birthDate || '',
              oab: userData?.oab || undefined,
              role,
              isLoggedIn: true,
              verificationStatus: 'PENDING', // Ainda pendente pois falta upload dos documentos
              createdAt: new Date().toISOString()
          };
          this.db.users.push(user);
          this.save();
      } else if (!user) {
          throw { status: 404, message: "Conta não encontrada." };
      }

      // Gera Token Fake (Formato JWT-ish: Header.Payload.Signature)
      const payload = { 
          sub: user.id, 
          role: user.role, 
          name: user.name, 
          iat: Date.now() 
      };
      
      // header falso + payload base64 + assinatura falsa
      const token = `mock.${btoa(JSON.stringify(payload))}.signature`;
      
      user.isLoggedIn = true;
      user.token = token; 
      
      return user;
  }

  private updateUserProfile(userId: string, data: any) {
      const idx = this.db.users.findIndex(u => u.id === userId);
      if (idx === -1) throw { status: 404, message: "User not found" };

      const currentUser = this.db.users[idx];
      const updatedUser = { ...currentUser, ...data };

      // Regra de Negócio: Mudança de Status
      if (updatedUser.verificationStatus !== 'VERIFIED') {
          const hasDocs = updatedUser.role === UserRole.CLIENT 
              ? (updatedUser.documentId && updatedUser.documentPdfUrl)
              : (updatedUser.documentId && updatedUser.oab && updatedUser.oabPdfUrl);
          
          updatedUser.verificationStatus = hasDocs ? 'UNDER_ANALYSIS' : 'PENDING';
      }

      this.db.users[idx] = updatedUser;
      this.save();
      return true;
  }

  private lawyerAcceptProcess(lawyer: User, processId: string) {
      const procIdx = this.db.processes.findIndex(p => p.id === processId);
      if (procIdx === -1) throw { status: 404, message: "Processo não encontrado" };

      const process = this.db.processes[procIdx];
      if (process.status !== ProcessStatus.AWAITING_LAWYERS) {
          throw { status: 400, message: "Este processo não está mais disponível." };
      }

      // Atomic Update
      process.status = ProcessStatus.AWAITING_PAYMENT;
      process.lawyer_id = lawyer.id;
      process.lastUpdateNote = 'Aguardando Pagamento';
      
      this.db.processes[procIdx] = process;

      // Add Timeline Event
      this.addTimelineEvent(processId, {
          title: 'Causa Aceita',
          description: `O advogado ${lawyer.name} aceitou a solicitação.`,
          authorRole: 'LAWYER',
          authorName: lawyer.name,
          type: 'STATUS_CHANGE'
      });

      this.save();
      return true;
  }

  private lawyerUpdateStatus(lawyer: User, processId: string, data: any) {
      const procIdx = this.db.processes.findIndex(p => p.id === processId);
      if (procIdx === -1) throw { status: 404, message: "Processo não encontrado" };
      
      // Validação de Permissão
      if (this.db.processes[procIdx].lawyer_id !== lawyer.id) {
          throw { status: 403, message: "Você não é o responsável por este processo." };
      }

      this.db.processes[procIdx].status = data.status;
      this.db.processes[procIdx].lastUpdateNote = data.status; // Label simples
      
      this.addTimelineEvent(processId, {
          title: data.status,
          description: data.description || 'Status atualizado pelo advogado.',
          authorRole: 'LAWYER',
          authorName: lawyer.name,
          type: 'STATUS_CHANGE'
      });

      this.save();
      return true;
  }

  private clientSubmitProcess(client: User, data: any) {
      const newId = `proc_${Date.now()}`;
      const newProcess: ProcessRequest = {
          id: newId,
          readable_id: `RAD-${Math.floor(1000 + Math.random() * 9000)}`,
          client_id: client.id!,
          clientName: client.name || 'Cliente',
          type: data.type,
          totalPoints: data.totalPoints,
          fines: data.fines,
          value: data.value, // Backend calculando/validando valor se quisesse
          deadline: 'Análise Pendente',
          status: ProcessStatus.AWAITING_LAWYERS,
          description: data.description,
          lastUpdateNote: 'Aguardando Advogados',
          created_at: new Date().toISOString()
      };

      this.db.processes.unshift(newProcess);
      this.addTimelineEvent(newId, {
          title: 'Solicitação Criada',
          description: 'Defesa solicitada.',
          authorRole: 'CLIENT',
          authorName: client.name,
          type: 'STATUS_CHANGE'
      });
      
      this.save();
      return { id: newId, success: true };
  }

  private getWalletStats(lawyerId: string) {
      const processes = this.db.processes.filter(p => p.lawyer_id === lawyerId);
      const total = processes.reduce((acc, curr) => acc + curr.value, 0);
      return {
          totalAccepted: total,
          retained: total * 0.1,
          receivableThisMonth: total * 0.9,
          activeCount: processes.filter(p => p.status !== ProcessStatus.FINISHED).length,
          finishedCount: processes.filter(p => p.status === ProcessStatus.FINISHED).length,
          totalCount: processes.length
      };
  }

  private addTimelineEvent(processId: string, eventData: Partial<TimelineEvent>) {
      if (!this.db.processTimelines[processId]) {
          this.db.processTimelines[processId] = [];
      }
      this.db.processTimelines[processId].unshift({
          id: `evt_${Date.now()}`,
          processId,
          date: new Date().toISOString(),
          title: eventData.title || 'Evento',
          description: eventData.description || '',
          authorRole: eventData.authorRole || 'SYSTEM',
          authorName: eventData.authorName || 'Sistema',
          type: eventData.type || 'MESSAGE',
          ...eventData
      });
  }
}

export const mockServerInstance = new MockServer();
