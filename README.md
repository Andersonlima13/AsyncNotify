# 📚 Documentação Completa do Sistema de Notificações

## 🏗️ Visão Geral da Arquitetura

Sistema de notificações full-stack com Angular (frontend) + Node.js/Express (backend) + RabbitMQ (message broker) + WebSocket (tempo real).

### Stack Tecnológica
- **Frontend**: Angular 18 + TypeScript + TailwindCSS
- **Backend**: Node.js 20 + Express + TypeScript
- **Message Broker**: RabbitMQ
- **Real-time**: WebSocket
- **Build Tools**: Vite + ESBuild
- **Containerization**: Docker + Docker Compose

## 📁 Estrutura de Pastas

```
notification-system/
├── 📁 client/                          # Frontend Angular
│   ├── 📁 src/
│   │   ├── 📁 app/                     # Módulos Angular
│   │   │   ├── 📁 controllers/         # Controladores
│   │   │   ├── 📁 models/              # Modelos de dados
│   │   │   ├── 📁 services/            # Serviços Angular
│   │   │   ├── 📁 views/               # Componentes de view
│   │   │   ├── app.component.ts        # Componente raiz
│   │   │   ├── app.component.html      # Template raiz
│   │   │   ├── app.component.css       # Estilos raiz
│   │   │   └── app.routes.ts           # Configuração de rotas
│   │   ├── index.html                  # HTML principal
│   │   ├── main.ts                     # Bootstrap da aplicação
│   │   └── styles.css                  # Estilos globais
│   ├── angular.json                    # Configuração Angular CLI
│   ├── package.json                    # Dependências Angular
│   ├── tsconfig.json                   # Config TypeScript
│   └── karma.conf.js                   # Configuração testes
├── 📁 server/                          # Backend Node.js
│   ├── 📁 __tests__/                   # Testes unitários
│   │   ├── rabbitmq-simple.test.ts    # Testes RabbitMQ básicos
│   │   └── rabbitmq.test.ts           # Testes RabbitMQ avançados
│   ├── 📁 controllers/                 # Controladores API
│   │   ├── notification.controller.ts # CRUD notificações
│   │   └── status.controller.ts       # Status e estatísticas
│   ├── 📁 services/                    # Serviços de negócio
│   │   ├── rabbitmq.ts               # Integração RabbitMQ
│   │   └── websocket.ts              # WebSocket server
│   ├── bootstrap.ts                   # Inicialização serviços
│   ├── index.ts                      # Entry point servidor
│   ├── routes.ts                     # Configuração rotas
│   ├── storage.ts                    # Camada de persistência
│   └── vite.ts                      # Integração Vite
├── 📁 shared/                        # Código compartilhado
│   └── schema.ts                     # Schemas/tipos TypeScript
├── 📁 attached_assets/               # Assets estáticos
├── 📁 .local/                        # Estado local Replit
│   └── 📁 state/replit/agent/
│       └── progress_tracker.md       # Progresso migração
├── 🐳 Dockerfile                     # Imagem Docker aplicação
├── 🐳 docker-compose.yml             # Orquestração containers
├── 🐳 docker-entrypoint.sh           # Script inicialização
├── 🐳 .dockerignore                  # Exclusões build Docker
├── 📄 .env.example                   # Template variáveis ambiente
├── 📄 package.json                   # Dependências raiz
├── 📄 vite.config.ts                 # Configuração Vite
├── 📄 tailwind.config.ts             # Configuração TailwindCSS
├── 📄 tsconfig.json                  # Config TypeScript global
├── 📄 jest.config.js                 # Configuração Jest
├── 📄 drizzle.config.ts              # ORM configuração
└── 📄 components.json                # Configuração UI components
```

## 🎯 Frontend (Angular)

### Arquitetura do Cliente
- **Padrão**: MVC (Model-View-Controller)
- **Linguagem**: TypeScript
- **Styling**: TailwindCSS + CSS puro
- **Estado**: RxJS + Local state management

### Componentes Principais

#### `client/src/main.ts`
```typescript
// Sistema principal de notificações
- NotificationSystem class
- WebSocket integration
- Real-time UI updates
- Form handling e validação
```

#### Estrutura Angular
```
app/
├── controllers/    # Lógica de negócio
├── models/        # Interfaces e tipos
├── services/      # Serviços HTTP/WebSocket
└── views/         # Componentes de interface
```

### Dependências Frontend

```json
{
  "dependencies": {
    "@angular/core": "^18.0.0",         // Framework Angular
    "@angular/common": "^18.0.0",       // Módulos comuns
    "@angular/router": "^18.0.0",       // Roteamento
    "@angular/forms": "^18.0.0",        // Formulários reativos
    "rxjs": "~7.8.0",                  // Programação reativa
    "zone.js": "~0.14.3"               // Change detection
  },
  "devDependencies": {
    "@angular/cli": "^18.0.0",          // CLI Angular
    "@angular-devkit/build-angular": "^18.0.0", // Build tools
    "typescript": "~5.4.0",            // Compilador TS
    "karma": "~6.4.0",                 // Test runner
    "jasmine-core": "~5.1.0"           // Testing framework
  }
}
```

## 🚀 Backend (Node.js/Express)

### Arquitetura do Servidor
- **Padrão**: Layered Architecture
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Linguagem**: TypeScript
- **Build**: Vite + ESBuild

### Camadas da Aplicação

#### 1. **Controllers** (`server/controllers/`)
```typescript
// notification.controller.ts - Gerencia CRUD de notificações
// status.controller.ts - Endpoint de status e estatísticas
```

#### 2. **Services** (`server/services/`)
```typescript
// rabbitmq.ts - Integração com message broker
// websocket.ts - Comunicação tempo real
```

#### 3. **Routes** (`server/routes.ts`)
```typescript
// Configuração de rotas REST API
// Middleware de autenticação e validação
```

#### 4. **Storage** (`server/storage.ts`)
```typescript
// Abstração da camada de persistência
// Interface para operações CRUD
```

### API Endpoints

```
POST   /api/notificar           # Enviar notificação
GET    /api/status              # Status das mensagens
GET    /api/queue/stats         # Estatísticas da fila
WS     /ws                      # WebSocket connection
```

### Dependências Backend

```json
{
  "dependencies": {
    "express": "^4.21.2",              // Web framework
    "ws": "^8.18.0",                   // WebSocket server
    "amqplib": "^0.10.9",              // RabbitMQ client
    "uuid": "^11.1.0",                // UUID generation
    "zod": "^3.24.2",                 // Schema validation
    "drizzle-orm": "^0.39.1",          // ORM database
    "@neondatabase/serverless": "^0.10.4" // Database driver
  },
  "devDependencies": {
    "tsx": "^4.19.1",                 // TypeScript executor
    "esbuild": "^0.25.0",             // Bundler
    "vite": "^5.4.19",                // Build tool
    "typescript": "5.6.3",            // Compilador
    "jest": "^30.1.3",                // Testing framework
    "@types/node": "20.16.11",        // Node.js types
    "@types/express": "4.17.21",      // Express types
    "@types/ws": "^8.5.13"            // WebSocket types
  }
}
```

## 🐰 RabbitMQ Integration

### Message Broker Architecture
```
Producer (API) → Exchange → Queue → Consumer (Worker)
                    ↓
            Status Updates → WebSocket → Frontend
```

### Filas Configuradas
```typescript
const ENTRADA_QUEUE_NAME = 'fila.notificacao.entrada.Anderson-Lima'
const STATUS_QUEUE_NAME = 'fila.notificacao.status.Anderson-Lima'
```

### Fluxo de Mensagens
1. **Entrada**: API recebe requisição → Publica na fila de entrada
2. **Processamento**: Consumer processa → Atualiza status
3. **Notificação**: Status broadcast via WebSocket → Frontend atualiza

## 🔗 WebSocket Real-time

### Eventos Suportados
```typescript
'queue-stats'           // Estatísticas em tempo real
'message-status-update' // Atualização status mensagem
'notification-update'   // Atualização notificação
```

### Cliente WebSocket
```typescript
// Reconexão automática
// Heartbeat/ping-pong
// Error handling
// Message buffering
```

## 🐳 Docker Configuration

### Multi-stage Dockerfile

#### Stage 1: Builder
```dockerfile
FROM node:20-alpine AS builder
# Instalar dependências de sistema
# Copiar package.json files
# npm ci (install dependencies)
# Build Angular application
# Build Node.js backend
```

#### Stage 2: Production
```dockerfile
FROM node:20-alpine AS production
# Runtime dependencies apenas
# Security: non-root user
# Health checks
# Proper signal handling
```

### Docker Compose Services

#### Application Service
```yaml
app:
  build: .
  ports: ["5000:5000"]
  environment:
    - NODE_ENV=production
    - RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672/notification_vhost
  depends_on: [rabbitmq]
  healthcheck: wget http://localhost:5000/api/status
```

#### RabbitMQ Service
```yaml
rabbitmq:
  image: rabbitmq:3.12-management-alpine
  ports: ["5672:5672", "15672:15672"]
  environment:
    - RABBITMQ_DEFAULT_USER=admin
    - RABBITMQ_DEFAULT_PASS=admin123
    - RABBITMQ_DEFAULT_VHOST=notification_vhost
  healthcheck: rabbitmq-diagnostics ping
```

### Volumes e Networks
```yaml
volumes:
  rabbitmq_data: driver=local

networks:
  notification_network: driver=bridge
```

## ⚙️ Configuração de Ambiente

### Variáveis de Ambiente
```bash
# RabbitMQ Configuration
RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672/notification_vhost
ENTRADA_QUEUE_NAME=fila.notificacao.entrada.Anderson-Lima
STATUS_QUEUE_NAME=fila.notificacao.status.Anderson-Lima

# Server Configuration
PORT=5000
NODE_ENV=production
```

### Configuração de Build

#### Vite Config (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      external: ['node:*']
    }
  },
  resolve: {
    alias: {
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  }
})
```

#### TypeScript Config
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  }
}
```

## 🚦 Development vs Production

### Development Mode
```typescript
// Fallback para RabbitMQ não disponível
// Hot reload com Vite
// Source maps habilitados
// Logs detalhados
// CORS permissivo
```

### Production Mode
```typescript
// RabbitMQ obrigatório
// Assets otimizados e minificados
// Error handling robusto
// Security headers
// Performance monitoring
```

## 📦 Scripts de Build

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "test": "jest",
    "check": "tsc"
  }
}
```

### Docker Build Process
```bash
# 1. Multi-stage build
docker build -t notification-system .

# 2. Compose deployment
docker-compose up --build

# 3. Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Configuração de Dependências

### Gerenciamento de Pacotes
- **Root**: Dependências compartilhadas e build tools
- **Client**: Específicas do Angular
- **Server**: Runtime Node.js

### Estratégia de Versionamento
- **Exact versions**: Dependências críticas
- **Caret ranges**: Dependências estáveis
- **Lock files**: package-lock.json para reprodutibilidade

## 🚀 Processo de Inicialização

### Development
```bash
npm install          # Instalar dependências
npm run dev         # Iniciar desenvolvimento
```

### Docker
```bash
docker-compose up --build    # Build e start
docker-compose logs -f       # Monitor logs
```

### Production
```bash
npm run build              # Build aplicação
npm start                  # Start production server
```

## 📊 Monitoramento e Logs

### Logging Strategy
```typescript
// Structured logging
// Request/response tracing
// Error tracking
// Performance metrics
```

### Health Checks
```typescript
GET /api/status           # Application health
GET /api/queue/stats      # RabbitMQ status
```

## 🔐 Security Considerations

### Container Security
- Non-root user execution
- Minimal base images
- Secret management
- Network isolation

### Application Security
- Input validation (Zod)
- CORS configuration
- Rate limiting
- Error sanitization

---

Esta documentação fornece uma visão completa da arquitetura, configuração e deployment do Sistema de Notificações Angular + Node.js com RabbitMQ e Docker.
