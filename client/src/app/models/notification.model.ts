export interface NotificationRequest {
  mensagemId: string;
  conteudoMensagem: string;
}

export interface NotificationResponse {
  mensagemId: string;
  status: string;
  mensagem?: string;
}

export interface StatusResponse {
  sucesso: boolean;
  mensagens?: Array<{
    mensagemId: string;
    status: string;
  }>;
}

export interface StatusHistoryEntry {
  status: string;
  timestamp: Date;
}

export interface SentNotification {
  mensagemId: string;
  conteudoMensagem: string;
  status: string;
  statusHistory: StatusHistoryEntry[];
}

export interface DashboardStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface MessageUpdate {
  mensagemId: string;
  status: string;
}