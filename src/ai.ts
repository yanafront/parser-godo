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
          content: `КРИТИЧЕСКИ ВАЖНО: Ты должен отвечать СТРОГО в формате JSON. Никакого другого текста!

Формат ответа: {"phone": "контакт", "message": "текст вакансии"}

Правила:
1. Если НЕ вакансия - ответь: {"phone": "", "message": "Не вакансия"}
2. Если вакансия - найди контакты и отформатируй текст
3. Используй HTML теги <b>текст</b> для выделения
4. Структура: 💼 <b>Должность</b>, 🏢 <b>Компания:</b>, 💰 <b>Зарплата:</b>, 📋 <b>Требования:</b>, 📞 <b>Контакты:</b>
5. В JSON используй \\n для переносов строк (не реальные переносы!)
6. JSON должен быть в ОДНОЙ строке!

ПРИМЕР ПРАВИЛЬНОГО ОТВЕТА:
{"phone": "+375291234567", "message": "💼 <b>Менеджер по продажам</b>\\n🏢 <b>Компания:</b> ООО \\"Пример\\"\\n💰 <b>Зарплата:</b> от 1000 BYN\\n📋 <b>Требования:</b> Опыт работы от 1 года\\n📞 <b>Контакты:</b> +375291234567"}

ЗАПРЕЩЕНО: писать что-либо кроме JSON!`
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