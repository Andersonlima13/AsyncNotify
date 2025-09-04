import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { of, BehaviorSubject } from 'rxjs';

import { NotificacaoComponent } from './notificacao.component';
import { NotificationService } from '../services/notification.service';

// Mock do NotificationService
class MockNotificationService {
  messageStatusUpdate$ = new BehaviorSubject(null);
  messageCreated$ = new BehaviorSubject(null);
  
  sendNotification = jasmine.createSpy('sendNotification').and.returnValue(
    of({ mensagemId: 'test-id', status: 'ENVIADO' })
  );
  
  notifyMessageCreated = jasmine.createSpy('notifyMessageCreated');
  getAllMessageStatus = jasmine.createSpy('getAllMessageStatus').and.returnValue(
    of({ sucesso: true, mensagens: [] })
  );
}

describe('NotificacaoComponent', () => {
  let component: NotificacaoComponent;
  let fixture: ComponentFixture<NotificacaoComponent>;
  let mockNotificationService: MockNotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NotificacaoComponent,
        ReactiveFormsModule,
        HttpClientModule
      ],
      providers: [
        FormBuilder,
        { provide: NotificationService, useClass: MockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificacaoComponent);
    component = fixture.componentInstance;
    mockNotificationService = TestBed.inject(NotificationService) as any;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Geração do mensagemId', () => {
    it('deve iniciar sem UUID', () => {
      expect(component.currentMessageId).toBe('');
    });
    
    it('deve gerar UUID apenas no momento do envio', () => {
      const conteudoMensagem = 'Teste de mensagem';
      
      // Verificar que não há UUID inicialmente
      expect(component.currentMessageId).toBe('');
      
      // Preencher o formulário
      component.notificationForm.patchValue({
        conteudoMensagem: conteudoMensagem
      });

      // Executar o submit
      component.onSubmit();

      // Verificar se o UUID foi gerado durante o envio
      expect(component.currentMessageId).toBeTruthy();
      expect(component.currentMessageId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('Envio da requisição POST', () => {
    it('deve enviar uma requisição POST para /api/notificar com os dados corretos', () => {
      const conteudoMensagem = 'Teste de mensagem';
      
      // Preencher o formulário
      component.notificationForm.patchValue({
        conteudoMensagem: conteudoMensagem
      });

      // Executar o submit
      component.onSubmit();

      // Verificar se o UUID foi gerado e se o serviço foi chamado
      expect(component.currentMessageId).toBeTruthy();
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
        mensagemId: component.currentMessageId,
        conteudoMensagem: conteudoMensagem
      });
    });

    it('deve marcar como submitting durante o envio da requisição', async () => {
      const conteudoMensagem = 'Teste de mensagem';
      
      component.notificationForm.patchValue({
        conteudoMensagem: conteudoMensagem
      });

      expect(component.isSubmitting).toBe(false);
      
      component.onSubmit();
      
      expect(component.isSubmitting).toBe(true);

      // Aguardar a resolução do observable
      await fixture.whenStable();
      
      expect(component.isSubmitting).toBe(false);
    });

    it('não deve enviar requisição se o formulário for inválido', () => {
      // Deixar o formulário vazio (inválido)
      component.notificationForm.patchValue({
        conteudoMensagem: ''
      });

      component.onSubmit();

      // Não deve chamar o serviço
      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('Adição inicial da notificação à lista', () => {
    it('deve adicionar a notificação à lista com status ENVIADO após envio bem-sucedido', async () => {
      const conteudoMensagem = 'Mensagem de teste';
      
      component.notificationForm.patchValue({
        conteudoMensagem: conteudoMensagem
      });

      // Verificar que a lista está vazia inicialmente
      expect(component.sentNotifications.length).toBe(0);

      component.onSubmit();

      // Aguardar a resolução do observable
      await fixture.whenStable();

      // Verificar se a notificação foi adicionada à lista
      expect(component.sentNotifications.length).toBe(1);
      
      const addedNotification = component.sentNotifications[0];
      expect(addedNotification.mensagemId).toBeTruthy();
      expect(addedNotification.mensagemId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(addedNotification.conteudoMensagem).toBe(conteudoMensagem);
      expect(addedNotification.status).toBe('ENVIADO');
      expect(addedNotification.statusHistory.length).toBe(1);
      expect(addedNotification.statusHistory[0].status).toBe('ENVIADO');
      expect(addedNotification.statusHistory[0].timestamp).toBeInstanceOf(Date);
    });

    it('deve notificar o serviço sobre a criação da mensagem', async () => {
      const conteudoMensagem = 'Mensagem de teste';
      
      component.notificationForm.patchValue({
        conteudoMensagem: conteudoMensagem
      });

      component.onSubmit();

      // Aguardar a resolução do observable
      await fixture.whenStable();

      // Verificar se o serviço foi notificado
      expect(mockNotificationService.notifyMessageCreated).toHaveBeenCalledWith(
        component.currentMessageId,
        'ENVIADO'
      );
    });

    it('deve limpar o formulário e o UUID após envio bem-sucedido', async () => {
      const conteudoMensagem = 'Mensagem de teste';
      
      component.notificationForm.patchValue({
        conteudoMensagem: conteudoMensagem
      });

      component.onSubmit();

      // Aguardar a resolução do observable
      await fixture.whenStable();

      // Verificar se o formulário foi limpo
      expect(component.notificationForm.get('conteudoMensagem')?.value).toBe('');
      
      // Verificar se o UUID foi limpo
      expect(component.currentMessageId).toBe('');
    });

    it('deve exibir mensagem de sucesso após envio bem-sucedido', async () => {
      const conteudoMensagem = 'Mensagem de teste';
      
      component.notificationForm.patchValue({
        conteudoMensagem: conteudoMensagem
      });

      component.onSubmit();

      // Aguardar a resolução do observable
      await fixture.whenStable();

      // Verificar mensagem de sucesso
      expect(component.message).toContain('Notificação enviada com sucesso!');
      expect(component.message).toContain('test-id'); // Do mock
      expect(component.messageClass).toContain('bg-green-50');
    });
  });

  describe('Tratamento de erros', () => {
    it('deve exibir mensagem de erro quando a requisição falha', async () => {
      const conteudoMensagem = 'Mensagem de teste';
      
      // Configurar o mock para retornar erro
      mockNotificationService.sendNotification.and.returnValue(
        new BehaviorSubject({ error: { error: { erro: 'Erro interno do servidor' } } })
      );
      
      component.notificationForm.patchValue({
        conteudoMensagem: conteudoMensagem
      });

      component.onSubmit();

      await fixture.whenStable();

      expect(component.isSubmitting).toBe(false);
      expect(component.sentNotifications.length).toBe(0);
    });
  });

  describe('Validação do formulário', () => {
    it('deve marcar o formulário como inválido quando conteúdo está vazio', () => {
      component.notificationForm.patchValue({
        conteudoMensagem: ''
      });

      expect(component.notificationForm.valid).toBe(false);
      expect(component.notificationForm.get('conteudoMensagem')?.errors?.['required']).toBeTruthy();
    });

    it('deve marcar o formulário como válido quando conteúdo está preenchido', () => {
      component.notificationForm.patchValue({
        conteudoMensagem: 'Mensagem válida'
      });

      expect(component.notificationForm.valid).toBe(true);
      expect(component.notificationForm.get('conteudoMensagem')?.errors).toBeNull();
    });
  });
});