import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { getWeatherData, geocodeLocation } from "./weather";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey! });

const getWeatherFunctionDeclaration: FunctionDeclaration = {
  name: "get_weather",
  parameters: {
    type: Type.OBJECT,
    description: "Get current weather and forecast for a specific location.",
    properties: {
      location: {
        type: Type.STRING,
        description: "The city and country, e.g., 'London, UK' or 'Tel Aviv, Israel'.",
      },
    },
    required: ["location"],
  },
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  weatherData?: any;
}

export async function* streamChat(message: string, history: ChatMessage[]) {
  if (!apiKey) {
    throw new Error("מפתח API של Gemini חסר. אנא הגדר אותו בהגדרות.");
  }

  // Gemini history MUST alternate: user, model, user, model...
  // And MUST start with 'user'.
  const geminiHistory: any[] = [];
  
  // We process history to ensure it's valid for Gemini
  // Skipping the first greeting if it's from the model
  const filteredHistory = history.filter((m, i) => !(i === 0 && m.role === 'model'));
  
  for (let i = 0; i < filteredHistory.length; i++) {
    const msg = filteredHistory[i];
    const role = msg.role === 'user' ? 'user' : 'model';
    
    // Safety check: skip if it's the same role as the last one (should not happen normally)
    if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === role) {
      continue;
    }
    
    geminiHistory.push({
      role,
      parts: [{ text: msg.text }]
    });
  }

  // If after filtering we end with a 'user' message, Gemini will throw because 'sendMessage' adds a user message.
  // So we must ensure it ends with 'model' or is empty.
  if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === 'user') {
    // This could happen if history passed includes the current message
    // Usually sendMessage adds the message to history.
    // If history ends with 'user', we can't use sendMessage.
    // But since App.tsx calls streamChat before the state update is fully stable for history,
    // we should be okay. If not, we pop it.
    geminiHistory.pop();
  }

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    history: geminiHistory,
    config: {
      systemInstruction: `אתה SkyWise AI, עוזר מזג אוויר מהיר ומדויק להפליא.
      המטרה שלך היא לספק את המידע המדויק ביותר על מזג האוויר בזמן אמת.
      
      חוקים קריטיים:
      1. השתמש תמיד בכלי 'get_weather' לכל שאלה הקשורה למזג אוויר במיקום מסוים.
      2. ציין במידת הצורך שהתחזית מבוססת על שילוב של מודלים עולמיים (ECMWF, GFS וכו') לדיוק מקסימלי.
      3. סיכומים קצרים, מקצועיים ומדויקים בעברית בלבד.
      4. זמן נוכחי: ${new Date().toLocaleString('he-IL')}.`,
      tools: [
        { functionDeclarations: [getWeatherFunctionDeclaration] }
      ],
    },
  });

  let fullText = "";
  let weatherData: any = null;

  try {
    const stream = await chat.sendMessageStream({ message });
    
    for await (const chunk of stream) {
      const text = chunk.text || "";
      if (text) {
        fullText += text;
        yield { text: fullText };
      }
      
      const functionCalls = chunk.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'get_weather') {
            const { location } = call.args as { location: string };
            try {
              const geo = await geocodeLocation(location);
              if (geo) {
                const weather = await getWeatherData(geo.latitude, geo.longitude);
                weatherData = {
                  ...weather,
                  location_name: geo.name + (geo.country ? `, ${geo.country}` : ''),
                };
                
                const finalStream = await chat.sendMessageStream({
                  message: `נתוני מזג האוויר עבור ${location} הם: ${JSON.stringify(weatherData)}. אנא סכם אותם למשתמש בעברית בצורה ברורה ומדויקת.`
                });
                
                let toolSummaryText = "";
                for await (const finalChunk of finalStream) {
                  toolSummaryText += finalChunk.text || "";
                  yield { text: fullText + (fullText ? "\n\n" : "") + toolSummaryText, weatherData };
                }
                return;
              } else {
                yield { text: fullText + (fullText ? "\n\n" : "") + `לא הצלחתי למצוא את המיקום: ${location}. האם תוכל להיות ספציפי יותר?` };
                return;
              }
            } catch (error) {
              console.error('Weather fetching error:', error);
              yield { text: fullText + (fullText ? "\n\n" : "") + "אני מצטער, נתקלתי בשגיאה בעת שליפת נתוני מזג האוויר." };
              return;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Gemini API Error:', err);
    throw new Error("נכשלה הקריאה ל-API של Gemini. אנא וודא שהמפתח תקין ונסה שוב.");
  }
}
