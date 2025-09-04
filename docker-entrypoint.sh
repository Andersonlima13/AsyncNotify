#!/bin/sh
set -e

echo "🚀 Iniciando aplicação Notification System..."

# Aguardar RabbitMQ estar disponível
echo "⏳ Aguardando RabbitMQ..."
until nc -z rabbitmq 5672; do
  echo "RabbitMQ não disponível - aguardando..."
  sleep 2
done

echo "✅ RabbitMQ conectado!"

# Iniciar a aplicação
echo "🌟 Iniciando servidor Node.js..."
exec "$@"