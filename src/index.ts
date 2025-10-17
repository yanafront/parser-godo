import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import readlineSync from "readline-sync";
import { initDatabase, saveMessage } from "./db.ts";
import { sendMessage } from "./ai.ts";
import type { JsonMessage } from "./types.ts";
import dotenv from "dotenv";


dotenv.config();

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH || "";
const tgSession = process.env.TG_SESSION || "";
const tgPhone= process.env.TG_PHONE || "";
const tgCode = process.env.TG_CODE || "";
const stringSession = new StringSession(tgSession);

(async () => {
  await initDatabase();
  console.log("База данных инициализирована");
  
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
                       "@rabota_v_minske77","@Rabota_v_Minske13", ,"@rabota_v_minske1", "@testjonsforme"];

  for (const chat of targetChats) {
    await client.addEventHandler(async (event: NewMessageEvent) => {
      const message = event.message;
      const text = message.message;

      if (text) { //  && /работа|вакансия|ищем|требуется/i.test(text)
        const json =  await sendMessage(text);
        try{
        const msg = JSON.parse(json) as JsonMessage;
        await saveMessage(chat, msg.message, msg.phone);
        client.setParseMode("html");
        await client.sendMessage("me",{message: msg.message});
        }
        catch (error){
           console.error("Ошибка при парсинге JSON:", error);
        }
        
      }
    }, new NewMessage({ chats: [chat] }));
  }
})();
