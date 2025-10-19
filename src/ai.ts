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
          content: 'Тебе нужно сформировать json из этой вакансии, где нужно заменить {{PHONE}} и {{MESSAGE}} на данные из вакансии {"phone": "{{PHONE}}","message": "{{MESSAGE}}"} . {{PHONE}} может быть и ссылка на телеграмм. Если сообщение не вакансия, то ответь "Не вакансия". Также отформатируй красиво вакансию для отображения в html. Можно использовать html теги'
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