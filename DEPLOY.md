# 🚀 Деплой на Railway

## ✅ Исправления для Railway

1. **PostgreSQL вместо SQLite** - код обновлен для работы с переменными Railway
2. **TypeScript сборка** - добавлена правильная конфигурация и Dockerfile
3. **HTTP эндпоинты** - для проверки статуса бота

## 🔧 Переменные окружения в Railway

Добавьте эти переменные в настройках проекта:

```
# PostgreSQL (автоматически создается Railway)
PGHOST=postgres.railway.internal
PGUSER=postgres
PGPASSWORD=ваш_пароль
PGDATABASE=railway
PGPORT=5432

# Telegram API
API_ID=ваш_api_id
API_HASH=ваш_api_hash
TG_PHONE=ваш_номер_телефона
TG_SESSION=ваша_сессия_telegram

# OpenAI API
OPENAI_API_KEY=ваш_openai_ключ

# Окружение
NODE_ENV=production
PORT=3000
```

## 🔍 Проверка работы

После деплоя откройте:
- `https://ваш-проект.railway.app/health` - статус бота
- `https://ваш-проект.railway.app/messages` - сохраненные сообщения

## 📊 Что покажет /health

```json
{
  "status": "ok",
  "connected": true,
  "messageCount": 0,
  "uptime": 3600,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```
