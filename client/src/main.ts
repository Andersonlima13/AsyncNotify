// Sistema de Notificações - Frontend Vanilla TypeScript
import { v4 as uuidv4 } from 'uuid';

interface NotificationRequest {
  mensagemId: string;
  conteudoMensagem: string;
}

interface NotificationResponse {
  mensagemId: string;
  status: string;
  mensagem: string;
}

interface StatusResponse {
  sucesso: boolean;
  mensagemId?: string;
  status?: string;
  mensagens?: Array<{mensagemId: string; status: string}>;
}

interface QueueStats {
  success: boolean;
  stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

class NotificationSystem {
  private websocket?: WebSocket;
  private stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
  private messages: Array<{mensagemId: string; status: string}> = [];

  constructor() {
    this.initializeApp();
    this.connectWebSocket();
    this.loadInitialData();
  }

  private initializeApp(): void {
    document.body.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <header class="bg-white shadow-sm border-b">
          <div class="max-w-7xl mx-auto px-4">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <h1 class="text-xl font-semibold text-gray-900">
                  Sistema de Notificações
                </h1>
              </div>
            </div>
          </div>
        </header>
        
        <main class="max-w-7xl mx-auto py-6 px-4">
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
                <div class="text-2xl font-bold text-blue-600" id="pending-count">0</div>
                <div class="text-sm text-blue-800">Pendentes</div>
              </div>
              <div class="bg-yellow-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-yellow-600" id="processing-count">0</div>
                <div class="text-sm text-yellow-800">Processando</div>
              </div>
              <div class="bg-green-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-green-600" id="completed-count">0</div>
                <div class="text-sm text-green-800">Concluídas</div>
              </div>
              <div class="bg-red-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-red-600" id="failed-count">0</div>
                <div class="text-sm text-red-800">Falharam</div>
              </div>
            </div>

            <!-- Formulário de notificação -->
            <div class="bg-white shadow rounded-lg p-6 mb-8">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                Enviar Nova Notificação
              </h3>
              
              <form id="notification-form" class="space-y-4">
                <div>
                  <label for="mensagemId" class="block text-sm font-medium text-gray-700 mb-1">
                    ID da Mensagem (UUID)
                  </label>
                  <input
                    type="text"
                    id="mensagemId"
                    name="mensagemId"
                    placeholder="550e8400-e29b-41d4-a716-446655440000"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <div id="mensagemId-error" class="mt-1 text-sm text-red-600" style="display: none;"></div>
                </div>

                <div>
                  <label for="conteudoMensagem" class="block text-sm font-medium text-gray-700 mb-1">
                    Conteúdo da Mensagem
                  </label>
                  <textarea
                    id="conteudoMensagem"
                    name="conteudoMensagem"
                    rows="4"
                    placeholder="Digite o conteúdo da sua notificação aqui..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  ></textarea>
                  <div id="conteudoMensagem-error" class="mt-1 text-sm text-red-600" style="display: none;"></div>
                </div>

                <div class="flex justify-between items-center">
                  <button
                    type="submit"
                    id="submit-btn"
                    class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Enviar Notificação
                  </button>
                  
                  <button
                    type="button"
                    id="generate-uuid-btn"
                    class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Gerar UUID
                  </button>
                </div>
              </form>
            </div>

            <!-- Mensagens de sucesso/erro -->
            <div id="message-container" style="display: none;" class="mb-6">
              <div id="message" class="p-4 rounded-md"></div>
            </div>

            <!-- Lista de mensagens enviadas -->
            <div class="bg-white shadow rounded-lg">
              <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">
                  Status das Mensagens
                </h3>
              </div>
              
              <div id="messages-list" class="divide-y divide-gray-200">
                <div class="px-6 py-4 text-gray-500 text-center">
                  Nenhuma mensagem enviada ainda
                </div>
              </div>
              
              <div class="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <button
                  id="refresh-btn"
                  class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  Atualizar Status
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    this.setupEventListeners();
    this.generateUUID();
  }

  private setupEventListeners(): void {
    const form = document.getElementById('notification-form') as HTMLFormElement;
    const generateBtn = document.getElementById('generate-uuid-btn') as HTMLButtonElement;
    const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    generateBtn.addEventListener('click', () => {
      this.generateUUID();
    });

    refreshBtn.addEventListener('click', () => {
      this.refreshStatus();
    });
  }

  private async handleSubmit(): Promise<void> {
    const form = document.getElementById('notification-form') as HTMLFormElement;
    const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    const formData = new FormData(form);
    
    const notification: NotificationRequest = {
      mensagemId: formData.get('mensagemId') as string,
      conteudoMensagem: formData.get('conteudoMensagem') as string
    };

    // Validação básica
    if (!this.validateUUID(notification.mensagemId)) {
      this.showError('mensagemId', 'Por favor, insira um UUID válido');
      return;
    }

    if (!notification.conteudoMensagem.trim()) {
      this.showError('conteudoMensagem', 'O conteúdo da mensagem é obrigatório');
      return;
    }

    this.clearErrors();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      const response = await fetch('/api/notificar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      const result: NotificationResponse = await response.json();

      if (response.ok) {
        this.showMessage(`Notificação enviada com sucesso! ID: ${result.mensagemId}`, 'success');
        this.generateUUID();
        (document.getElementById('conteudoMensagem') as HTMLTextAreaElement).value = '';
        this.refreshStatus();
      } else {
        const errorData = result as any;
        this.showMessage(errorData.erro || 'Erro ao enviar notificação', 'error');
      }
    } catch (error) {
      this.showMessage('Erro de conexão ao enviar notificação', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Notificação';
    }
  }

  private generateUUID(): void {
    const uuid = uuidv4();
    (document.getElementById('mensagemId') as HTMLInputElement).value = uuid;
  }

  private validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private showError(field: string, message: string): void {
    const errorElement = document.getElementById(`${field}-error`);
    const inputElement = document.getElementById(field);
    
    if (errorElement && inputElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
      inputElement.classList.add('border-red-500');
    }
  }

  private clearErrors(): void {
    const errorElements = document.querySelectorAll('[id$="-error"]');
    const inputElements = document.querySelectorAll('input, textarea');
    
    errorElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    
    inputElements.forEach(el => {
      el.classList.remove('border-red-500');
    });
  }

  private showMessage(text: string, type: 'success' | 'error'): void {
    const container = document.getElementById('message-container') as HTMLElement;
    const message = document.getElementById('message') as HTMLElement;
    
    message.textContent = text;
    message.className = type === 'success' 
      ? 'p-4 rounded-md bg-green-50 border border-green-200 text-green-800'
      : 'p-4 rounded-md bg-red-50 border border-red-200 text-red-800';
    
    container.style.display = 'block';
    
    setTimeout(() => {
      container.style.display = 'none';
    }, 5000);
  }

  private async refreshStatus(): Promise<void> {
    const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Atualizando...';

    try {
      const response = await fetch('/api/status');
      const result: StatusResponse = await response.json();

      if (result.sucesso && result.mensagens) {
        this.messages = result.mensagens;
        this.updateMessagesList();
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Atualizar Status';
    }
  }

  private updateMessagesList(): void {
    const container = document.getElementById('messages-list') as HTMLElement;
    
    if (this.messages.length === 0) {
      container.innerHTML = `
        <div class="px-6 py-4 text-gray-500 text-center">
          Nenhuma mensagem enviada ainda
        </div>
      `;
      return;
    }

    container.innerHTML = this.messages.map(msg => `
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900">
              ${msg.mensagemId}
            </div>
          </div>
          <div class="ml-4">
            <span class="${this.getStatusClass(msg.status)} px-2 py-1 text-xs font-medium rounded-full">
              ${this.getStatusText(msg.status)}
            </span>
          </div>
        </div>
      </div>
    `).join('');
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case 'PROCESSADO_SUCESSO':
        return 'bg-green-100 text-green-800';
      case 'FALHA_PROCESSAMENTO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'PROCESSADO_SUCESSO':
        return 'Sucesso';
      case 'FALHA_PROCESSAMENTO':
        return 'Falha';
      default:
        return status;
    }
  }

  private updateStats(): void {
    document.getElementById('pending-count')!.textContent = this.stats.pending.toString();
    document.getElementById('processing-count')!.textContent = this.stats.processing.toString();
    document.getElementById('completed-count')!.textContent = this.stats.completed.toString();
    document.getElementById('failed-count')!.textContent = this.stats.failed.toString();
  }

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
          this.stats = data.stats;
          this.updateStats();
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

  private async loadInitialData(): Promise<void> {
    try {
      // Carregar estatísticas iniciais
      const statsResponse = await fetch('/api/queue/stats');
      const statsResult: QueueStats = await statsResponse.json();
      
      if (statsResult.success) {
        this.stats = statsResult.stats;
        this.updateStats();
      }

      // Carregar mensagens existentes
      this.refreshStatus();
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new NotificationSystem();
});