
-- =================================================================
-- RADAR HUB - DATABASE SCHEMA v2.1
-- Architecture: Event-Driven / Segregated Schemas
-- =================================================================

-- 1. CONFIGURAÇÕES GERAIS E EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criação dos Schemas Lógicos (Isolamento de Contexto)
CREATE SCHEMA IF NOT EXISTS processes;
CREATE SCHEMA IF NOT EXISTS documents;

-- 2. TIPOS E ENUMS GLOBAIS
CREATE TYPE public.user_role AS ENUM ('CLIENT', 'LAWYER', 'ADMIN');
CREATE TYPE public.account_status AS ENUM ('ACTIVE', 'BLOCKED', 'WAITING_DOCS', 'PENDING_VERIFICATION');

CREATE TYPE documents.doc_status AS ENUM ('PENDING_ANALYSIS', 'ANALYZING', 'VERIFIED', 'REJECTED');

-- ATUALIZADO: Categorias expandidas para cobrir todo o ciclo de vida
CREATE TYPE documents.doc_category AS ENUM (
    'IDENTITY_CNH', 
    'IDENTITY_OAB', 
    'IDENTITY_COMP_RESIDENCIA',
    'PROCESS_FINE_NOTICE', -- Notificação da Multa
    'PROCESS_LEGAL_PETITION', -- Peça Jurídica
    'PROCESS_EVIDENCE', -- Provas gerais
    'PROCESS_DECISION' -- Decisão do juiz/órgão
);

CREATE TYPE processes.proc_status AS ENUM ('DRAFT', 'CREATED', 'AWAITING_LAWYERS', 'AWAITING_PAYMENT', 'AWAITING_PROTOCOL', 'IN_PROGRESS', 'FINISHED', 'CANCELED');

-- =================================================================
-- SCHEMA: PUBLIC (RadarHub.API)
-- Contexto: Identidade, Acesso e Perfil Básico
-- =================================================================

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150),
    role public.user_role NOT NULL,
    
    -- Dados Cadastrais Mínimos
    name VARCHAR(100) NOT NULL,
    document_id VARCHAR(20) NOT NULL, -- CPF ou CNPJ
    birth_date DATE,
    oab VARCHAR(20),
    
    -- Controle de Estado
    account_status public.account_status DEFAULT 'PENDING_VERIFICATION',
    rejection_reason TEXT,
    
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================
-- SCHEMA: DOCUMENTS (RadarHub.DocumentWorker)
-- Contexto: Armazenamento, OCR e Validação de Arquivos
-- =================================================================

CREATE TABLE documents.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id), -- Quem fez o upload (Dono)
    
    -- Metadados do Arquivo
    storage_provider VARCHAR(50) DEFAULT 'S3', 
    storage_key TEXT NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    
    category documents.doc_category NOT NULL,
    
    -- Contexto Lógico (Para rastreabilidade rápida sem joins complexos)
    context_process_id UUID, -- Opcional: Se vinculado a um processo
    context_fine_id UUID,    -- Opcional: Se vinculado a uma multa específica
    
    -- Controle de Validação (Worker)
    validation_status documents.doc_status DEFAULT 'PENDING_ANALYSIS',
    extracted_data JSONB, -- OCR: Dados da CNH ou Dados da Multa (Data, Local, Artigo)
    validation_errors TEXT,
    
    analyzed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents.processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents.files(id),
    routing_key_used VARCHAR(100), -- Ex: doc.process.fine.uploaded
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================
-- SCHEMA: PROCESSES (RadarHub.ProcessWorker)
-- Contexto: Regra de Negócio Jurídica
-- =================================================================

CREATE TABLE processes.requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    readable_code VARCHAR(20) NOT NULL,
    
    client_id UUID NOT NULL REFERENCES public.users(id),
    lawyer_id UUID REFERENCES public.users(id),
    
    type VARCHAR(50) NOT NULL,
    status processes.proc_status DEFAULT 'DRAFT',
    
    total_points INTEGER DEFAULT 0,
    calculated_fee DECIMAL(10, 2),
    platform_fee DECIMAL(10, 2),
    lawyer_fee DECIMAL(10, 2),
    
    description TEXT,
    process_number VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Multas/Itens do Processo
CREATE TABLE processes.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES processes.requests(id) ON DELETE CASCADE,
    
    infraction_code VARCHAR(20),
    points INTEGER,
    
    -- Vínculo com o documento físico na tabela documents.files
    document_file_id UUID REFERENCES documents.files(id),
    
    description VARCHAR(255)
);

-- Timeline do Processo (Event Sourcing)
CREATE TABLE processes.timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES processes.requests(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50),
    title VARCHAR(100),
    description TEXT,
    
    author_role public.user_role,
    author_name VARCHAR(100),
    
    -- Se o evento tem anexo (Ex: Petição Inicial, Comprovante)
    attachment_file_id UUID REFERENCES documents.files(id),
    
    visible_to_client BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para Performance
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_docs_user ON documents.files(user_id);
CREATE INDEX idx_docs_context_process ON documents.files(context_process_id); -- Busca rápida de docs do processo
CREATE INDEX idx_proc_client ON processes.requests(client_id);
CREATE INDEX idx_proc_lawyer ON processes.requests(lawyer_id);
