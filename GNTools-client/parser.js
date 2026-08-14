// parser.js – WhatsApp message parser module with Gemini API and offline fallback

function cleanValue(val) {
  if (!val) return '';
  return val
    .trim()
    .replace(/^(?:у вас|у тебя|бизге|мага|нам|мне|я|мы)\s+/iu, '')
    .replace(/^[.,\s"'«»`()\-]+|[.,\s"'«»`()\-]+$/g, '')
    .trim();
}

/**
 * Extracts phone number using regex.
 */
function extractPhone(text) {
  const labelMatch = text.match(/(?:телефон|номер|байланыш|контакт|связь|contact|phone)(?![А-ЯЁа-яёҢңҮүӨө\w])[\s\w]*[:\-]?\s*(\+?[\d\s\-()]{7,20})/iu);
  if (labelMatch) {
    const cleaned = labelMatch[1].trim();
    if (cleaned.replace(/[\D]/g, '').length >= 7) {
      return cleanValue(cleaned);
    }
  }
  const allPhones = text.match(/\+?\d[\d\s\-()]{5,20}\d/g) || [];
  for (const match of allPhones) {
    const cleaned = match.trim();
    const digitsOnly = cleaned.replace(/[\D]/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return cleanValue(cleaned);
    }
  }
  return '';
}

/**
 * Extracts name using regex.
 */
function extractName(text) {
  const headerMatch = text.match(/(?:имя|атым|аты|name)(?![А-ЯЁа-яёҢңҮүӨө\w])\s*[:\-]?\s*([А-ЯЁа-яёҢңҮүӨө\w\s\-]+)/iu);
  if (headerMatch) {
    const val = headerMatch[1].trim().split('\n')[0];
    return cleanValue(val);
  }
  const ruMatch = text.match(/(?:меня зовут|я)\s+([А-ЯЁа-яёҢңҮүӨө\w]+(?:\s+[А-ЯЁа-яёҢңҮүӨө\w]+)?)/iu);
  if (ruMatch) {
    const val = cleanValue(ruMatch[1]);
    const firstWord = val.split(/\s+/)[0].toLowerCase();
    const stopWords = ['из', 'хочу', 'буду', 'работаю', 'компания', 'в', 'на', 'с', 'не', 'кызык', 'заказать', 'ооо', 'осоо', 'ип'];
    if (!stopWords.includes(firstWord)) {
      return val;
    }
  }
  const kyMatch = text.match(/(?:атым|менин атым)\s+([А-ЯЁа-яёҢңҮүӨө\w]+)/iu);
  if (kyMatch) {
    return cleanValue(kyMatch[1]);
  }
  const kyMatch2 = text.match(/мен\s+([А-ЯЁа-яёҢңҮүӨө\w]+)(?:\s+(?:болом|боломун|мун))?/iu);
  if (kyMatch2) {
    const val = cleanValue(kyMatch2[1]);
    const stopWords = ['жаңы', 'цемент', 'куруучу', 'иштейм', 'компаниясында', 'бул'];
    if (!stopWords.includes(val.toLowerCase())) {
      return val;
    }
  }
  return '';
}

/**
 * Extracts company using regex.
 */
function extractCompany(text) {
  const headerMatch = text.match(/(?:компаниясынын аты|компаниясы|компания|фирма|company|organization|организация)(?![А-ЯЁа-яёҢңҮүӨө\w])\s*[:\-]?\s*([А-ЯЁа-яёҢңҮүӨө\w\s\-'"«»`]+)/iu);
  if (headerMatch) {
    const val = headerMatch[1].trim().split('\n')[0];
    return cleanValue(val);
  }
  const entityMatch = text.match(/(?:ОсОО|ООО|ИП|ЗАО|АО)\s+['"«»`]?([А-ЯЁа-яёҢңҮүӨө\w\s\-]+)['"«»`]?/iu);
  if (entityMatch) {
    return entityMatch[0].trim();
  }
  const fromCompMatch = text.match(/(?:из компании|представитель компании)\s+['"«»`]?([А-ЯЁа-яёҢңҮүӨө\w\s\-]+)['"«»`]?/iu);
  if (fromCompMatch) {
    return cleanValue(fromCompMatch[1].split('\n')[0]);
  }
  const kyCompMatch = text.match(/([А-ЯЁа-яёҢңҮүӨө\w\s\-'"«»`]+)\s+компаниясында/iu);
  if (kyCompMatch) {
    return cleanValue(kyCompMatch[1]);
  }
  return '';
}

/**
 * Extracts activity using regex.
 */
function extractActivity(text) {
  const headerMatch = text.match(/(?:деятельность|сфера деятельности|activity|профессия|должность)(?![А-ЯЁа-яёҢңҮүӨө\w])\s*[:\-]?\s*([А-ЯЁа-яёҢңҮүӨө\w\s\-()]+)/iu);
  if (headerMatch) {
    return cleanValue(headerMatch[1].trim().split('\n')[0]);
  }
  const zanMatch = text.match(/(?:занимаемся|занимаюсь)\s+([А-ЯЁа-яёҢңҮүӨө\w\s\-()]+)/iu);
  if (zanMatch) {
    return cleanValue(zanMatch[1].trim().split('\n')[0]);
  }
  const kyActMatch = text.match(/([А-ЯЁа-яёҢңҮүӨө\w\-]+)\s+болуп\s+иштейм/iu);
  if (kyActMatch) {
    return cleanValue(kyActMatch[1]);
  }
  const sferMatch = text.match(/(?:сфера|сфера деятельности)\s*[:\-]?\s*([А-ЯЁа-яёҢңҮүӨө\w\s\-()]+)/iu);
  if (sferMatch) {
    return cleanValue(sferMatch[1].trim().split('\n')[0]);
  }
  return '';
}

/**
 * Extracts interest using regex.
 */
function extractInterest(text) {
  const headerMatch = text.match(/(?:заказ|интерес|товар|interest|product|order)(?![А-ЯЁа-яёҢңҮүӨө\w])\s*[:\-]?\s*([А-ЯЁа-яёҢңҮүӨө\w\s\-(),0-9]+)/iu);
  if (headerMatch) {
    return cleanValue(headerMatch[1].trim().split('\n')[0]);
  }
  const wantMatch = text.match(/(?:хотим заказать|хочу заказать|хотим купить|хочу купить|заказать)\s+([А-ЯЁа-яёҢңҮүӨө\w\s\-,0-9]+)/iu);
  if (wantMatch) {
    return cleanValue(wantMatch[1].trim().split('\n')[0]);
  }
  const kyIntMatch = text.match(/([А-ЯЁа-яёҢңҮүӨө\w\s\-]+)\s+кызык\s+болуп\s+жатат/iu);
  if (kyIntMatch) {
    return cleanValue(kyIntMatch[1]);
  }
  const intMatch = text.match(/(?:интересует|интересуют|кызыктырат)\s+([А-ЯЁа-яёҢңҮүӨө\w\s\-,0-9]+)/iu);
  if (intMatch) {
    return cleanValue(intMatch[1].trim().split('\n')[0]);
  }
  return '';
}

/**
 * Extracts service using regex.
 */
function extractService(text) {
  const headerMatch = text.match(/(?:услуга|сервис|service)(?![А-ЯЁа-яёҢңҮүӨө\w])\s*[:\-]?\s*([А-ЯЁа-яёҢңҮүӨө\w\s\-(),]+)/iu);
  if (headerMatch) {
    return cleanValue(headerMatch[1].trim().split('\n')[0]);
  }
  const kyServMatch = text.match(/([А-ЯЁа-яёҢңҮүӨө\w\s\-]+)\s+кызматы(?:\s+керек)?/iu);
  if (kyServMatch) {
    return cleanValue(kyServMatch[1].trim() + " кызматы");
  }
  const ruServMatch = text.match(/(?:доставка|установка|монтаж|консультация|ремонт)\s+([А-ЯЁа-яёҢңҮүӨө\w\s\-()]+)/iu);
  if (ruServMatch) {
    return cleanValue(ruServMatch[0]);
  }
  const keywords = ['доставка', 'жеткирүү', 'орнотуу', 'монтаж', 'установка', 'консультация'];
  for (const kw of keywords) {
    if (new RegExp('\\b' + kw + '\\b', 'iu').test(text)) {
      return kw;
    }
  }
  return '';
}

/**
 * Extracts comment using regex.
 */
function extractComment(text) {
  const headerMatch = text.match(/(?:комментарий|comment|details|детали)(?![А-ЯЁа-яёҢңҮүӨө\w])\s*[:\-]?\s*([А-ЯЁа-яёҢңҮүӨө\w\s\-(),]+)/iu);
  if (headerMatch) {
    return cleanValue(headerMatch[1].trim().split('\n')[0]);
  }
  const sentences = text.split(/[.!?\n]/);
  for (const s of sentences) {
    if (/(?:желательно|пожалуйста|просьба|сураныч|эртерээк|жазып|жөнөтүп|бааларын|прайс|каталог)/iu.test(s)) {
      return cleanValue(s);
    }
  }
  return '';
}

/**
 * Extracts note using regex.
 */
function extractNote(text) {
  const headerMatch = text.match(/(?:заметка|примечание|note)(?![А-ЯЁа-яёҢңҮүӨө\w])\s*[:\-]?\s*([А-ЯЁа-яёҢңҮүӨө\w\s\-(),]+)/iu);
  if (headerMatch) {
    return cleanValue(headerMatch[1].trim().split('\n')[0]);
  }
  const keywords = ['рахмат', 'спасибо', 'благодарю', 'саламатсызбы', 'здравствуйте', 'добрый день'];
  for (const kw of keywords) {
    const match = text.match(new RegExp('(' + kw + ')', 'iu'));
    if (match) {
      return match[1];
    }
  }
  return '';
}

/**
 * Robust offline fallback parser using pattern matching.
 */
function parseMessageOffline(text) {
  return {
    name: extractName(text),
    phone: extractPhone(text),
    company: extractCompany(text),
    activity: extractActivity(text),
    interest: extractInterest(text),
    service: extractService(text),
    comment: extractComment(text),
    note: extractNote(text)
  };
}

const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT = "You are a highly intelligent assistant analyzing a WhatsApp chat history between a Manager (Менеджер) and a Client (Клиент). Extract information strictly following these rules:\n" +
"CRITICAL GLOBAL RULE: Never invent, guess, or embellish facts. Every value you output must be directly supported by the chat text. If information is absent or you are unsure, return an empty string for that field - an empty field is always better than a wrong one. Never copy example values from these instructions unless those exact words actually appear in the chat.\n" +
"1. name: Client's name. EXTREMELY IMPORTANT: Do NOT invent or guess the name. ONLY extract it if the client explicitly introduced themselves (e.g., 'меня зовут Аскар', 'я Асель') OR if the WhatsApp Profile Name looks like a real human name and they didn't specify another one. Otherwise, return an empty string.\n" +
"2. company: Company name ONLY if the client explicitly mentioned it in the chat. Never derive it from the profile name. Otherwise empty string.\n" +
"3. activity: Client's field of activity or profession ONLY if it is stated or clearly evident in the chat. Otherwise empty string.\n" +
"4. interest: THE MOST IMPORTANT FIELD — the specific услуга (service) or product the client needs. Read the ENTIRE conversation carefully and understand what service is actually being discussed. Rules: (a) Prefer real words and details taken directly from the chat (e.g., 'регистрация ОсОО', 'бухгалтерское сопровождение', 'вебинар по налогам', 'семинар 15 марта'). (b) If the client did not name the service explicitly, INFER it from context: what did the manager offer, what questions did the client ask, what problem were they trying to solve — then write the most likely услуга. (c) Write in Russian, a short phrase (1-6 words), optionally with key specifics from the chat such as dates, quantities, or topic. (d) Return an empty string ONLY if the conversation contains no hint of any service or product at all. Never invent a service that has no basis in the chat.\n" +
"5. language: Write exactly 'на кыргызском' ONLY if the client wrote messages in the Kyrgyz language. Otherwise, empty string.\n" +
"6. status: Understand the conversation context. Write 'проведен' IF the manager sent a QR code or payment details AND the client confirmed payment (sent check/receipt). Write 'ждет' IF the LAST message in the chat is from the Client AND it actually requires a reply from the manager (e.g., a question or request, not just 'thank you' or 'goodbye'). Otherwise, leave empty string.\n" +
"7. unanswered: Understand the conversation context. Write exactly 'не отвечает' IF the LAST message in the chat is from the Manager AND it expects a response from the client (e.g., asking a question), but the client has not replied. If the conversation naturally ended (e.g., saying goodbye), leave empty string.";

// FIX: hard timeout so an unresponsive API can never freeze the bot
const API_TIMEOUT_MS = 120000;
const MAX_RETRIES = 3;

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Встроенный API-ключ (codex-free.com) — работает из коробки; config.txt и переменные окружения могут переопределить
const BUILTIN_API_KEY = 'sk-fp-70704066-QQKPLcnBVmaxPqBjmL0hCi1BuBVCJpkbknmE6oat41JrD1Hz';
let MODEL_OVERRIDE = '';
let CACHED_CONFIG = null;
function setModel(m) {
  MODEL_OVERRIDE = String(m || '').trim();
  CACHED_CONFIG = null;
}

function loadConfig() {
  if (CACHED_CONFIG && !MODEL_OVERRIDE) return applyModel(CACHED_CONFIG);
  const config = readConfigFile();
  CACHED_CONFIG = config;
  return applyModel(config);
}

function applyModel(base) {
  const config = Object.assign({}, base);
  if (MODEL_OVERRIDE) {
    if (MODEL_OVERRIDE.startsWith('gpt')) { config.PROVIDER = 'openai'; config.OPENAI_MODEL = MODEL_OVERRIDE; }
    else { config.PROVIDER = 'claude'; config.CLAUDE_MODEL = MODEL_OVERRIDE; }
  }
  return config;
}

function readConfigFile() {
  const config = {
    PROVIDER: 'claude',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || BUILTIN_API_KEY,
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || BUILTIN_API_KEY,
    OPENAI_ENDPOINT: process.env.OPENAI_ENDPOINT || 'https://codex-free.com/v1/chat/completions',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-5.5',
    CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-opus-4-8',
    CLAUDE_ENDPOINT: process.env.CLAUDE_ENDPOINT || 'https://codex-free.com/v1/messages'
  };
  
  try {
    const configPath = path.join(process.cwd(), 'config.txt');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim();
          if (config.hasOwnProperty(key)) {
            config[key] = val;
          }
        }
      });
    }
  } catch(e) {
    console.warn('Could not read config.txt, using defaults');
  }
  return config;
}

async function parseWithGemini(text, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ parts: [{ text: text }] }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          company: { type: "STRING" },
          activity: { type: "STRING" },
          interest: { type: "STRING" },
          language: { type: "STRING" },
          status: { type: "STRING" },
          unanswered: { type: "STRING" }
        },
        required: ["name", "company", "activity", "interest", "language", "status", "unanswered"]
      }
    }
  };

  let retries = 0;
  while (retries < MAX_RETRIES) {
    let response;
    try {
      response = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }, API_TIMEOUT_MS);
    } catch (err) {
      if (err.name === 'AbortError' && retries < MAX_RETRIES - 1) {
        console.log(`⏱️ Gemini API не ответил за ${API_TIMEOUT_MS / 1000} сек. Повторная попытка...`);
        retries++; continue;
      }
      throw err;
    }
    if (!response.ok) {
      // FIX: retry on rate limits AND temporary server errors (5xx)
      if ((response.status === 429 || response.status >= 500) && retries < MAX_RETRIES - 1) {
        console.log(`⏳ Gemini API ошибка ${response.status}. Повтор через 7 секунд...`);
        await new Promise(r => setTimeout(r, 7000));
        retries++; continue;
      }
      throw new Error(`Gemini error: ${await response.text()}`);
    }
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  }
  throw new Error("Max retries Gemini API");
}

async function parseWithOpenAI(text, apiKey, endpoint, model) {
  const url = endpoint;
  const schema = {
    type: "json_schema",
    json_schema: {
      name: "whatsapp_extraction",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          company: { type: "string" },
          activity: { type: "string" },
          interest: { type: "string" },
          language: { type: "string" },
          status: { type: "string" },
          unanswered: { type: "string" }
        },
        required: ["name", "company", "activity", "interest", "language", "status", "unanswered"],
        additionalProperties: false
      },
      strict: true
    }
  };

  const body = {
    model: model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text }
    ],
    response_format: schema
  };

  let retries = 0;
  while (retries < MAX_RETRIES) {
    let response;
    try {
      response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }, API_TIMEOUT_MS);
    } catch (err) {
      if (err.name === 'AbortError' && retries < MAX_RETRIES - 1) {
        console.log(`⏱️ API не ответил за ${API_TIMEOUT_MS / 1000} сек. Повторная попытка...`);
        retries++; continue;
      }
      throw err;
    }
    if (!response.ok) {
      // FIX: retry on rate limits AND temporary server errors (5xx)
      if ((response.status === 429 || response.status >= 500) && retries < MAX_RETRIES - 1) {
        console.log(`⏳ API ошибка ${response.status} (сервер недоступен). Повтор через 7 секунд...`);
        await new Promise(r => setTimeout(r, 7000));
        retries++; continue;
      }
      throw new Error(`OpenAI error: ${await response.text()}`);
    }
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }
  throw new Error("Max retries OpenAI API");
}

async function parseWithClaude(text, apiKey, model, endpoint) {
  const url = endpoint || 'https://api.anthropic.com/v1/messages';
  const toolSchema = {
    name: "extract_whatsapp_data",
    description: "Extract structured data from WhatsApp chat",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        company: { type: "string" },
        activity: { type: "string" },
        interest: { type: "string" },
        language: { type: "string" },
        status: { type: "string" },
        unanswered: { type: "string" }
      },
      required: ["name", "company", "activity", "interest", "language", "status", "unanswered"]
    }
  };

  const body = {
    model: model, // FIX: was hardcoded, now uses CLAUDE_MODEL from config.txt
    max_tokens: 4096,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
    tools: [toolSchema],
    tool_choice: { type: "tool", name: "extract_whatsapp_data" }
  };

  let retries = 0;
  while (retries < MAX_RETRIES) {
    let response;
    try {
      response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      }, API_TIMEOUT_MS);
    } catch (err) {
      if (err.name === 'AbortError' && retries < MAX_RETRIES - 1) {
        console.log(`⏱️ Claude API не ответил за ${API_TIMEOUT_MS / 1000} сек. Повторная попытка...`);
        retries++; continue;
      }
      throw err;
    }
    if (!response.ok) {
      // FIX: retry on rate limits AND temporary server errors (5xx)
      if ((response.status === 429 || response.status >= 500) && retries < MAX_RETRIES - 1) {
        console.log(`⏳ Claude API ошибка ${response.status}. Повтор через 7 секунд...`);
        await new Promise(r => setTimeout(r, 7000));
        retries++; continue;
      }
      throw new Error(`Claude error: ${await response.text()}`);
    }
    const data = await response.json();
    const toolCall = data.content.find(c => c.type === 'tool_use');
    if (!toolCall) throw new Error("Claude did not return tool call");
    return toolCall.input;
  }
  throw new Error("Max retries Claude API");
}

/**
 * Parses unstructured conversational WhatsApp messages.
 * Routes to the selected AI provider based on config.txt.
 * 
 * @param {string} text - The input message text.
 * @returns {Promise<object>} The parsed fields.
 */
async function parseMessage(text) {
  const config = loadConfig();
  const provider = (config.PROVIDER || 'gemini').toLowerCase();
  
  try {
    if (provider === 'openai' && config.OPENAI_API_KEY && config.OPENAI_API_KEY !== 'sk-ВашКлючОтChatGPTЗдесь') {
      return await parseWithOpenAI(text, config.OPENAI_API_KEY, config.OPENAI_ENDPOINT, config.OPENAI_MODEL);
    } else if (provider === 'claude' && config.CLAUDE_API_KEY && config.CLAUDE_API_KEY !== 'sk-ant-ВашКлючОтКлодаЗдесь') {
      // FIX: proxy keys are fine when CLAUDE_ENDPOINT points to the proxy.
      // Reroute only if a non-Anthropic key targets the official Anthropic API.
      if (!config.CLAUDE_API_KEY.startsWith('sk-ant-') && config.CLAUDE_ENDPOINT.includes('api.anthropic.com')) {
        console.warn('⚠️ CLAUDE_API_KEY — не ключ Anthropic, а CLAUDE_ENDPOINT указывает на api.anthropic.com. Отправляю через OPENAI_ENDPOINT...');
        return await parseWithOpenAI(text, config.CLAUDE_API_KEY, config.OPENAI_ENDPOINT, config.OPENAI_MODEL);
      }
      return await parseWithClaude(text, config.CLAUDE_API_KEY, config.CLAUDE_MODEL, config.CLAUDE_ENDPOINT);
    } else if (provider === 'gemini' && config.GEMINI_API_KEY && config.GEMINI_API_KEY !== 'ВашКлючОтGoogleЗдесь') {
      return await parseWithGemini(text, config.GEMINI_API_KEY);
    } else {
      console.warn(`No valid API key found for provider '${provider}' in config.txt, falling back to offline mode.`);
      return parseMessageOffline(text);
    }
  } catch (err) {
    console.warn(`API call failed for ${provider}, falling back to offline parser:`, err.message);
    return parseMessageOffline(text);
  }
}

module.exports = { parseMessage, setModel };
