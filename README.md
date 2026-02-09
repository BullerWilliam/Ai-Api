# Ai-Api

Lightweight Node.js HTTP server that mimics the PangAI PenguinMod extension and proxies to an upstream AI API. Designed for Render.com.

## Run

```powershell
$env:POLLINATIONS_TEXT_API_URL='https://text.pollinations.ai/openai'
$env:POLLINATIONS_API_KEY=''
$env:DEFAULT_MODEL='openai'
node server.js
```

Server listens on `PORT` (default `3000`).

## Connections

Before using most endpoints, you must create a connection. Each connection has its own model selection, chat histories, and image attachment. If a connection is unused for **1 minute**, the server deletes it automatically. Use `POST /keepalive` to refresh the timer.

## How To Read The Examples

Each endpoint includes:
- What it does and why you�d use it.
- Parameters you can insert.
- Expected output and why it looks that way.
- How to use it.

All examples assume `http://localhost:3000`.

## Error Format And Codes

All errors return HTTP 200 with this JSON shape:

```json
{ "error": "message", "status": "error", "code": 1000 }
```

Common codes:
- `1000` – missing `connectionId` (`connection_required`).
- `1001` – unknown or expired `connectionId` (`connection_invalid`).
- `1002` – missing `chatId` (`chatid_required`).
- `1003` – body could not be parsed or invalid JSON provided to import endpoints (`invalid_json`).
- `1004` – request body exceeded server limit (`body_too_large`).
- `1005` – unknown endpoint (`not_found`).
- `1006` – unexpected server error (`server_error`).
- `1007` – model not found (`model_invalid`).
- `1008` – upstream API error (`upstream_error`).

## Core Endpoints

### POST /createconnection

Purpose: create a per-user connection (model + chats + image attachment).
Why: every stateful endpoint requires a `connectionId` from this call.
Parameters: none.
Expected output: `{ connectionId, model }` because the server creates a new connection with the default model.
How to use: call once per user session; store the `connectionId`.

```bash
curl -X POST http://localhost:3000/createconnection
```

```bash
curl -X POST http://localhost:3000/createconnection \
  -H "Accept: application/json"
```

### POST /keepalive

Purpose: refresh a connection�s idle timer.
Why: keep a connection alive if the user is idle.
Parameters:
- `connectionId` string.
Expected output: `{ ok: true, connectionId, lastUsed }` because the server touches the connection and returns its updated timestamp.
How to use: call every 30�50 seconds if you want to prevent cleanup.

```bash
curl -X POST http://localhost:3000/keepalive \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID"}'
```

```bash
curl -X POST http://localhost:3000/keepalive \
  -H "Content-Type: application/json" \
  -d '{"connectionID":"YOUR_ID"}'
```

### POST /formatting

Purpose: enable or disable formatting in AI replies for a connection.
Why: disable markdown/code formatting if you only want plain text.
Parameters:
- `connectionId` string.
- `enabled` boolean. `true` keeps formatting, `false` strips it.
Expected output: `{ ok: true, formattingEnabled }` because the server stores the flag per connection.
How to use: set once per session; affects `/text-no-context` and `/chat/send`.

```bash
curl -X POST http://localhost:3000/formatting \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","enabled":false}'
```

```bash
curl -X POST http://localhost:3000/formatting \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","enabled":true}'
```

### GET /health

Purpose: quick health check and server status.
Why: verify Render is up.
Parameters: none.
Expected output: `{ ok: true, apiUrl, connections }` because the server returns its upstream API and active connection count.
How to use: call from a browser or monitoring tool.

```bash
curl http://localhost:3000/health
```

```bash
curl -H "Accept: application/json" http://localhost:3000/health
```

### GET /meta

Purpose: list available model IDs and built-in prompt names.
Why: populate dropdowns in a client UI.
Parameters: none.
Expected output: `{ models, prompts }` because the server exposes its static lists.
How to use: call once at startup to cache lists client-side.

```bash
curl http://localhost:3000/meta
```

```bash
curl -H "Accept: application/json" http://localhost:3000/meta
```

### GET /model

Purpose: read the current model selection for a connection.
Why: confirm the model before sending requests.
Parameters:
- `connectionId` query string.
Expected output: `{ model }` because the server stores the selected model per connection.
How to use: call after a model change or during diagnostics.

```bash
curl "http://localhost:3000/model?connectionId=YOUR_ID"
```

```bash
curl -H "Accept: application/json" "http://localhost:3000/model?connectionId=YOUR_ID"
```

### POST /model

Purpose: set the current model for a connection.
Why: switch models without restarting the server.
Parameters:
- `connectionId` string.
- `model` string. Any model ID from `/meta`.
Expected output: `{ model }` because the server updates its per‑connection model.
How to use: send once, then keep using `/chat/send` or `/text-no-context` with the same connection. With Pollinations, `openai` is a safe default.

```bash
curl -X POST http://localhost:3000/model \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","model":"openai"}'
```

```bash
curl -X POST http://localhost:3000/model \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","model":"gemma-3-12b-it"}'
```

### GET /prompt?type=...

Purpose: fetch a built-in prompt template string.
Why: use it to seed a system message or prefill a prompt field.
Parameters:
- `type` query string. One of the prompt names from `/meta`.
Expected output: `{ prompt }` because the server maps names to text.
How to use: insert the returned prompt into your UI or send it as a system message via `/chat/inform`.

```bash
curl "http://localhost:3000/prompt?type=PenguinBot%20(Pre%20Circlelabs)%20By:%20JeremyGamer13"
```

```bash
curl "http://localhost:3000/prompt?type=Stand%20Up%20Comedian%20(Character)%20By:%20devisasari"
```

### POST /text-no-context

Purpose: single-turn completion with no chat history.
Why: quick one-off prompts without state.
Parameters:
- `connectionId` string.
- `prompt` or `PROMPT` string.
Expected output: `{ reply, status, raw }` because the server forwards your prompt to the upstream API and returns the response content plus raw JSON.
How to use: use a valid `connectionId` and send your prompt.

```bash
curl -X POST http://localhost:3000/text-no-context \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","prompt":"Hello there"}'
```

```bash
curl -X POST http://localhost:3000/text-no-context \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","PROMPT":"Write a haiku about snow"}'
```

### POST /chat/send

Purpose: send a message to a named chat with history.
Why: multi-turn conversations.
Parameters:
- `connectionId` string.
- `prompt` or `PROMPT` string.
- `chatId` or `chatID` string.
Expected output: `{ reply, status, raw }` because the server appends your message, calls the upstream API, then stores the assistant reply.
How to use: keep reusing the same `chatId` to preserve context.

```bash
curl -X POST http://localhost:3000/chat/send \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","prompt":"Hi","chatId":"demo"}'
```

```bash
curl -X POST http://localhost:3000/chat/send \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","PROMPT":"Continue","chatID":"demo"}'
```

### POST /chat/attach-image

Purpose: attach an image URL to the next request only.
Why: enable multimodal prompts for vision models.
Parameters:
- `connectionId` string.
- `url` or `URL` string. A publicly accessible image URL.
Expected output: `{ ok: true, nextImage: true }` because the server stores the URL in the connection for the next call only.
How to use: call this immediately before `/text-no-context` or `/chat/send`.

```bash
curl -X POST http://localhost:3000/chat/attach-image \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","url":"https://example.com/cat.png"}'
```

```bash
curl -X POST http://localhost:3000/chat/attach-image \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","URL":"https://example.com/dog.jpg"}'
```

### POST /chat/inform

Purpose: add a system message to a chat.
Why: set instructions or persona for a chat.
Parameters:
- `connectionId` string.
- `chatId` or `chatID` string.
- `inform` string.
Expected output: `{ ok: true }` because the server stores a system message in the chat history.
How to use: call once per chat, or whenever you want to change behavior.

```bash
curl -X POST http://localhost:3000/chat/inform \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatId":"demo","inform":"You are helpful."}'
```

```bash
curl -X POST http://localhost:3000/chat/inform \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatID":"demo","inform":"Answer in Spanish."}'
```

### POST /chat/create

Purpose: create a chat entry with empty history.
Why: pre-create chats before first message.
Parameters:
- `connectionId` string.
- `chatId` or `chatID` string.
Expected output: `{ ok: true }` because the server allocates a new history array for the connection.
How to use: optional; `/chat/send` will create chats automatically.

```bash
curl -X POST http://localhost:3000/chat/create \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatId":"demo"}'
```

```bash
curl -X POST http://localhost:3000/chat/create \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatID":"demo2"}'
```

### POST /chat/delete

Purpose: delete a chat and its history.
Why: remove unused or sensitive conversations.
Parameters:
- `connectionId` string.
- `chatId` or `chatID` string.
Expected output: `{ ok: true }` because the server removes the chat key for that connection.
How to use: call to free memory or reset completely.

```bash
curl -X POST http://localhost:3000/chat/delete \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatId":"demo"}'
```

```bash
curl -X POST http://localhost:3000/chat/delete \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatID":"demo2"}'
```

### POST /chat/reset

Purpose: clear a chat history but keep the chat ID.
Why: restart a conversation without deleting the ID.
Parameters:
- `connectionId` string.
- `chatId` or `chatID` string.
Expected output: `{ ok: true }` because the server replaces history with an empty array.
How to use: call before re-seeding the chat with `/chat/inform`.

```bash
curl -X POST http://localhost:3000/chat/reset \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatId":"demo"}'
```

```bash
curl -X POST http://localhost:3000/chat/reset \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatID":"demo2"}'
```

### GET /chat/history?chatId=...&connectionId=...

Purpose: read a chat�s history.
Why: debug state or sync history to a client.
Parameters:
- `connectionId` query string.
- `chatId` or `chatID` query string.
Expected output: `{ history, historyJson }` because the server returns the array and its JSON string.
How to use: request after messages to display or export.

```bash
curl "http://localhost:3000/chat/history?connectionId=YOUR_ID&chatId=demo"
```

```bash
curl "http://localhost:3000/chat/history?connectionId=YOUR_ID&chatID=demo2"
```

### POST /chat/import-history

Purpose: replace a chat history with a JSON string.
Why: restore from backups or imported sessions.
Parameters:
- `connectionId` string.
- `chatId` or `chatID` string.
- `json` string containing an array of messages.
Expected output: `{ ok: true }` because the server parses and stores the provided history.
How to use: ensure `json` is a valid JSON string.

```bash
curl -X POST http://localhost:3000/chat/import-history \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatId":"demo","json":"[]"}'
```

```bash
curl -X POST http://localhost:3000/chat/import-history \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatID":"demo","json":"[{\\"role\\":\\"user\\",\\"content\\":\\"hi\\"}]"}'
```

### POST /chat/import-chats

Purpose: import multiple chats at once.
Why: migrate or restore all chats for a connection.
Parameters:
- `connectionId` string.
- `json` string containing an object of chatId to history arrays.
- `merge` string. Use `Merge/Update existing chats` or `Remove all chatbots and import`.
Expected output: `{ ok: true }` because the server merges or replaces in-memory chats for that connection.
How to use: set `merge` to replace all chats when you want a clean import.

```bash
curl -X POST http://localhost:3000/chat/import-chats \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","json":"{\\"a\\":[{\\"role\\":\\"user\\",\\"content\\":\\"hi\\"}]}"}'
```

```bash
curl -X POST http://localhost:3000/chat/import-chats \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","json":"{\\"b\\":[]}","merge":"Remove all chatbots and import"}'
```

### GET /chats/all?connectionId=...

Purpose: return every chat and history for a connection.
Why: export or debug all state.
Parameters:
- `connectionId` query string.
Expected output: `{ chats, chatsJson }` because the server returns the full object plus a JSON string.
How to use: call for backup or admin tools.

```bash
curl "http://localhost:3000/chats/all?connectionId=YOUR_ID"
```

```bash
curl -H "Accept: application/json" "http://localhost:3000/chats/all?connectionId=YOUR_ID"
```

### GET /chats/active?connectionId=...

Purpose: list active chat IDs for a connection.
Why: show a list of chats without loading all messages.
Parameters:
- `connectionId` query string.
Expected output: `{ active: ["..."] }` because the server returns the object keys.
How to use: call for dropdowns or quick status.

```bash
curl "http://localhost:3000/chats/active?connectionId=YOUR_ID"
```

```bash
curl -H "Accept: application/json" "http://localhost:3000/chats/active?connectionId=YOUR_ID"
```

### GET /image?prompt=...

Purpose: generate an image URL based on a prompt.
Why: mirror the extension�s image generator behavior.
Parameters:
- `connectionId` query string.
- `prompt` or `PROMPT` query string.
Expected output: `{ url }` because the server constructs a Pollinations URL.
How to use: open the returned URL in a browser or load it into an image tag.

```bash
curl "http://localhost:3000/image?connectionId=YOUR_ID&prompt=cyberpunk%20penguin"
```

```bash
curl "http://localhost:3000/image?connectionId=YOUR_ID&prompt=red%20sunset%20over%20ice"
```

## Opcode Aliases

These endpoints mirror the extension opcodes for drop-in compatibility. They accept the same parameters, including `connectionId`.

### POST /op/generate_text_nocontext

Purpose: alias of `/text-no-context`.
Why: compatibility with the extension opcode name.
Parameters: same as `/text-no-context`.
Expected output: same as `/text-no-context`.
How to use: replace the path only.

```bash
curl -X POST http://localhost:3000/op/generate_text_nocontext \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","PROMPT":"Hello"}'
```

```bash
curl -X POST http://localhost:3000/op/generate_text_nocontext \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","prompt":"Tell a joke"}'
```

### POST /op/send_text_to_chat

Purpose: alias of `/chat/send`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chat/send`.
Expected output: same as `/chat/send`.
How to use: replace the path only.

```bash
curl -X POST http://localhost:3000/op/send_text_to_chat \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","PROMPT":"Hi","chatID":"demo"}'
```

```bash
curl -X POST http://localhost:3000/op/send_text_to_chat \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","prompt":"Continue","chatId":"demo"}'
```

### POST /op/attach_image

Purpose: alias of `/chat/attach-image`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chat/attach-image`.
Expected output: same as `/chat/attach-image`.
How to use: replace the path only.

```bash
curl -X POST http://localhost:3000/op/attach_image \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","URL":"https://example.com/cat.png"}'
```

```bash
curl -X POST http://localhost:3000/op/attach_image \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","url":"https://example.com/dog.jpg"}'
```

### POST /op/inform_chat

Purpose: alias of `/chat/inform`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chat/inform`.
Expected output: same as `/chat/inform`.
How to use: replace the path only.

```bash
curl -X POST http://localhost:3000/op/inform_chat \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatID":"demo","inform":"Be concise."}'
```

```bash
curl -X POST http://localhost:3000/op/inform_chat \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatId":"demo","inform":"Be friendly."}'
```

### POST /op/create_chatbot

Purpose: alias of `/chat/create`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chat/create`.
Expected output: same as `/chat/create`.
How to use: replace the path only.

```bash
curl -X POST http://localhost:3000/op/create_chatbot \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatID":"demo"}'
```

```bash
curl -X POST http://localhost:3000/op/create_chatbot \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatId":"demo2"}'
```

### POST /op/delete_chatbot

Purpose: alias of `/chat/delete`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chat/delete`.
Expected output: same as `/chat/delete`.
How to use: replace the path only.

```bash
curl -X POST http://localhost:3000/op/delete_chatbot \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatID":"demo"}'
```

```bash
curl -X POST http://localhost:3000/op/delete_chatbot \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatId":"demo2"}'
```

### POST /op/reset_chat

Purpose: alias of `/chat/reset`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chat/reset`.
Expected output: same as `/chat/reset`.
How to use: replace the path only.

```bash
curl -X POST http://localhost:3000/op/reset_chat \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatID":"demo"}'
```

```bash
curl -X POST http://localhost:3000/op/reset_chat \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatId":"demo2"}'
```

### GET /op/get_chat_history?chatId=...&connectionId=...

Purpose: alias of `/chat/history`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chat/history`.
Expected output: same as `/chat/history`.
How to use: replace the path only.

```bash
curl "http://localhost:3000/op/get_chat_history?connectionId=YOUR_ID&chatId=demo"
```

```bash
curl "http://localhost:3000/op/get_chat_history?connectionId=YOUR_ID&chatID=demo2"
```

### POST /op/import_history

Purpose: alias of `/chat/import-history`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chat/import-history`.
Expected output: same as `/chat/import-history`.
How to use: replace the path only.

```bash
curl -X POST http://localhost:3000/op/import_history \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatID":"demo","json":"[]"}'
```

```bash
curl -X POST http://localhost:3000/op/import_history \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","chatId":"demo","json":"[{\\"role\\":\\"user\\",\\"content\\":\\"hi\\"}]"}'
```

### POST /op/import_chats_merge

Purpose: alias of `/chat/import-chats`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chat/import-chats`.
Expected output: same as `/chat/import-chats`.
How to use: replace the path only.

```bash
curl -X POST http://localhost:3000/op/import_chats_merge \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","json":"{\\"a\\":[{\\"role\\":\\"user\\",\\"content\\":\\"hi\\"}]}"}'
```

```bash
curl -X POST http://localhost:3000/op/import_chats_merge \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"YOUR_ID","json":"{\\"b\\":[]}","merge":"Remove all chatbots and import"}'
```

### GET /op/all_chats?connectionId=...

Purpose: alias of `/chats/all`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chats/all`.
Expected output: same as `/chats/all`.
How to use: replace the path only.

```bash
curl "http://localhost:3000/op/all_chats?connectionId=YOUR_ID"
```

```bash
curl -H "Accept: application/json" "http://localhost:3000/op/all_chats?connectionId=YOUR_ID"
```

### GET /op/active_chats?connectionId=...

Purpose: alias of `/chats/active`.
Why: compatibility with the extension opcode name.
Parameters: same as `/chats/active`.
Expected output: same as `/chats/active`.
How to use: replace the path only.

```bash
curl "http://localhost:3000/op/active_chats?connectionId=YOUR_ID"
```

```bash
curl -H "Accept: application/json" "http://localhost:3000/op/active_chats?connectionId=YOUR_ID"
```

### GET /op/generate_image?prompt=...

Purpose: alias of `/image`.
Why: compatibility with the extension opcode name.
Parameters: same as `/image`.
Expected output: same as `/image`.
How to use: replace the path only.

```bash
curl "http://localhost:3000/op/generate_image?connectionId=YOUR_ID&prompt=cyberpunk%20penguin"
```

```bash
curl "http://localhost:3000/op/generate_image?connectionId=YOUR_ID&prompt=red%20sunset%20over%20ice"
```
