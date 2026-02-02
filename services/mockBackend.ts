
import { ProcessRequest, ProcessStatus, User, UserRole, FineDetail } from '../types';

// Interfaces de Banco de Dados Simulado
interface DB {
  users: User[];
  processes: ProcessRequest[];
  historyDetails: Record<string, any>; // Detalhes estendidos para o histórico
}

// Dados Iniciais do "Banco"
const INITIAL_DB: DB = {
  users: [
    // --- ADVOGADOS (VERIFICADOS) ---
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
      verificationStatus: 'VERIFIED'
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
      verificationStatus: 'VERIFIED'
    },
    // --- ADVOGADO (PENDENTE DE DOCS) ---
    {
      id: 'lawyer_pending',
      name: 'Dr. Novo Sem Docs',
      phone: '11977777777', // Telefone Login
      documentId: '555.666.777-88',
      role: UserRole.LAWYER,
      isLoggedIn: false,
      oab: 'MG 555.666',
      // Sem URLs de documentos
      avatar: '',
      specialty: 'Multas',
      birthDate: '20/01/1990',
      verificationStatus: 'PENDING'
    },
    
    // --- CONDUTORES (VERIFICADOS) ---
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
      verificationStatus: 'VERIFIED'
    },
    {
      id: 'client_2',
      name: 'Ana Souza',
      phone: '31977776666',
      role: UserRole.CLIENT,
      isLoggedIn: false,
      documentId: '111.222.333-44',
      documentValidity: '15/05/2025',
      documentPdfUrl: 'mock_doc_ana.pdf',
      avatar: 'https://i.pravatar.cc/150?u=client_2',
      birthDate: '10/10/1992',
      verificationStatus: 'VERIFIED'
    },
    // --- CONDUTOR (PENDENTE DE DOCS) ---
    {
      id: 'client_pending',
      name: 'Lucas Pendente',
      phone: '11966666666', // Telefone Login
      role: UserRole.CLIENT,
      isLoggedIn: false,
      documentId: '999.000.111-22',
      // Sem URL de documento
      avatar: '',
      birthDate: '05/05/1995',
      verificationStatus: 'PENDING'
    }
  ],
  processes: [
    // Processos do Roberto (client_1)
    {
        id: 'proc_active_1',
        readable_id: 'RAD-7721',
        client_id: 'client_1',
        clientName: 'Roberto Almeida',
        type: 'Suspensão',
        totalPoints: 22,
        fines: [{ id: 'f1', points: 7, documentUrl: 'url_mock', documentName: 'Multa_Velocidade.pdf' }],
        value: 490,
        deadline: '24h',
        status: ProcessStatus.AWAITING_LAWYERS,
        description: 'Multa por excesso de velocidade capturada por radar fixo em rodovia federal.',
        created_at: new Date().toISOString(),
        lastUpdateNote: 'Aguardando Advogados'
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
        description: 'Processo administrativo de cassação por suposta recusa ao teste do bafômetro.',
        lastUpdateNote: 'Deferido',
        created_at: '2023-08-10',
    },
    // Processos da Ana (client_2)
    {
        id: 'proc_ana_1',
        readable_id: 'RAD-9012',
        client_id: 'client_2',
        clientName: 'Ana Souza',
        type: 'Suspensão',
        totalPoints: 35,
        fines: [
            { id: 'fa1', points: 7, documentUrl: '#', documentName: 'Farol_Vermelho.pdf' },
            { id: 'fa2', points: 5, documentUrl: '#', documentName: 'Estacionamento.pdf' }
        ],
        value: 490,
        deadline: '10/10/2024',
        status: ProcessStatus.IN_PROGRESS,
        description: 'Acúmulo de pontos em infrações urbanas. Cliente alega que a sinalização estava encoberta.',
        lastUpdateNote: 'Em elaboração',
        lawyer_id: 'lawyer_2', // Dra. Fernanda já pegou esse
        created_at: '2023-11-15'
    }
  ],
  historyDetails: {
    'proc_hist_1': {
        finalResult: 'DEFERIDO',
        lawyerName: 'Dr. Carlos Mendes',
        finishedDate: '15/12/2023',
        timeline: [
            {
              date: '15/12/2023',
              type: 'success',
              title: 'Sentença Final - Deferido',
              description: 'O recurso foi julgado procedente pelo CETRAN. A penalidade de cassação foi cancelada.',
              docName: 'Decisao_CETRAN_Final.pdf',
              docUrl: '#'
            },
            {
              date: '20/11/2023',
              type: 'note',
              title: 'Parecer do Advogado',
              description: 'A sustentação oral foi realizada com sucesso. O relator acolheu a tese de nulidade.'
            },
            {
              date: '05/10/2023',
              type: 'document',
              title: 'Recurso 2ª Instância (CETRAN)',
              description: 'Protocolo do recurso administrativo endereçado ao Conselho Estadual.',
              docName: 'Protocolo_Recurso_2Instancia.pdf',
              docUrl: '#'
            },
            {
              date: '10/08/2023',
              type: 'status',
              title: 'Processo Iniciado',
              description: 'Advogado Dr. Carlos Mendes aceitou o caso.'
            }
        ]
    }
  }
};

export class MockBackend {
  private db: DB;
  private otpStore: Map<string, string>; // Armazena OTPs temporários: Phone -> Code

  constructor() {
    // Carrega do localStorage para persistência entre reloads ou usa inicial
    const saved = localStorage.getItem('mock_db_v5'); // Versionamento para limpar dados antigos se necessário
    this.db = saved ? JSON.parse(saved) : INITIAL_DB;
    this.otpStore = new Map();
  }

  private save() {
    localStorage.setItem('mock_db_v5', JSON.stringify(this.db));
  }

  // --- RabbitMQ Simulators ---

  private publishToExchange(exchange: string, routingKey: string, payload: any) {
    console.group(`🐰 [RabbitMQ Publisher] Exchange: ${exchange}`);
    console.log(`Routing Key: ${routingKey}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.groupEnd();
  }

  // --- Endpoints Methods ---

  async requestAuthOtp(phone: string, isLoginMode: boolean = false): Promise<string> {
      await new Promise(r => setTimeout(r, 600)); // Latência

      // VERIFICAÇÃO DE SEGURANÇA:
      // Se for modo LOGIN, o usuário TEM que existir.
      if (isLoginMode) {
          const userExists = this.db.users.some(u => u.phone === phone);
          if (!userExists) {
              throw new Error("Número não encontrado. Por favor, crie uma conta em 'Primeiro Acesso'.");
          }
      }

      // Gera código aleatório de 4 dígitos
      // const code = Math.floor(1000 + Math.random() * 9000).toString();
      const code = "1234"; // FIXO para facilitar o teste, ou poderia ser randômico
      
      this.otpStore.set(phone, code);

      // Simula envio para fila de Notificações (que dispararia o SMS real)
      this.publishToExchange(
          'notification.sms',
          'sms.otp.send',
          {
              to: phone,
              templateId: 'tpl_login_otp',
              params: { code: code },
              priority: 'high'
          }
      );

      // Retorna o código no mock APENAS para fins de desenvolvimento/demo (mostrar no alert)
      // Em prod, isso retornaria void ou success: true
      return code;
  }

  async authVerify(phone: string, code: string, role?: UserRole): Promise<User | null> {
    await new Promise(r => setTimeout(r, 800));

    // Validação do OTP
    const storedCode = this.otpStore.get(phone);
    if (code !== storedCode && code !== "1234") { // Backdoor 1234 sempre funciona pra dev
        throw new Error("Código inválido ou expirado.");
    }

    // Limpa OTP após uso
    this.otpStore.delete(phone);

    // Busca usuário pelo telefone (login unificado)
    let user = this.db.users.find(u => u.phone === phone);
    
    if (role) {
        // FLUXO DE REGISTRO (Role fornecida explicitamente)
        if (!user) {
            // Auto-register -> INICIA COMO PENDENTE
            user = {
                id: `usr_${Date.now()}`,
                phone,
                name: '', // Nome será preenchido no onboarding se for novo
                role: role,
                isLoggedIn: true,
                token: `mock_jwt_${Date.now()}`,
                verificationStatus: 'PENDING'
            };
            this.db.users.push(user);
            this.save();
        } else {
            // Usuário já existe, apenas loga e atualiza token
            // Em um app real, poderíamos bloquear registro duplicado ou mesclar roles
            user.isLoggedIn = true;
            user.token = `mock_jwt_${Date.now()}`;
        }
    } else {
        // FLUXO DE LOGIN (Sem role especificada)
        if (!user) {
            // Se não achou usuário no login simples, erro (dupla checagem)
            throw new Error("Usuário não encontrado. Crie uma conta.");
        }
        user.isLoggedIn = true;
        user.token = `mock_jwt_${Date.now()}`;
    }

    return user;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<boolean> {
      await new Promise(r => setTimeout(r, 800));
      const idx = this.db.users.findIndex(u => u.id === userId);
      
      if (idx !== -1) {
          const currentUser = this.db.users[idx];
          // Mescla dados
          const updatedUser = { ...currentUser, ...data };

          // LÓGICA DE MUDANÇA DE STATUS (Server-Side Logic Mock)
          // Se não estiver verificado, verifica se pode ir para "Em Análise"
          // O backend nunca muda para VERIFIED automaticamente aqui, apenas para UNDER_ANALYSIS.
          if (updatedUser.verificationStatus !== 'VERIFIED') {
              let readyForAnalysis = false;

              if (updatedUser.role === UserRole.CLIENT) {
                  // Cliente: Precisa de Nome, CPF, Nascimento e PDF CNH com Validade
                  if (updatedUser.name && updatedUser.documentId && updatedUser.birthDate && 
                      updatedUser.documentPdfUrl && updatedUser.documentValidity) {
                      readyForAnalysis = true;
                  }
              } else {
                  // Advogado: Precisa de Nome, CPF, Nascimento, OAB, PDF CNH e PDF OAB com validades
                  if (updatedUser.name && updatedUser.documentId && updatedUser.birthDate && updatedUser.oab &&
                      updatedUser.documentPdfUrl && updatedUser.documentValidity &&
                      updatedUser.oabPdfUrl && updatedUser.oabValidity) {
                      readyForAnalysis = true;
                  }
              }

              if (readyForAnalysis) {
                  updatedUser.verificationStatus = 'UNDER_ANALYSIS';
              } else {
                  // Se removeu algum doc, volta pra pendente (opcional, mas seguro)
                  updatedUser.verificationStatus = 'PENDING';
              }
          }

          this.db.users[idx] = updatedUser;
          this.save();
          return true;
      }
      return false;
  }

  async getMyProcesses(userId: string, role: UserRole): Promise<ProcessRequest[]> {
    await new Promise(r => setTimeout(r, 500));
    
    if (role === UserRole.CLIENT) {
        return this.db.processes.filter(p => p.client_id === userId);
    } else {
        // Advogado vê processos que ele aceitou
        return this.db.processes.filter(p => p.lawyer_id === userId);
    }
  }

  async getWalletStats(userId: string) {
      await new Promise(r => setTimeout(r, 600));
      
      const processes = this.db.processes.filter(p => p.lawyer_id === userId);
      const totalCount = processes.length;
      const finishedCount = processes.filter(p => p.status === ProcessStatus.FINISHED).length;
      const activeCount = totalCount - finishedCount;
      
      const totalAccepted = processes.reduce((sum, p) => sum + p.value, 0);
      
      // Regra de negócio mock: 10% retido pela plataforma, 90% repassado
      const platformFee = totalAccepted * 0.10; 
      const receivable = totalAccepted - platformFee;

      // Para advogados novos (sem processos), retornar zeros
      return {
        totalAccepted,
        retained: platformFee, 
        receivableThisMonth: receivable, // Simplificação: todo o valor disponível
        activeCount,
        finishedCount,
        totalCount
      };
  }

  // --- MOCK DICAS PARA ADVOGADOS ---
  async getLawyerTips(userId: string): Promise<{ title: string; description: string; type: 'urgent' | 'info' | 'success' }[]> {
      await new Promise(r => setTimeout(r, 400));
      return [
          {
              title: "Agilidade na Avaliação",
              description: "Aceite e avalie os casos disponíveis rapidamente. Os primeiros a aceitar têm 80% mais chance de fechar o contrato.",
              type: 'urgent'
          },
          {
              title: "Protocolo Expresso",
              description: "Protocole o pedido do cliente nas primeiras 48 horas. Isso libera a primeira parcela dos seus honorários imediatamente.",
              type: 'info'
          },
          {
              title: "Comunicação Proativa",
              description: "Atualize o status a cada movimentação. Clientes informados avaliam melhor o serviço final.",
              type: 'success'
          }
      ];
  }

  async getHistoryDetail(processId: string) {
    await new Promise(r => setTimeout(r, 600));
    const process = this.db.processes.find(p => p.id === processId);
    const details = this.db.historyDetails[processId];
    
    if (process && details) {
        return { ...process, ...details };
    }
    return null;
  }

  async getOpportunities(): Promise<ProcessRequest[]> {
    await new Promise(r => setTimeout(r, 500));
    // Retorna processos sem advogado
    return this.db.processes.filter(p => p.status === ProcessStatus.AWAITING_LAWYERS);
  }

  async submitProcess(processData: any): Promise<{ success: boolean, id: string }> {
    await new Promise(r => setTimeout(r, 1200));

    const newId = `proc_${Date.now()}`;
    const newProcess: ProcessRequest = {
        id: newId,
        readable_id: `RAD-${Math.floor(1000 + Math.random() * 9000)}`,
        client_id: processData.client_id,
        clientName: processData.clientName || 'Novo Cliente',
        type: processData.type,
        totalPoints: processData.totalPoints,
        fines: processData.fines,
        value: processData.value,
        deadline: 'Análise Pendente',
        status: ProcessStatus.AWAITING_LAWYERS,
        description: processData.description,
        lastUpdateNote: 'Aguardando Advogados',
        created_at: new Date().toISOString()
    };

    this.db.processes.unshift(newProcess);
    this.save();

    // Simula envio para fila de ingestão de processos
    this.publishToExchange(
        'defense.submission', 
        'submission.created', 
        { 
            messageId: `msg_${Date.now()}`,
            timestamp: new Date().toISOString(),
            source: 'web_client_portal',
            data: newProcess 
        }
    );

    return { success: true, id: newId };
  }

  async updateProcessStatus(id: string, updateData: any) {
    await new Promise(r => setTimeout(r, 1000));
    
    const index = this.db.processes.findIndex(p => p.id === id);
    if (index !== -1) {
        this.db.processes[index] = { ...this.db.processes[index], ...updateData };
        this.save();

        // Simula evento de atualização de status para notificação
        this.publishToExchange(
            'process.events',
            'status.updated',
            {
                processId: id,
                clientId: this.db.processes[index].client_id,
                newStatus: updateData.status,
                note: updateData.lastUpdateNote,
                timestamp: new Date().toISOString()
            }
        );
        return true;
    }
    return false;
  }

  async acceptOpportunity(processId: string, lawyerId: string) {
      return this.updateProcessStatus(processId, {
          status: ProcessStatus.AWAITING_PAYMENT,
          lastUpdateNote: 'Aguardando Pagamento',
          lawyer_id: lawyerId
      });
  }
}

export const mockBackendInstance = new MockBackend();
