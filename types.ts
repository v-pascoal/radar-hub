
export enum UserRole {
  CLIENT = 'CLIENT',
  LAWYER = 'LAWYER',
  GUEST = 'GUEST'
}

export enum ProcessStatus {
  AWAITING_LAWYERS = 'AWAITING_LAWYERS',
  AWAITING_SELECTION = 'AWAITING_SELECTION',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  STARTED = 'STARTED',
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
  created_at: string;
  updated_at?: string;
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
  oab?: string;
  specialty?: string;
}
