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
        <div>
          <label for="mensagemId" class="block text-sm font-medium text-gray-700 mb-1">
            ID da Mensagem (UUID)
          </label>
          <input
            type="text"
            id="mensagemId"
            formControlName="mensagemId"
            placeholder="550e8400-e29b-41d4-a716-446655440000"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            [class.border-red-500]="notificationForm.get('mensagemId')?.invalid && notificationForm.get('mensagemId')?.touched"
          />
          <div *ngIf="notificationForm.get('mensagemId')?.invalid && notificationForm.get('mensagemId')?.touched" 
               class="mt-1 text-sm text-red-600">
            Por favor, insira um UUID válido
          </div>
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

        <div class="flex justify-between items-center">
          <button
            type="submit"
            [disabled]="notificationForm.invalid || isSubmitting"
            class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span *ngIf="!isSubmitting">Enviar Notificação</span>
            <span *ngIf="isSubmitting">Enviando...</span>
          </button>
          
          <button
            type="button"
            (click)="generateUUID()"
            class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Gerar UUID
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
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900">
                {{notification.mensagemId}}
              </div>
              <div class="text-sm text-gray-500 mt-1">
                {{notification.conteudoMensagem}}
              </div>
            </div>
            <div class="ml-4">
              <span [class]="getStatusClass(notification.status)" class="px-2 py-1 text-xs font-medium rounded-full">
                {{getStatusText(notification.status)}}
              </span>
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
  sentNotifications: Array<{mensagemId: string; conteudoMensagem: string; status: string}> = [];
  
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
      mensagemId: ['', [Validators.required, this.uuidValidator]],
      conteudoMensagem: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit(): void {
    this.generateUUID();
    this.loadSentNotifications();
  }

  generateUUID(): void {
    const uuid = uuidv4();
    this.notificationForm.patchValue({ mensagemId: uuid });
  }

  private loadSentNotifications(): void {
    // Carregar notificações do localStorage se existirem
    const saved = localStorage.getItem('sentNotifications');
    if (saved) {
      this.sentNotifications = JSON.parse(saved);
      this.refreshStatus();
    }
  }

  private uuidValidator(control: any) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(control.value) ? null : { invalidUuid: true };
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onSubmit(): void {
    if (this.notificationForm.valid) {
      this.isSubmitting = true;
      this.message = '';
      
      const notification: NotificationRequest = this.notificationForm.value;
      
      const submitSubscription = this.notificationService.sendNotification(notification).subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          this.showMessage(`Notificação enviada com sucesso! ID: ${response.mensagemId}`, 'success');
          
          // Adicionar notificação à lista local
          this.sentNotifications.unshift({
            mensagemId: notification.mensagemId,
            conteudoMensagem: notification.conteudoMensagem,
            status: 'ENVIADO'
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

  generateUUID(): void {
    const uuid = uuidv4();
    this.notificationForm.patchValue({ mensagemId: uuid });
  }

  refreshStatus(): void {
    this.isRefreshing = true;
    
    const refreshSubscription = this.notificationService.getAllMessageStatus().subscribe({
      next: (response: any) => {
        this.isRefreshing = false;
        if (response.sucesso && response.mensagens) {
          // Atualizar status das notificações existentes
          this.sentNotifications.forEach(notification => {
            const statusUpdate = response.mensagens?.find(m => m.mensagemId === notification.mensagemId);
            if (statusUpdate) {
              notification.status = statusUpdate.status;
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
    localStorage.setItem('sentNotifications', JSON.stringify(this.sentNotifications));
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
    localStorage.setItem('sentNotifications', JSON.stringify(this.sentNotifications));
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

  private uuidValidator(control: any) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(control.value) ? null : { invalidUuid: true };
  }
}