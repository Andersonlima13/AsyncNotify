# Multi-stage build para aplicação Node.js com Angular
FROM node:20-alpine AS builder

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY client/package*.json ./client/

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm ci
RUN cd client && npm ci

# Copiar código fonte
COPY . .

# Build da aplicação Angular
RUN cd client && npm run build

# Build do backend
RUN npm run build

# Stage de produção
FROM node:20-alpine AS production

WORKDIR /app

# Instalar dependências mínimas para produção
RUN apk add --no-cache dumb-init netcat-openbsd

# Copiar apenas arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist/client ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared ./shared
COPY docker-entrypoint.sh /usr/local/bin/

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Mudar ownership dos arquivos e tornar script executável
RUN chown -R nodejs:nodejs /app && \
    chmod +x /usr/local/bin/docker-entrypoint.sh
USER nodejs

# Expor porta
EXPOSE 5000

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=5000
ENV RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672/notification_vhost
ENV ENTRADA_QUEUE_NAME=fila.notificacao.entrada.Anderson-Lima
ENV STATUS_QUEUE_NAME=fila.notificacao.status.Anderson-Lima

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--", "docker-entrypoint.sh"]
CMD ["npm", "start"]