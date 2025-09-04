import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { NotificationService } from '../services/notification.service';
import { 
  NotificationRequest, 
  StatusResponse, 
  SentNotification,
  StatusHistoryEntry,
  MessageUpdate
} from '../models/notification.model';

@Component({
  selector: 'app-notificacao',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../views/notificacao.component.html',
  styleUrls: ['../views/notificacao.component.css']
})
export class NotificacaoComponent implements OnInit, OnDestroy {
  notificationForm: FormGroup;
  currentMessageId: string = '';
  sentNotifications: SentNotification[] = [];
  
  isSubmitting = false;
  isRefreshing = false;
  message = '';
  messageClass = '';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {
    this.notificationForm = this.fb.group({
      conteudoMensagem: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit(): void {
    this.generateUUID();
    this.loadSentNotifications();
    this.setupWebSocketListeners();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  generateUUID(): void {
    this.currentMessageId = uuidv4();
  }

  onSubmit(): void {
    if (this.notificationForm.valid) {
      this.isSubmitting = true;
      this.message = '';
      
      const notification: NotificationRequest = {
        mensagemId: this.currentMessageId,
        conteudoMensagem: this.notificationForm.value.conteudoMensagem
      };
      
      const submitSubscription = this.notificationService.sendNotification(notification).subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          this.showMessage(`Notificação enviada com sucesso! ID: ${response.mensagemId}`, 'success');
          
          // Adicionar notificação à lista local
          const now = new Date();
          this.sentNotifications.unshift({
            mensagemId: this.currentMessageId,
            conteudoMensagem: notification.conteudoMensagem,
            status: 'ENVIADO',
            statusHistory: [{ status: 'ENVIADO', timestamp: now }]
          });
          
          // Notificar o serviço que uma mensagem foi criada
          this.notificationService.notifyMessageCreated(this.currentMessageId, 'ENVIADO');
          
          this.generateUUID(); // Gerar novo UUID
          this.notificationForm.patchValue({ conteudoMensagem: '' });
          this.refreshStatus();
        },
        error: (error: any) => {
          this.isSubmitting = false;
          const errorMessage = error.error?.erro || 'Erro ao enviar notificação';
          this.showMessage(errorMessage, 'error');
        }
      });
      
      this.subscriptions.push(submitSubscription);
    }
  }

  refreshStatus(): void {
    this.isRefreshing = true;
    
    const refreshSubscription = this.notificationService.getAllMessageStatus().subscribe({
      next: (response: any) => {
        this.isRefreshing = false;
        if (response.sucesso && response.mensagens) {
          // Atualizar status das notificações existentes
          this.sentNotifications.forEach(notification => {
            const statusUpdate = response.mensagens?.find((m: any) => m.mensagemId === notification.mensagemId);
            if (statusUpdate && statusUpdate.status !== notification.status) {
              // Atualizar status atual
              notification.status = statusUpdate.status;
              // Adicionar ao histórico se for um status novo
              const lastHistoryStatus = notification.statusHistory[notification.statusHistory.length - 1]?.status;
              if (lastHistoryStatus !== statusUpdate.status) {
                notification.statusHistory.push({ 
                  status: statusUpdate.status, 
                  timestamp: new Date() 
                });
              }
            }
          });
        }
      },
      error: (error: any) => {
        this.isRefreshing = false;
        console.error('Erro ao carregar status:', error);
      }
    });
    
    this.subscriptions.push(refreshSubscription);
  }

  private loadSentNotifications(): void {
    // Carregar notificações do localStorage se existirem
    const saved = localStorage.getItem('sentNotifications');
    if (saved) {
      this.sentNotifications = JSON.parse(saved);
      this.refreshStatus();
    }
  }

  private showMessage(text: string, type: 'success' | 'error'): void {
    this.message = text;
    this.messageClass = type === 'success' 
      ? 'bg-green-50 border border-green-200 text-green-800'
      : 'bg-red-50 border border-red-200 text-red-800';
    
    // Limpar mensagem após 5 segundos
    setTimeout(() => {
      this.message = '';
    }, 5000);
    
    // Salvar notificações no localStorage
    this.saveSentNotifications();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PROCESSADO_SUCESSO':
        return 'bg-green-100 text-green-800';
      case 'FALHA_PROCESSAMENTO':
        return 'bg-red-100 text-red-800';
      case 'ENVIADO':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PROCESSADO_SUCESSO':
        return 'Sucesso';
      case 'FALHA_PROCESSAMENTO':
        return 'Falha';
      case 'ENVIADO':
        return 'Enviado';
      default:
        return status;
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString('pt-BR');
  }

  private setupWebSocketListeners(): void {
    // Escutar atualizações de status via WebSocket
    const statusSubscription = this.notificationService.messageStatusUpdate$.subscribe(
      (update: MessageUpdate | null) => {
        if (update) {
          this.updateNotificationStatus(update.mensagemId, update.status);
        }
      }
    );
    this.subscriptions.push(statusSubscription);
  }

  private updateNotificationStatus(mensagemId: string, newStatus: string): void {
    const notification = this.sentNotifications.find(n => n.mensagemId === mensagemId);
    if (notification && notification.status !== newStatus) {
      // Atualizar status atual
      notification.status = newStatus;
      
      // Adicionar ao histórico se for um status novo
      const lastHistoryStatus = notification.statusHistory[notification.statusHistory.length - 1]?.status;
      if (lastHistoryStatus !== newStatus) {
        notification.statusHistory.push({ 
          status: newStatus, 
          timestamp: new Date() 
        });
      }
      
      // Salvar no localStorage
      this.saveSentNotifications();
      
      console.log(`Status atualizado via WebSocket: ${mensagemId} -> ${newStatus}`);
    }
  }

  private saveSentNotifications(): void {
    localStorage.setItem('sentNotifications', JSON.stringify(this.sentNotifications));
  }
}