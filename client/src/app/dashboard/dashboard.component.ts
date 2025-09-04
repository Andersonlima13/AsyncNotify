import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { 
  NotificationService, 
  NotificationRequest,
  StatusResponse 
} from '../services/notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="px-4 py-6 sm:px-0">
      <div class="border-4 border-dashed border-gray-200 rounded-lg p-6">
        
        <!-- Título e descrição -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            Painel de Notificações
          </h2>
          <p class="text-gray-600">
            Envie notificações e acompanhe o processamento em tempo real
          </p>
        </div>

        <!-- Estatísticas em tempo real -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-blue-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{stats.pending}}</div>
            <div class="text-sm text-blue-800">Pendentes</div>
          </div>
          <div class="bg-yellow-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-yellow-600">{{stats.processing}}</div>
            <div class="text-sm text-yellow-800">Processando</div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{stats.completed}}</div>
            <div class="text-sm text-green-800">Concluídas</div>
          </div>
          <div class="bg-red-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-red-600">{{stats.failed}}</div>
            <div class="text-sm text-red-800">Falharam</div>
          </div>
        </div>

        <!-- Formulário de notificação -->
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
        </div>

        <!-- Mensagens de sucesso/erro -->
        <div *ngIf="message" class="mb-6">
          <div [class]="messageClass" class="p-4 rounded-md">
            {{message}}
          </div>
        </div>

        <!-- Lista de mensagens enviadas -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">
              Status das Mensagens
            </h3>
          </div>
          
          <div class="divide-y divide-gray-200">
            <div *ngIf="allMessages.length === 0" class="px-6 py-4 text-gray-500 text-center">
              Nenhuma mensagem enviada ainda
            </div>
            
            <div *ngFor="let msg of allMessages" class="px-6 py-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="text-sm font-medium text-gray-900">
                    {{msg.mensagemId}}
                  </div>
                </div>
                <div class="ml-4">
                  <span [class]="getStatusClass(msg.status)" class="px-2 py-1 text-xs font-medium rounded-full">
                    {{getStatusText(msg.status)}}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
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
export class DashboardComponent implements OnInit, OnDestroy {
  notificationForm: FormGroup;
  stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
  allMessages: Array<{mensagemId: string; status: string}> = [];
  
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
    // Escutar atualizações de estatísticas em tempo real
    const statsSubscription = this.notificationService.stats$.subscribe(
      stats => this.stats = stats
    );
    this.subscriptions.push(statsSubscription);

    // Carregar dados iniciais
    this.loadInitialData();
    this.generateUUID();
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
        next: (response) => {
          this.isSubmitting = false;
          this.showMessage(`Notificação enviada com sucesso! ID: ${response.mensagemId}`, 'success');
          this.generateUUID(); // Gerar novo UUID para próxima mensagem
          this.notificationForm.patchValue({ conteudoMensagem: '' });
          this.refreshStatus();
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error.error?.erro || 'Erro ao enviar notificação';
          this.showMessage(errorMessage, 'error');
        }
      });
      
      this.subscriptions.push(submitSubscription);
    }
  }

  generateUUID(): void {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    this.notificationForm.patchValue({ mensagemId: uuid });
  }

  refreshStatus(): void {
    this.isRefreshing = true;
    
    const refreshSubscription = this.notificationService.getAllMessageStatus().subscribe({
      next: (response) => {
        this.isRefreshing = false;
        if (response.sucesso && response.mensagens) {
          this.allMessages = response.mensagens;
        }
      },
      error: (error) => {
        this.isRefreshing = false;
        console.error('Erro ao carregar status:', error);
      }
    });
    
    this.subscriptions.push(refreshSubscription);
  }

  private loadInitialData(): void {
    // Carregar estatísticas iniciais
    const statsSubscription = this.notificationService.getQueueStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats = response.stats;
        }
      },
      error: (error) => console.error('Erro ao carregar estatísticas:', error)
    });
    
    this.subscriptions.push(statsSubscription);
    
    // Carregar mensagens existentes
    this.refreshStatus();
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
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PROCESSADO_SUCESSO':
        return 'bg-green-100 text-green-800';
      case 'FALHA_PROCESSAMENTO':
        return 'bg-red-100 text-red-800';
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
      default:
        return status;
    }
  }

  private uuidValidator(control: any) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(control.value) ? null : { invalidUuid: true };
  }
}