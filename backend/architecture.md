
# Radar Hub - Arquitetura Backend (.NET + RabbitMQ)

Este documento detalha a arquitetura de microsserviços, o modelo de eventos e a referência completa da API REST.

## 1. Visão Geral dos Serviços

| Serviço | Responsabilidade | Schemas de Banco | Tecnologia |
| :--- | :--- | :--- | :--- |
| **RadarHub.API** | Gateway HTTP, Auth, Consultas e Uploads. | `public`, `processes` (R), `documents` (R) | .NET 8 Web API |
| **RadarHub.DocumentWorker** | OCR, Validação de Arquivos, Antivírus. | `documents`, `public` | .NET 8 Worker |
| **RadarHub.ProcessWorker** | Máquina de estados, Matching, Financeiro. | `processes`, `public` | .NET 8 Worker |

---

## 2. Event-Driven Architecture (RabbitMQ)

**Exchange Principal:** `ex.radar` (Topic)

### A. Documentos (OCR & Validação)
| Routing Key | Trigger | Ação do Worker |
| :--- | :--- | :--- |
| `doc.identity.user.uploaded` | Upload CNH/OAB | OCR de Identidade. Atualiza status do usuário (`VERIFIED`/`REJECTED`). |
| `doc.process.fine.uploaded` | Upload Multa | OCR de Multa. Extrai data/local/infração. Valida dados do processo. |
| `doc.process.legal.uploaded` | Upload Petição | Scan Antivírus. Indexação para busca. Anexa à Timeline. |

### B. Processos (Fluxo Jurídico)
| Routing Key | Trigger | Ação do Worker |
| :--- | :--- | :--- |
| `process.created` | Cliente cria pedido | Calcula fees. Notifica advogados (Push/Email). |
| `process.lawyer.accepted` | Advogado aceita | Bloqueia concorrência. Gera cobrança (Pix/Boleto). |
| `process.status.updated` | Mudança de etapa | Registra Timeline. Se "Protocolado", libera % do honorário. |

---

## 3. API Reference (REST)

**Base URL:** `https://api.radarhub.com.br/v1`

**Standard Response:**
```json
{
  "success": true,
  "data": { ... },
  "error": null,   // String message if success=false
  "status": 200    // HTTP Status Code
}
```

**Common Headers:**
*   `Authorization`: `Bearer <JWT_TOKEN>` (Obrigatório para rotas protegidas)
*   `Content-Type`: `application/json`

### 3.1. Autenticação & Onboarding

#### **Solicitar Código (OTP)**
Envia um código de 4 dígitos via SMS/WhatsApp.
*   **POST** `/auth/otp/request`
*   **Body:**
    ```json
    {
      "phone": "11999999999",
      "isLoginMode": true // true=Verifica se existe, false=Permite novo
    }
    ```
*   **Response:** `200 OK` (payload vazio ou messageId do SMS)

#### **Verificar Código & Registro**
Troca o código pelo Token JWT. Se for o primeiro acesso, registra os dados básicos.
*   **POST** `/auth/otp/verify`
*   **Body:**
    ```json
    {
      "phone": "11999999999",
      "code": "1234",
      "role": "CLIENT", // Opcional (apenas registro)
      "userData": {     // Opcional (apenas registro)
         "name": "João Silva",
         "documentId": "123.456.789-00",
         "birthDate": "01/01/1980",
         "oab": "SP 123456" // Se lawyer
      }
    }
    ```
*   **Response:** `200 OK`
    ```json
    {
      "token": "jwt.header.payload",
      "user": { "id": "uuid", "name": "...", "role": "CLIENT", "verificationStatus": "PENDING" }
    }
    ```

### 3.2. Usuários & Perfil

#### **Obter Perfil**
*   **GET** `/users/me`
*   **Response:** `200 OK` (Objeto User completo)

#### **Atualizar Perfil**
Atualiza dados cadastrais. Se alterar documentos sensíveis, reseta o status de verificação.
*   **PUT** `/users/me`
*   **Body:**
    ```json
    {
      "name": "Novo Nome",
      "email": "novo@email.com",
      "avatar": "base64_string"
    }
    ```

### 3.3. Documentos (Upload)

Esta rota é polimórfica. O comportamento depende da `category` e `contextId`.

#### **Upload de Arquivo**
*   **POST** `/documents/upload`
*   **Headers:** `Content-Type: multipart/form-data`
*   **Form Data:**
    *   `file`: (Binary File)
    *   `category`: `IDENTITY_CNH` | `IDENTITY_OAB` | `PROCESS_FINE_NOTICE` | `PROCESS_LEGAL_PETITION`
    *   `contextId`: `uuid` (Opcional - ID do Processo ou da Multa pai)
*   **Response:** `202 Accepted`
    ```json
    {
      "fileId": "uuid-do-arquivo",
      "status": "PENDING_ANALYSIS",
      "message": "Arquivo na fila de processamento."
    }
    ```
    *Nota: A API dispara o evento RabbitMQ correspondente à categoria.*

### 3.4. Operações do Cliente

#### **Criar Solicitação de Defesa**
*   **POST** `/client/processes`
*   **Body:**
    ```json
    {
      "type": "Suspensão",
      "description": "Fui multado na rodovia...",
      "fines": [
         { 
           "points": 7, 
           "infractionCode": "745-5", 
           "documentFileId": "uuid-from-upload" // ID retornado pelo upload anterior
         }
      ]
    }
    ```
*   **Response:** `201 Created`
    ```json
    { "processId": "uuid", "readableId": "RAD-1234", "estimatedValue": 490.00 }
    ```

#### **Listar Processos**
*   **GET** `/client/processes`
*   **Response:** `200 OK` (Lista de processos ativos e pendentes)

#### **Detalhes do Histórico**
Retorna timeline completa de processos finalizados.
*   **GET** `/client/processes/{id}/history`
*   **Response:** `200 OK` (Objeto Processo + Array de TimelineEvents)

### 3.5. Operações do Advogado

#### **Listar Oportunidades**
Processos esperando advogado (`AWAITING_LAWYERS`).
*   **GET** `/lawyer/opportunities`
*   **Response:** `200 OK` (Lista de processos disponíveis para aceite)

#### **Aceitar Processo**
Vincula o advogado ao processo.
*   **POST** `/lawyer/processes/{id}/accept`
*   **Body:** `{}` (Vazio)
*   **Response:** `200 OK`

#### **Listar Meus Processos**
*   **GET** `/lawyer/processes`
*   **Response:** `200 OK` (Lista de processos vinculados ao advogado)

#### **Atualizar Status & Protocolo**
Avança o workflow do processo e anexa evidências/petições.
*   **PUT** `/lawyer/processes/{id}/status`
*   **Headers:** `Content-Type: multipart/form-data` (Se houver arquivos) ou `application/json`
*   **Form Data / Body:**
    *   `status`: `PROTOCOLADO` | `FINALIZADO` | `EM_ANDAMENTO`
    *   `note`: "Protocolo realizado sob nº 12345"
    *   `files`: (Array de binários - Opcional)
*   **Response:** `200 OK`

#### **Carteira & Financeiro**
*   **GET** `/lawyer/wallet/stats`
*   **Response:** `200 OK`
    ```json
    {
      "totalAccepted": 1500.00,
      "retained": 500.00,
      "receivable": 1000.00,
      "activeCount": 2
    }
    ```
