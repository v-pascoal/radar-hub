
export enum UserRole {
  CLIENT = 'CLIENT',
  LAWYER = 'LAWYER',
  GUEST = 'GUEST'
}

export enum ProcessStatus {
  AWAITING_LAWYERS = 'AWAITING_LAWYERS',
  AWAITING_SELECTION = 'AWAITING_SELECTION',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  AWAITING_PROTOCOL = 'AWAITING_PROTOCOL',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED'
}

export interface FineDetail {
  id: string;
  points: number;
  documentUrl: string;
  documentName: string;
}

export interface ProcessRequest {
  id: string;
  readable_id: string;
  client_id: string;
  lawyer_id?: string;
  clientName: string;
  type: 'Cassação' | 'Suspensão';
  totalPoints: number;
  fines: FineDetail[];
  value: number;
  deadline: string;
  status: ProcessStatus;
  description: string;
  processNumber?: string;
  organ?: string;
  lastUpdateNote?: string;
  created_at: string;
  updated_at?: string;
}

export interface TimelineEvent {
  id: string;
  processId: string;
  date: string;
  title: string;
  description: string;
  authorRole: 'CLIENT' | 'LAWYER' | 'SYSTEM';
  authorName: string;
  type: 'MESSAGE' | 'STATUS_CHANGE' | 'DOCUMENT';
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface User {
  id?: string;
  phone: string;
  name: string;
  role: UserRole;
  isLoggedIn: boolean;
  token?: string;
  avatar?: string;
  birthDate?: string;
  documentId?: string;
  documentValidity?: string;
  documentPdfUrl?: string;
  oab?: string;
  oabValidity?: string;
  oabPdfUrl?: string;
  specialty?: string;
  verificationStatus?: 'PENDING' | 'UNDER_ANALYSIS' | 'VERIFIED' | 'REJECTED';
  createdAt?: string; // Data de criação da conta
}
