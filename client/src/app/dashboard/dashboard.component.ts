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
  
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Escutar atualizações de status das mensagens para atualizar contadores
    const messageStatusSubscription = this.notificationService.messageStatusUpdate$.subscribe(
      (update) => {
        if (update) {
          this.updateStatsCounters(update.status);
        }
      }
    );
    this.subscriptions.push(messageStatusSubscription);

    // Escutar quando uma nova mensagem é criada
    const messageCreatedSubscription = this.notificationService.messageCreated$.subscribe(
      (newMessage) => {
        if (newMessage) {
          this.updateStatsCounters(newMessage.status);
        }
      }
    );
    this.subscriptions.push(messageCreatedSubscription);

    // Carregar dados iniciais
    this.loadInitialData();
    this.loadStatsFromLocalStorage();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }


  private loadInitialData(): void {
    // Carregar estatísticas de mensagens existentes do localStorage
    this.calculateStatsFromSentNotifications();
  }

  private loadStatsFromLocalStorage(): void {
    const saved = localStorage.getItem('dashboardStats');
    if (saved) {
      this.stats = JSON.parse(saved);
    }
  }

  private calculateStatsFromSentNotifications(): void {
    const saved = localStorage.getItem('sentNotifications');
    if (saved) {
      const sentNotifications = JSON.parse(saved);
      
      // Resetar contadores
      this.stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
      
      // Contar por status atual
      sentNotifications.forEach((notification: any) => {
        this.updateStatsCounters(notification.status);
      });
      
      this.saveStats();
    }
  }

  private updateStatsCounters(status: string): void {
    switch (status) {
      case 'ENVIADO':
        // Quando uma mensagem é enviada, ela entra como "pending"
        this.stats.pending++;
        break;
      case 'PROCESSANDO':
        // Move de pending para processing
        if (this.stats.pending > 0) {
          this.stats.pending--;
        }
        this.stats.processing++;
        break;
      case 'PROCESSADO_SUCESSO':
        // Move de processing para completed
        if (this.stats.processing > 0) {
          this.stats.processing--;
        }
        this.stats.completed++;
        break;
      case 'FALHA_PROCESSAMENTO':
        // Move de processing para failed
        if (this.stats.processing > 0) {
          this.stats.processing--;
        }
        this.stats.failed++;
        break;
    }
    
    this.saveStats();
  }

  private saveStats(): void {
    localStorage.setItem('dashboardStats', JSON.stringify(this.stats));
  }
}