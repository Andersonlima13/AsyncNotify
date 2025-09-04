import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface NotificationRequest {
  mensagemId: string;
  conteudoMensagem: string;
}

export interface NotificationResponse {
  mensagemId: string;
  status: string;
  mensagem: string;
}

export interface StatusResponse {
  sucesso: boolean;
  mensagemId?: string;
  status?: string;
  mensagens?: Array<{mensagemId: string; status: string}>;
}

export interface QueueStats {
  success: boolean;
  stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = '/api';
  private websocket?: WebSocket;
  private statsSubject = new BehaviorSubject<QueueStats['stats']>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });

  private messageStatusSubject = new BehaviorSubject<{
    mensagemId: string;
    status: string;
    timestamp: string;
  } | null>(null);

  public stats$ = this.statsSubject.asObservable();
  public messageStatusUpdate$ = this.messageStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.connectWebSocket();
  }

  // Enviar notificação
  sendNotification(notification: NotificationRequest): Observable<NotificationResponse> {
    return this.http.post<NotificationResponse>(`${this.baseUrl}/notificar`, notification);
  }

  // Consultar status de uma mensagem específica
  getMessageStatus(mensagemId: string): Observable<StatusResponse> {
    return this.http.get<StatusResponse>(`${this.baseUrl}/status/${mensagemId}`);
  }

  // Consultar status de todas as mensagens
  getAllMessageStatus(): Observable<StatusResponse> {
    return this.http.get<StatusResponse>(`${this.baseUrl}/status`);
  }

  // Obter estatísticas da fila
  getQueueStats(): Observable<QueueStats> {
    return this.http.get<QueueStats>(`${this.baseUrl}/queue/stats`);
  }

  // Conectar WebSocket para atualizações em tempo real
  private connectWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.websocket = new WebSocket(wsUrl);
    
    this.websocket.onopen = () => {
      console.log('WebSocket conectado');
    };
    
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'queue-stats') {
          this.statsSubject.next(data.stats);
        } else if (data.type === 'message-status-update') {
          // Emitir evento para componentes escutarem atualizações de status
          this.messageStatusSubject.next({
            mensagemId: data.mensagemId,
            status: data.status,
            timestamp: data.timestamp
          });
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    };
    
    this.websocket.onclose = () => {
      console.log('WebSocket desconectado - tentando reconectar em 3 segundos');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
    
    this.websocket.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
    };
  }

  ngOnDestroy(): void {
    if (this.websocket) {
      this.websocket.close();
    }
  }
}