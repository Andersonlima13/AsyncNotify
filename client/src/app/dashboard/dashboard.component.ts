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
    // Escutar atualizações de estatísticas em tempo real
    const statsSubscription = this.notificationService.stats$.subscribe(
      (stats: any) => this.stats = stats
    );
    this.subscriptions.push(statsSubscription);

    // Carregar dados iniciais
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }


  private loadInitialData(): void {
    // Carregar estatísticas iniciais
    const statsSubscription = this.notificationService.getQueueStats().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.stats = response.stats;
        }
      },
      error: (error: any) => console.error('Erro ao carregar estatísticas:', error)
    });
    
    this.subscriptions.push(statsSubscription);
  }
}