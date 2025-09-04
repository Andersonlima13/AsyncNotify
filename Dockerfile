# Multi-stage build para aplicação Node.js com Angular
FROM node:18-alpine AS builder

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY client/package*.json ./client/

# Instalar dependências
RUN npm ci --only=production
RUN cd client && npm ci --only=production

# Copiar código fonte
COPY . .

# Build da aplicação Angular
RUN cd client && npm run build

# Build do backend
RUN npm run build

# Stage de produção
FROM node:18-alpine AS production

WORKDIR /app

# Instalar dependências mínimas para produção
RUN apk add --no-cache dumb-init

# Copiar apenas arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Mudar ownership dos arquivos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor porta
EXPOSE 5000

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=5000

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]