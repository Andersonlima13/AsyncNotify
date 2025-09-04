# 🐳 Docker Deployment Guide

Este guia fornece instruções completas para dockerizar e executar o Sistema de Notificações Angular + Node.js com RabbitMQ.

## 📋 Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+
- Pelo menos 2GB de RAM disponível
- Portas 5000 e 15672 livres

## 🚀 Deploy Rápido

### 1. Preparar Ambiente
```bash
# Copiar arquivo de configuração
cp .env.example .env

# Editar configurações se necessário
vim .env
```

### 2. Executar com Docker Compose
```bash
# Build e start de todos os serviços
docker-compose up --build

# Para executar em background
docker-compose up -d --build
```

### 3. Verificar Deployment
- **Aplicação**: http://localhost:5000
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)

## 🔧 Configuração Avançada

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `RABBITMQ_URL` | URL de conexão do RabbitMQ | `amqp://admin:admin123@rabbitmq:5672/notification_vhost` |
| `ENTRADA_QUEUE_NAME` | Nome da fila de entrada | `fila.notificacao.entrada.Anderson-Lima` |
| `STATUS_QUEUE_NAME` | Nome da fila de status | `fila.notificacao.status.Anderson-Lima` |
| `PORT` | Porta do servidor | `5000` |

### Personalizar Configuração do RabbitMQ

```yaml
# docker-compose.yml
rabbitmq:
  environment:
    RABBITMQ_DEFAULT_USER: seu_usuario
    RABBITMQ_DEFAULT_PASS: sua_senha_segura
    RABBITMQ_DEFAULT_VHOST: sua_vhost
```

## 📊 Monitoramento

### Logs em Tempo Real
```bash
# Logs de todos os serviços
docker-compose logs -f

# Logs apenas da aplicação
docker-compose logs -f app

# Logs apenas do RabbitMQ
docker-compose logs -f rabbitmq
```

### Health Checks
```bash
# Verificar status dos containers
docker-compose ps

# Verificar saúde da aplicação
curl http://localhost:5000/api/status

# Verificar estatísticas da fila
curl http://localhost:5000/api/queue/stats
```

## 🔄 Comandos Úteis

### Desenvolvimento
```bash
# Build apenas
docker-compose build

# Restart serviços específicos
docker-compose restart app
docker-compose restart rabbitmq

# Ver logs de erro
docker-compose logs --tail=50 app
```

### Produção
```bash
# Deploy com escala
docker-compose up -d --scale app=2

# Backup do volume RabbitMQ
docker run --rm -v notification_system_rabbitmq_data:/data -v $(pwd):/backup ubuntu tar czf /backup/rabbitmq_backup.tar.gz /data

# Restore do backup
docker run --rm -v notification_system_rabbitmq_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/rabbitmq_backup.tar.gz -C /
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Porta 5000 em uso**
   ```bash
   # Verificar processo usando a porta
   lsof -i :5000
   # Alterar porta no docker-compose.yml
   ports:
     - "3000:5000"  # host:container
   ```

2. **RabbitMQ não inicializa**
   ```bash
   # Verificar logs
   docker-compose logs rabbitmq
   # Limpar volume se necessário
   docker-compose down -v
   docker-compose up --build
   ```

3. **Aplicação não conecta ao RabbitMQ**
   ```bash
   # Verificar se RabbitMQ está healthy
   docker-compose ps
   # Verificar conectividade de rede
   docker-compose exec app nc -z rabbitmq 5672
   ```

### Performance

- **Ajustar recursos do container**:
  ```yaml
  app:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
  ```

- **Configurar pool de conexões RabbitMQ**:
  ```yaml
  app:
    environment:
      RABBITMQ_POOL_SIZE: "10"
      RABBITMQ_HEARTBEAT: "60"
  ```

## 🌐 Deployment em Produção

### Docker Swarm
```bash
# Inicializar swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml notification-system
```

### Kubernetes
```bash
# Gerar manifests Kubernetes
kompose convert

# Apply
kubectl apply -f .
```

### Considerações de Segurança

1. **Alterar senhas padrão**
2. **Usar secrets em vez de environment variables**
3. **Configurar TLS para RabbitMQ**
4. **Implementar rate limiting**
5. **Configurar monitoring (Prometheus/Grafana)**

## 📈 Escalabilidade

Para ambientes de alta carga:

```yaml
version: '3.8'
services:
  app:
    scale: 3
    deploy:
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs com `docker-compose logs`
2. Consultar documentação oficial do Docker
3. Verificar issues no repositório do projeto