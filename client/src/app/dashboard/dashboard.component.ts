import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { NotificationService } from '../services/notification.service';
import { NotificacaoComponent } from '../components/notificacao.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NotificacaoComponent],
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

        <!-- Componente de Notificação -->
        <app-notificacao></app-notificacao>
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
  stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
  
  // Array para manter todas as mensagens e seus status
  private allMessages: Array<{mensagemId: string; status: string}> = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Escutar atualizações de status das mensagens
    const messageStatusSubscription = this.notificationService.messageStatusUpdate$.subscribe(
      (update) => {
        if (update) {
          this.updateMessageStatus(update.mensagemId, update.status);
        }
      }
    );
    this.subscriptions.push(messageStatusSubscription);

    // Escutar quando uma nova mensagem é criada
    const messageCreatedSubscription = this.notificationService.messageCreated$.subscribe(
      (newMessage) => {
        if (newMessage) {
          this.addNewMessage(newMessage.mensagemId, newMessage.status);
        }
      }
    );
    this.subscriptions.push(messageCreatedSubscription);

    // Carregar dados iniciais
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }


  private loadInitialData(): void {
    // Carregar array de mensagens do localStorage
    const savedMessages = localStorage.getItem('dashboardMessages');
    if (savedMessages) {
      this.allMessages = JSON.parse(savedMessages);
    } else {
      // Se não existe array de mensagens, criar baseado nas notificações enviadas
      this.initializeFromSentNotifications();
    }
    
    // Recalcular estatísticas baseado no array completo
    this.recalculateStats();
  }

  private initializeFromSentNotifications(): void {
    const saved = localStorage.getItem('sentNotifications');
    if (saved) {
      const sentNotifications = JSON.parse(saved);
      
      // Converter notificações enviadas para o formato do array de mensagens
      this.allMessages = sentNotifications.map((notification: any) => ({
        mensagemId: notification.mensagemId,
        status: notification.status
      }));
      
      this.saveMessages();
    }
  }

  private addNewMessage(mensagemId: string, status: string): void {
    // Verificar se a mensagem já existe no array
    const existingIndex = this.allMessages.findIndex(m => m.mensagemId === mensagemId);
    
    if (existingIndex === -1) {
      // Adicionar nova mensagem
      this.allMessages.push({ mensagemId, status });
      this.saveMessages();
      this.recalculateStats();
    }
  }

  private updateMessageStatus(mensagemId: string, newStatus: string): void {
    // Encontrar e atualizar o status da mensagem no array
    const messageIndex = this.allMessages.findIndex(m => m.mensagemId === mensagemId);
    
    if (messageIndex !== -1) {
      this.allMessages[messageIndex].status = newStatus;
      this.saveMessages();
      this.recalculateStats();
    }
  }

  private recalculateStats(): void {
    // Resetar contadores
    this.stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    
    // Contar todas as mensagens por status
    this.allMessages.forEach(message => {
      switch (message.status) {
        case 'ENVIADO':
          this.stats.pending++;
          break;
        case 'PROCESSANDO':
          this.stats.processing++;
          break;
        case 'PROCESSADO_SUCESSO':
          this.stats.completed++;
          break;
        case 'FALHA_PROCESSAMENTO':
          this.stats.failed++;
          break;
      }
    });
    
    console.log('Estatísticas recalculadas:', this.stats);
    console.log('Total de mensagens:', this.allMessages.length);
  }

  private saveMessages(): void {
    localStorage.setItem('dashboardMessages', JSON.stringify(this.allMessages));
  }
}