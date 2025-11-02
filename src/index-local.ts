import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram/tl/index.js";
import readlineSync from "readline-sync";
import { initDatabase, saveMessage, getMessageCount, getAllMessages } from "./db-local.js";
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
const stringSession = new StringSession(tgSession);

(async () => {
  await initDatabase();
  console.log("База данных инициализирована");
  
  const messageCount = await getMessageCount();
  console.log(`📊 В базе данных уже есть ${messageCount} сообщений`);
  
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => tgPhone,
    password: async () => {
      console.log("Введите пароль двухфакторной аутентификации (если включена):");
      return readlineSync.question("Password: ");
    },
    phoneCode: async () => {
      console.log("Введите код подтверждения из Telegram:");
      return readlineSync.question("Code: ");
    },
    onError: (err) => console.log(err),
  });

  console.log("Авторизация прошла успешно!");
  console.log(client.session.save()); 

  const targetChats = ["@rabota_v_minske77", "@JobsBelarus", "@Rabota_Podrabotki_Minsk", "@rabota_v_minske1", "@pratsa_vakansiil"];

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
          
          console.log(`📤 Отправляю вакансию в канал...`);
          try {
            await client.sendMessage("@go_do_minsk", {
              message: msg.message,
              parseMode: "html",
              linkPreview: false
            });
            console.log(`✅ Вакансия отправлена в @go_do_minsk`);
          } catch (sendError: any) {
            console.error(`❌ Ошибка при отправке вакансии:`, sendError?.message || sendError);
            return;
          }

          console.log(`📤 Отправляю отдельное сообщение с кнопкой "Найти работу"...`);
          
          const button = new Api.KeyboardButtonUrl({
            text: "Найти работу",
            url: "https://t.me/go_do_job_bot"
          });

          const row = new Api.KeyboardButtonRow({
            buttons: [button]
          });

          const replyMarkup = new Api.ReplyInlineMarkup({
            rows: [row]
          });

          try {
            const entity = await client.getEntity("@go_do_minsk");
            const result = await client.invoke(
              new Api.messages.SendMessage({
                peer: entity,
                message: " ",
                entities: [],
                replyMarkup: replyMarkup,
                noWebpage: false,
                silent: false
              })
            );
            console.log(`✅ Отдельное сообщение с кнопкой "Найти работу" отправлено`);
            console.log(`📋 Результат:`, result);
          } catch (buttonError: any) {
            console.error(`❌ Ошибка при отправке кнопки:`, buttonError?.message || buttonError);
            try {
              await client.sendMessage("@go_do_minsk", {
                message: " ",
                parseMode: "html",
                buttons: replyMarkup,
                linkPreview: false
              });
              console.log(`✅ Кнопка отправлена через sendMessage`);
            } catch (sendError2: any) {
              console.error(`❌ Ошибка при отправке кнопки через sendMessage:`, sendError2?.message || sendError2);
            }
          }
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
