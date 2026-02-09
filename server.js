// Simple AI proxy API that mimics PenguinMod PangAI extension behavior.
// Designed for Render.com (HTTP server + PORT env).

'use strict';

const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const API_URL = process.env.POLLINATIONS_TEXT_API_URL || 'https://text.pollinations.ai/openai';
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY || 'sk_wiHJAIai35eLAJS9jY3NY0SGmbEaJ6Ke';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'llama-3.1-8b-instruct-fast';
const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_BODY_BYTES = 1_000_000;
const CONNECTION_TTL_MS = 1 * 60 * 1000;
const SELF_PING_URL = process.env.SELF_PING_URL || '';
const SELF_PING_INTERVAL_MS = 5 * 60 * 1000;

const connections = {};

const PROMPTS = {
  'Gibberish (probably does not work) By: u/Fkquaps':
    'From now on you will respond everything replacing every letter of the alphabet with it rotated 13 places forward ...',
  'PenguinBot (Pre Circlelabs) By: JeremyGamer13':
    'You are PenguinBot.\n\nYou live in Antarctica ...',
  'Stand Up Comedian (Character) By: devisasari':
    'I want you to act as a stand-up comedian. I will provide you with some topics ...',
  'Lunatic (Character) By: devisasari':
    "I want you to act as a lunatic. The lunatic's sentences are meaningless ...",
  'Lua Console From awesomegptprompts.com':
    'I want you to act as a lua console. I will type code and you will reply with what the lua console should show ...',
  'Advertiser (Character) By: devisasari':
    'I want you to act as an advertiser. You will create a campaign ...',
  'Minecraft Commander (Idea from Greedy Allay)':
    'I want you to act as a Minecraft AI command creator ...'
};

const MODEL_LIST = [
  'llama-4-scout-17b-16e-instruct',
  'llama-3.3-70b-instruct-fp8-fast',
  'llama-3.1-8b-instruct-fast',
  'gemma-3-12b-it',
  'mistral-small-3.1-24b-instruct',
  'qwq-32b',
  'qwen2.5-coder-32b-instruct',
  'llama-guard-3-8b',
  'deepseek-r1-distill-qwen-32b',
  'llama-3.2-1b-instruct',
  'llama-3.2-3b-instruct',
  'llama-3.2-11b-vision-instruct',
  'llama-3.1-8b-instruct-awq',
  'llama-3.1-8b-instruct-fp8',
  'llama-3.1-8b-instruct',
  'meta-llama-3-8b-instruct',
  'llama-3-8b-instruct-awq',
  'una-cybertron-7b-v2-bf16',
  'llama-3-8b-instruct',
  'mistral-7b-instruct-v0.2',
  'gemma-7b-it-lora',
  'gemma-2b-it-lora',
  'llama-2-7b-chat-hf-lora',
  'gemma-7b-it',
  'starling-lm-7b-beta',
  'hermes-2-pro-mistral-7b',
  'mistral-7b-instruct-v0.2-lora',
  'qwen1.5-1.8b-chat',
  'phi-2',
  'tinyllama-1.1b-chat-v1.0',
  'qwen1.5-14b-chat-awq',
  'qwen1.5-7b-chat-awq',
  'qwen1.5-0.5b-chat',
  'discolm-german-7b-v1-awq',
  'falcon-7b-instruct',
  'openchat-3.5-0106',
  'sqlcoder-7b-2',
  'deepseek-math-7b-instruct',
  'deepseek-coder-6.7b-instruct-awq',
  'deepseek-coder-6.7b-base-awq',
  'llamaguard-7b-awq',
  'neural-chat-7b-v3-1-awq',
  'openhermes-2.5-mistral-7b-awq',
  'llama-2-13b-chat-awq',
  'mistral-7b-instruct-v0.1-awq',
  'zephyr-7b-beta-awq',
  'llama-2-7b-chat-fp16',
  'mistral-7b-instruct-v0.1',
  'llama-2-7b-chat-int8',
  'llama-3.1-70b-instruct'
];

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function sendError(res, message, code = 'error') {
  return sendJson(res, 200, { error: message, status: 'error', code });
}

const ERROR_CODES = {
  CONNECTION_REQUIRED: 1000,
  CONNECTION_INVALID: 1001,
  CHATID_REQUIRED: 1002,
  INVALID_JSON: 1003,
  BODY_TOO_LARGE: 1004,
  NOT_FOUND: 1005,
  SERVER_ERROR: 1006
};

function sendText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(text);
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    let chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        const err = new Error('Body too large');
        err.code = 'body_too_large';
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        const err = new Error('Invalid JSON');
        err.code = 'invalid_json';
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getPrompt(type) {
  return PROMPTS[type] || '';
}

async function processImage(connection, promptText) {
  if (!connection.nextImage) return { role: 'user', content: promptText };

  try {
    const response = await fetch(connection.nextImage);
    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return {
      role: 'user',
      content: [
        { type: 'text', text: promptText },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    };
  } catch (_) {
    return { role: 'user', content: promptText };
  } finally {
    connection.nextImage = null;
  }
}

async function callAi(model, messages) {
  const body = { model, messages };
  const headers = { 'Content-Type': 'application/json' };
  if (POLLINATIONS_API_KEY) {
    headers.Authorization = `Bearer ${POLLINATIONS_API_KEY}`;
  }
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }

  const reply = data?.choices?.[0]?.message?.content;
  return {
    reply: reply || 'Error: no response',
    raw: data,
    status: response.status
  };
}

function ensureChat(connection, chatId) {
  if (!connection.histories[chatId]) connection.histories[chatId] = [];
}

function parseChatId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function stripFormatting(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  out = out.replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, ''));
  out = out.replace(/`([^`]+)`/g, '$1');
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/\*([^*]+)\*/g, '$1');
  out = out.replace(/__([^_]+)__/g, '$1');
  out = out.replace(/_([^_]+)_/g, '$1');
  out = out.replace(/~~([^~]+)~~/g, '$1');
  out = out.replace(/^#{1,6}\s+/gm, '');
  out = out.replace(/^\s*[-*+]\s+/gm, '');
  out = out.replace(/^\s*\d+\.\s+/gm, '');
  out = out.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
  return out;
}

function scheduleConnectionExpiry(connection) {
  if (connection.expiryTimer) clearTimeout(connection.expiryTimer);
  connection.expiryTimer = setTimeout(() => {
    delete connections[connection.id];
  }, CONNECTION_TTL_MS);
  connection.expiryTimer.unref();
}

function createConnection() {
  const id = crypto.randomUUID();
  connections[id] = {
    id,
    model: DEFAULT_MODEL,
    histories: {},
    nextImage: null,
    lastUsed: Date.now(),
    expiryTimer: null,
    formattingEnabled: true
  };
  scheduleConnectionExpiry(connections[id]);
  return connections[id];
}

function touchConnection(connection) {
  connection.lastUsed = Date.now();
  scheduleConnectionExpiry(connection);
}

function parseConnectionId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function getConnectionId(url, body) {
  return parseConnectionId(
    body.connectionId || body.connectionID || url.searchParams.get('connectionId') || url.searchParams.get('connectionID') || ''
  );
}

function requireConnection(url, body, res) {
  const connectionId = getConnectionId(url, body);
  if (!connectionId) {
    sendError(res, 'connectionId required. Call /createconnection first.', ERROR_CODES.CONNECTION_REQUIRED);
    return null;
  }
  const connection = connections[connectionId];
  if (!connection) {
    sendError(res, 'connectionId not valid. Call /createconnection again.', ERROR_CODES.CONNECTION_INVALID);
    return null;
  }
  touchConnection(connection);
  return connection;
}

// Per-connection expiry timers are used instead of coarse interval cleanup.

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/health') {
      return sendJson(res, 200, { ok: true, apiUrl: API_URL, connections: Object.keys(connections).length });
    }

    if (req.method === 'GET' && path === '/meta') {
      return sendJson(res, 200, {
        models: MODEL_LIST,
        prompts: Object.keys(PROMPTS)
      });
    }

    if ((req.method === 'POST' || req.method === 'GET') && path === '/createconnection') {
      const connection = createConnection();
      return sendJson(res, 200, { connectionId: connection.id, model: connection.model });
    }

    if (req.method === 'POST' && path === '/keepalive') {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      return sendJson(res, 200, { ok: true, connectionId: connection.id, lastUsed: connection.lastUsed });
    }

    if (req.method === 'POST' && path === '/formatting') {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const enabledRaw = body.enabled;
      const enabled = typeof enabledRaw === 'boolean' ? enabledRaw : true;
      connection.formattingEnabled = enabled;
      return sendJson(res, 200, { ok: true, formattingEnabled: connection.formattingEnabled });
    }

    if (req.method === 'GET' && path === '/model') {
      const connectionId = parseConnectionId(url.searchParams.get('connectionId') || url.searchParams.get('connectionID') || '');
      if (!connectionId) return sendError(res, 'connectionId required. Call /createconnection first.', ERROR_CODES.CONNECTION_REQUIRED);
      const connection = connections[connectionId];
      if (!connection) return sendError(res, 'connectionId not valid. Call /createconnection again.', ERROR_CODES.CONNECTION_INVALID);
      touchConnection(connection);
      return sendJson(res, 200, { model: connection.model });
    }

    if (req.method === 'POST' && path === '/model') {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const next = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : null;
      if (next) connection.model = next;
      return sendJson(res, 200, { model: connection.model });
    }

    if (req.method === 'GET' && path === '/prompt') {
      const type = url.searchParams.get('type') || '';
      return sendJson(res, 200, { prompt: getPrompt(type) });
    }

    if (req.method === 'POST' && (path === '/text-no-context' || path === '/op/generate_text_nocontext')) {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const prompt = body.prompt || body.PROMPT || '';
      const userMessage = await processImage(connection, String(prompt));
      const { reply, raw, status } = await callAi(connection.model, [userMessage]);
      const finalReply = connection.formattingEnabled ? reply : stripFormatting(reply);
      return sendJson(res, 200, { reply: finalReply, status, raw });
    }

    if (req.method === 'POST' && (path === '/chat/send' || path === '/op/send_text_to_chat')) {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const prompt = body.prompt || body.PROMPT || '';
      const chatId = parseChatId(body.chatId || body.chatID || '');
      if (!chatId) return sendError(res, 'chatId required', ERROR_CODES.CHATID_REQUIRED);

      ensureChat(connection, chatId);
      const userMessage = await processImage(connection, String(prompt));
      connection.histories[chatId].push(userMessage);

      const { reply, raw, status } = await callAi(connection.model, connection.histories[chatId]);
      const finalReply = connection.formattingEnabled ? reply : stripFormatting(reply);
      connection.histories[chatId].push({ role: 'assistant', content: finalReply });

      return sendJson(res, 200, { reply: finalReply, status, raw });
    }

    if (req.method === 'POST' && (path === '/chat/attach-image' || path === '/op/attach_image')) {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const urlValue = body.url || body.URL || '';
      connection.nextImage = String(urlValue || '');
      return sendJson(res, 200, { ok: true, nextImage: !!connection.nextImage });
    }

    if (req.method === 'POST' && (path === '/chat/inform' || path === '/op/inform_chat')) {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const chatId = parseChatId(body.chatId || body.chatID || '');
      const inform = body.inform || '';
      if (!chatId) return sendError(res, 'chatId required', ERROR_CODES.CHATID_REQUIRED);
      ensureChat(connection, chatId);
      connection.histories[chatId].push({ role: 'system', content: String(inform) });
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && (path === '/chat/create' || path === '/op/create_chatbot')) {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const chatId = parseChatId(body.chatId || body.chatID || '');
      if (!chatId) return sendError(res, 'chatId required', ERROR_CODES.CHATID_REQUIRED);
      ensureChat(connection, chatId);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && (path === '/chat/delete' || path === '/op/delete_chatbot')) {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const chatId = parseChatId(body.chatId || body.chatID || '');
      if (!chatId) return sendError(res, 'chatId required', ERROR_CODES.CHATID_REQUIRED);
      delete connection.histories[chatId];
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && (path === '/chat/reset' || path === '/op/reset_chat')) {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const chatId = parseChatId(body.chatId || body.chatID || '');
      if (!chatId) return sendError(res, 'chatId required', ERROR_CODES.CHATID_REQUIRED);
      connection.histories[chatId] = [];
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && (path === '/chat/history' || path === '/op/get_chat_history')) {
      const connectionId = parseConnectionId(url.searchParams.get('connectionId') || url.searchParams.get('connectionID') || '');
      if (!connectionId) return sendError(res, 'connectionId required. Call /createconnection first.', ERROR_CODES.CONNECTION_REQUIRED);
      const connection = connections[connectionId];
      if (!connection) return sendError(res, 'connectionId not valid. Call /createconnection again.', ERROR_CODES.CONNECTION_INVALID);
      touchConnection(connection);
      const chatId = parseChatId(url.searchParams.get('chatId') || url.searchParams.get('chatID') || '');
      if (!chatId) return sendError(res, 'chatId required', ERROR_CODES.CHATID_REQUIRED);
      const history = connection.histories[chatId] || [];
      return sendJson(res, 200, { history, historyJson: JSON.stringify(history) });
    }

    if (req.method === 'POST' && (path === '/chat/import-history' || path === '/op/import_history')) {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const chatId = parseChatId(body.chatId || body.chatID || '');
      const json = body.json || body.JSON || '[]';
      if (!chatId) return sendError(res, 'chatId required', ERROR_CODES.CHATID_REQUIRED);
      try {
        connection.histories[chatId] = JSON.parse(String(json));
        return sendJson(res, 200, { ok: true });
      } catch (_) {
        return sendError(res, 'Invalid JSON for history', ERROR_CODES.INVALID_JSON);
      }
    }

    if (req.method === 'POST' && (path === '/chat/import-chats' || path === '/op/import_chats_merge')) {
      const body = await readJsonBody(req);
      const connection = requireConnection(url, body, res);
      if (!connection) return;
      const json = body.json || body.JSON || '{}';
      const merge = body.merge || body.MERGE || 'Merge/Update existing chats';
      try {
        const newChats = JSON.parse(String(json));
        if (merge === 'Remove all chatbots and import') {
          connection.histories = newChats;
        } else {
          for (const id of Object.keys(newChats)) {
            connection.histories[id] = newChats[id];
          }
        }
        return sendJson(res, 200, { ok: true });
      } catch (_) {
        return sendError(res, 'Invalid JSON for chats', ERROR_CODES.INVALID_JSON);
      }
    }

    if (req.method === 'GET' && (path === '/chats/all' || path === '/op/all_chats')) {
      const connectionId = parseConnectionId(url.searchParams.get('connectionId') || url.searchParams.get('connectionID') || '');
      if (!connectionId) return sendError(res, 'connectionId required. Call /createconnection first.', ERROR_CODES.CONNECTION_REQUIRED);
      const connection = connections[connectionId];
      if (!connection) return sendError(res, 'connectionId not valid. Call /createconnection again.', ERROR_CODES.CONNECTION_INVALID);
      touchConnection(connection);
      return sendJson(res, 200, { chats: connection.histories, chatsJson: JSON.stringify(connection.histories) });
    }

    if (req.method === 'GET' && (path === '/chats/active' || path === '/op/active_chats')) {
      const connectionId = parseConnectionId(url.searchParams.get('connectionId') || url.searchParams.get('connectionID') || '');
      if (!connectionId) return sendError(res, 'connectionId required. Call /createconnection first.', ERROR_CODES.CONNECTION_REQUIRED);
      const connection = connections[connectionId];
      if (!connection) return sendError(res, 'connectionId not valid. Call /createconnection again.', ERROR_CODES.CONNECTION_INVALID);
      touchConnection(connection);
      return sendJson(res, 200, { active: Object.keys(connection.histories) });
    }

    if (req.method === 'GET' && (path === '/image' || path === '/op/generate_image')) {
      const connectionId = parseConnectionId(url.searchParams.get('connectionId') || url.searchParams.get('connectionID') || '');
      if (!connectionId) return sendError(res, 'connectionId required. Call /createconnection first.', ERROR_CODES.CONNECTION_REQUIRED);
      const connection = connections[connectionId];
      if (!connection) return sendError(res, 'connectionId not valid. Call /createconnection again.', ERROR_CODES.CONNECTION_INVALID);
      touchConnection(connection);
      const prompt = url.searchParams.get('prompt') || url.searchParams.get('PROMPT') || '';
      const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(String(prompt))}?height=1000&width=1000&enhance=true&nologo=true&model=lyriel-1.5-clean`;
      return sendJson(res, 200, { url: imgUrl });
    }

    return sendError(res, 'Not found', ERROR_CODES.NOT_FOUND);
  } catch (err) {
    if (err && err.code === 'invalid_json') {
      return sendError(res, 'Invalid JSON', ERROR_CODES.INVALID_JSON);
    }
    if (err && err.code === 'body_too_large') {
      return sendError(res, 'Body too large', ERROR_CODES.BODY_TOO_LARGE);
    }
    return sendError(res, err.message || 'Server error', ERROR_CODES.SERVER_ERROR);
  }
});

server.listen(PORT, () => {
  console.log(`AI API proxy running on port ${PORT}`);
});

if (SELF_PING_URL) {
  setInterval(async () => {
    try {
      await fetch(SELF_PING_URL, { method: 'GET' });
    } catch (_) {
      // Ignore ping errors to avoid crashing.
    }
  }, SELF_PING_INTERVAL_MS).unref();
}
