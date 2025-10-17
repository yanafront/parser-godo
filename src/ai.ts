import OpenAI from 'openai';
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function sendMessage(text: string) : Promise<string>{

const response = await client.responses.create({
  model: 'gpt-5-nano',
  instructions: 'Тебе нужно сформировать json из этой ваканасии , где нужно заменить {{PHONE}} и {{MESSAGE}} на данные из вакансии  {"phone": "{{PHONE}}","message": "{{MESSAGE}}"} . {{PHONE}} может быть и ссылка на телеграмм. Если сообщение не вакансия , то ответь "Не вакансия". Также отформатируй красиво вакансию для отображения в html. Можно использовать html теги',
  input: text,
});

return response.output_text
}