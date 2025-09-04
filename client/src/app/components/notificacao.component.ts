import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { 
  NotificationService, 
  NotificationRequest,
  StatusResponse 
} from '../services/notification.service';

@Component({
  selector: 'app-notificacao',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h3 class="text-lg font-medium text-gray-900 mb-4">
        Enviar Nova Notificação
      </h3>
      
      <form [formGroup]="notificationForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- ID da mensagem (somente leitura) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            ID da Mensagem (Gerado Automaticamente)
          </label>
          <input
            type="text"
            [value]="currentMessageId"
            readonly
            class="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
          />
        </div>

        <div>
          <label for="conteudoMensagem" class="block text-sm font-medium text-gray-700 mb-1">
            Conteúdo da Mensagem
          </label>
          <textarea
            id="conteudoMensagem"
            formControlName="conteudoMensagem"
            rows="4"
            placeholder="Digite o conteúdo da sua notificação aqui..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            [class.border-red-500]="notificationForm.get('conteudoMensagem')?.invalid && notificationForm.get('conteudoMensagem')?.touched"
          ></textarea>
          <div *ngIf="notificationForm.get('conteudoMensagem')?.invalid && notificationForm.get('conteudoMensagem')?.touched" 
               class="mt-1 text-sm text-red-600">
            O conteúdo da mensagem é obrigatório
          </div>
        </div>

        <div>
          <button
            type="submit"
            [disabled]="notificationForm.invalid || isSubmitting"
            class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span *ngIf="!isSubmitting">Enviar Notificação</span>
            <span *ngIf="isSubmitting">Enviando...</span>
          </button>
        </div>
      </form>

      <!-- Mensagem de sucesso/erro -->
      <div *ngIf="message" class="mt-6">
        <div [class]="messageClass" class="p-4 rounded-md">
          {{message}}
        </div>
      </div>
    </div>

    <!-- Lista de notificações enviadas -->
    <div class="bg-white shadow rounded-lg">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">
          Notificações Enviadas
        </h3>
      </div>
      
      <ul class="divide-y divide-gray-200">
        <li *ngIf="sentNotifications.length === 0" class="px-6 py-4 text-gray-500 text-center">
          Nenhuma notificação enviada ainda
        </li>
        
        <li *ngFor="let notification of sentNotifications" class="px-6 py-4">
          <div class="space-y-3">
            <!-- Cabeçalho com status atual -->
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-gray-900">
                ID: {{notification.mensagemId}}
              </div>
              <span [class]="getStatusClass(notification.status)" class="px-2 py-1 text-xs font-medium rounded-full">
                {{getStatusText(notification.status)}}
              </span>
            </div>
            
            <!-- Conteúdo da mensagem -->
            <div class="bg-gray-50 p-3 rounded-md">
              <div class="text-sm text-gray-700">
                <strong>Conteúdo:</strong> {{notification.conteudoMensagem}}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                <strong>ID da Mensagem:</strong> {{notification.mensagemId}}
              </div>
            </div>
            
            <!-- Histórico de status -->
            <div class="border-t pt-2">
              <div class="text-xs font-medium text-gray-700 mb-2">Histórico de Status:</div>
              <div class="space-y-1">
                <div *ngFor="let statusEntry of notification.statusHistory" class="flex items-center justify-between text-xs">
                  <span class="text-gray-600">{{getStatusText(statusEntry.status)}}</span>
                  <span class="text-gray-500">{{formatDate(statusEntry.timestamp)}}</span>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
      
      <div class="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <button
          (click)="refreshStatus()"
          [disabled]="isRefreshing"
          class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          <span *ngIf="!isRefreshing">Atualizar Status</span>
          <span *ngIf="isRefreshing">Atualizando...</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .loading {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class NotificacaoComponent implements OnInit, OnDestroy {
  notificationForm: FormGroup;
  currentMessageId: string = '';
  sentNotifications: Array<{
    mensagemId: string; 
    conteudoMensagem: string; 
    status: string;
    statusHistory: Array<{status: string; timestamp: Date}>
  }> = [];
  
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
      (update) => {
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