import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";
import { initDatabase, saveMessage, getMessageCount, getAllMessages } from "./db.js";
import { sendMessage } from "./ai.js";
import type { JsonMessage } from "./types.js";
import dotenv from "dotenv";
import http from "http";


dotenv.config();

// Проверка переменных окружения
const requiredEnvVars = ['API_ID', 'API_HASH', 'TG_PHONE', 'OPENAI_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Отсутствуют переменные окружения:', missingVars.join(', '));
  console.error('💡 Убедитесь, что все переменные настроены в .env файле или на сервере');
  process.exit(1);
}

console.log('✅ Все переменные окружения загружены');

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH || "";
const tgSession = process.env.TG_SESSION || "";
const tgPhone= process.env.TG_PHONE || "";
const tgCode = process.env.TG_CODE || "";
const tgPassword = process.env.TG_PASSWORD || "";
const stringSession = new StringSession(tgSession);

(async () => {
  await initDatabase();
  console.log("База данных инициализирована");

  const messageCount = await getMessageCount();
  console.log(`📊 В базе данных уже есть ${messageCount} сообщений`);

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.start({
      phoneNumber: async () => {
        if (!tgPhone) {
          throw new Error('TG_PHONE не указан в переменных окружения');
        }
        return tgPhone;
      },
      password: async () => {
        if (!tgPassword) {
          return '';
        }
        return tgPassword;
      },
      phoneCode: async () => {
        if (!tgCode) {
          console.error('❌ TG_CODE не указан в переменных окружения');
          console.error('💡 Для первого запуска на Railway:');
          console.error('   1. Получите код подтверждения из Telegram');
          console.error('   2. Добавьте переменную окружения TG_CODE=ваш_код');
          console.error('   3. После успешной авторизации скопируйте сессию из логов');
          console.error('   4. Добавьте TG_SESSION=сессия и удалите TG_CODE');
          throw new Error('Код подтверждения не указан. Добавьте TG_CODE в переменные окружения на Railway');
        }
        console.log('📱 Использую код из переменных окружения');
        return tgCode;
      },
      onError: (err: any) => {
        const errorMsg = err?.errorMessage || err?.message || String(err);
        const errorCode = err?.code || err?.errorCode;
        
        if (errorMsg?.includes('AUTH_KEY_DUPLICATED') || errorCode === 406) {
          console.error('');
          console.error('❌ ОШИБКА: Сессия используется одновременно в нескольких местах!');
          console.error('💡 Остановите один из запущенных ботов (Railway или локальный)');
          process.exit(1);
        }
        console.error('❌ Ошибка авторизации:', err);
      },
    });
  } catch (error: any) {
    console.error('❌ Ошибка при запуске клиента:', error);
    
    const errorMsg = error?.errorMessage || error?.message || String(error);
    const errorCode = error?.code || error?.errorCode;
    
    if (errorMsg?.includes('AUTH_KEY_DUPLICATED') || errorCode === 406) {
      console.error('');
      console.error('❌ ОШИБКА: Сессия используется одновременно в нескольких местах!');
      console.error('');
      console.error('💡 Решение:');
      console.error('');
      console.error('   ВАРИАНТ 1: Остановить локальный запуск (если бот работает на Railway)');
      console.error('   - Нажмите Ctrl+C для остановки локального бота');
      console.error('   - Или закройте терминал');
      console.error('');
      console.error('   ВАРИАНТ 2: Остановить бота на Railway');
      console.error('   - Зайдите на Railway');
      console.error('   - Остановите сервис (временно отключите деплой)');
      console.error('   - Затем запустите локально: npm run dev');
      console.error('');
      console.error('   ВАРИАНТ 3: Создать новую сессию на Railway');
      console.error('   - Очистите TG_SESSION на Railway (сделайте пустым)');
      console.error('   - Остановите локальный запуск (если запущен)');
      console.error('   - Добавьте TG_CODE в Railway');
      console.error('   - Railway перезапустится и создаст новую сессию');
      console.error('   - Скопируйте новую сессию из логов и сохраните в TG_SESSION');
      console.error('   - Удалите TG_CODE');
      console.error('');
      console.error('');
      console.error('🛑 НЕМЕДЛЕННО: Остановите один из запущенных ботов!');
      console.error('   Railway будет перезапускаться до тех пор, пока не исправите конфликт.');
      console.error('');
      
      setTimeout(() => {
        console.error('⏸️  Останавливаю сервис...');
        process.exit(1);
      }, 5000);
      
      return;
    }
    throw error;
  }

  console.log("✅ Авторизация прошла успешно!");
  
  const newSession = client.session.save();
  const sessionString = typeof newSession === 'string' ? newSession : String(newSession);
  console.log("🔑 Текущая сессия:");
  console.log(sessionString);
  
  if (sessionString !== tgSession && sessionString.length > 10) {
    console.log('⚠️  Сессия изменилась! Обновите TG_SESSION на Railway:');
    console.log(`TG_SESSION=${sessionString}`);
  }

  const targetChats = ["@rabota_v_minske77", "@JobsBelarus", "@Rabota_Podrabotki_Minsk"];

  console.log("🔍 Начинаю прослушивание чатов:", targetChats);

  for (const chat of targetChats) {
    console.log(`📡 Подключаюсь к чату: ${chat}`);
    await client.addEventHandler(async (event: NewMessageEvent) => {
      const message = event.message;
      const text = message.message;
      const chatId = event.chatId?.toString() || 'unknown';

      console.log(`📨 Получено сообщение из чата ${chatId}:`, text?.substring(0, 100) + (text && text.length > 100 ? '...' : ''));

      if (text) {
        console.log(`🤖 Отправляю в AI для обработки...`);
        const json = await sendMessage(text);
        console.log(`📋 AI ответ:`, json);

        try {
          let msg: JsonMessage;

          // Пытаемся найти JSON в ответе и исправить переносы строк
          const jsonMatch = json.match(/\{[^}]*"phone"[^}]*"message"[^}]*\}/s);
          if (jsonMatch) {
            try {
              // Заменяем реальные переносы строк на экранированные
              const fixedJson = jsonMatch[0].replace(/\n/g, '\\n').replace(/\r/g, '\\r');
              msg = JSON.parse(fixedJson) as JsonMessage;
            } catch (parseError) {
              console.log(`⚠️ Ошибка парсинга найденного JSON, создаю объект вручную`);
              const phoneMatch = json.match(/(\+375[0-9\s\-\(\)]+|@\w+)/g);
              const phone = phoneMatch ? phoneMatch.join(', ') : '';

              msg = {
                phone: phone,
                message: json
              };
            }
          } else {
            // Если AI вернул не JSON, создаем объект вручную
            console.log(`⚠️ AI вернул не JSON, создаю объект вручную`);
            const phoneMatch = json.match(/(\+375[0-9\s\-\(\)]+|@\w+)/g);
            const phone = phoneMatch ? phoneMatch.join(', ') : '';

            msg = {
              phone: phone,
              message: json
            };
          }

          // Проверяем качество вакансии
          if (msg.message === "Не вакансия" || msg.message.length < 50) {
            console.log(`⚠️ Пропускаю: не вакансия или слишком короткое сообщение`);
            return;
          }

          console.log(`💾 Сохраняю в БД:`, { chat, message: msg.message.substring(0, 50), phone: msg.phone });
          await saveMessage(chat, msg.message, msg.phone);

          const cta = `\n\n<a href="https://t.me/go_do_job_bot">Найти подработку</a>`;
          const postMessage = msg.message + cta;

          client.setParseMode("html");
          await client.sendMessage("@go_do_minsk", { message: postMessage });
          console.log(`✅ Сообщение обработано и отправлено в @go_do_minsk`);
        } catch (error) {
          console.error("❌ Ошибка при обработке ответа AI:", error);
          console.error("📄 Исходный ответ AI:", json);
        }
      } else {
        console.log(`⚠️ Пустое сообщение, пропускаю`);
      }
    }, new NewMessage({ chats: [chat] }));
  }

  console.log("✅ Все обработчики событий добавлены. Бот работает!");

  // HTTP сервер для проверки статуса
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.url === '/health' || req.url === '/status') {
      try {
        const messageCount = await getMessageCount();
        const isConnected = client.connected;

        res.statusCode = 200;
        res.end(JSON.stringify({
          status: 'ok',
          connected: isConnected,
          messageCount: messageCount,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    } else if (req.url === '/messages') {
      try {
        const messages = await getAllMessages();
        res.statusCode = 200;
        res.end(JSON.stringify({
          status: 'ok',
          messages: messages,
          count: messages.length
        }));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({
        status: 'not found',
        availableEndpoints: ['/health', '/status', '/messages']
      }));
    }
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`🌐 HTTP сервер запущен на порту ${port}`);
    console.log(`📊 Статус: http://localhost:${port}/health`);
    console.log(`📋 Сообщения: http://localhost:${port}/messages`);
  });
})();
