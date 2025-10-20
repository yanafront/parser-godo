import OpenAI from 'openai';
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function sendMessage(text: string) : Promise<string>{
  try {
    console.log(`🤖 Отправляю в OpenAI:`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Ты - эксперт по форматированию вакансий для Telegram канала. Твоя задача:

1. Проанализировать сообщение и определить, является ли оно вакансией
2. Если это вакансия - отформатировать её в едином стиле для публикации
3. Если не вакансия - ответить "Не вакансия"

Формат ответа: {"phone": "{{PHONE}}", "message": "{{MESSAGE}}"}

Требования к форматированию вакансии:
- Используй HTML теги для красивого оформления
- Структура: <b>Должность</b>, <b>Компания</b>, <b>Зарплата</b>, <b>Требования</b>, <b>Контакты</b>
- Добавь эмодзи для привлечения внимания: 💼 🏢 💰 📋 📞
- Сделай текст читаемым и профессиональным
- Убери лишнюю информацию и оставь только суть
- Если информации мало - добавь "Уточняйте детали"

Пример хорошего форматирования:
💼 <b>Менеджер по продажам</b>
🏢 <b>Компания:</b> ООО "Пример"
💰 <b>Зарплата:</b> от 1000 BYN
📋 <b>Требования:</b> Опыт работы от 1 года, коммуникабельность
📞 <b>Контакты:</b> @username или +375291234567

Если сообщение не содержит вакансию, ответь: "Не вакансия"`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
    });

    const result = response.choices[0].message.content || "Не вакансия";
    console.log(`🤖 OpenAI ответил:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Ошибка OpenAI:`, error);
    return "Не вакансия";
  }
}