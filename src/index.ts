import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import readlineSync from "readline-sync";
import { initDatabase, saveMessage, getMessageCount, getAllMessages } from "./db.ts";
import { sendMessage } from "./ai.ts";
import type { JsonMessage } from "./types.ts";
import dotenv from "dotenv";


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

  const targetChats = ["@pratsa_vakansiil", "@pratsa_vakansii", "@pratsa_vakansiic", 
                       "@rabota_v_minske77", "@Rabota_v_Minske13", "@rabota_v_minske1", "@testjonsforme"];

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
          const msg = JSON.parse(json) as JsonMessage;
          console.log(`💾 Сохраняю в БД:`, { chat, message: msg.message.substring(0, 50), phone: msg.phone });
          await saveMessage(chat, msg.message, msg.phone);
          
          client.setParseMode("html");
          await client.sendMessage("me", { message: msg.message });
          console.log(`✅ Сообщение обработано и отправлено в "Избранное"`);
        } catch (error) {
          console.error("❌ Ошибка при парсинге JSON:", error);
          console.error("📄 Исходный JSON:", json);
        }
      } else {
        console.log(`⚠️ Пустое сообщение, пропускаю`);
      }
    }, new NewMessage({ chats: [chat] }));
  }

  console.log("✅ Все обработчики событий добавлены. Бот работает!");
})();
