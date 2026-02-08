# Ai-Api

Lightweight Node.js HTTP server that mimics the PangAI PenguinMod extension and proxies to an upstream AI API. Designed for Render.com.

## Run

```powershell
$env:PENGUINMOD_API_URL='https://freeai.logise1123.workers.dev/'
$env:DEFAULT_MODEL='llama-3.1-8b-instruct-fast'
node server.js
```

Server listens on `PORT` (default `3000`).

## Examples

All examples assume `http://localhost:3000`.

### GET /health

```bash
curl http://localhost:3000/health
```

```bash
curl -H "Accept: application/json" http://localhost:3000/health
```

### GET /meta

```bash
curl http://localhost:3000/meta
```

```bash
curl -H "Accept: application/json" http://localhost:3000/meta
```

### GET /model

```bash
curl http://localhost:3000/model
```

```bash
curl -H "Accept: application/json" http://localhost:3000/model
```

### POST /model

```bash
curl -X POST http://localhost:3000/model \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.1-8b-instruct-fast"}'
```

```bash
curl -X POST http://localhost:3000/model \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma-3-12b-it"}'
```

### GET /prompt?type=...

```bash
curl "http://localhost:3000/prompt?type=PenguinBot%20(Pre%20Circlelabs)%20By:%20JeremyGamer13"
```

```bash
curl "http://localhost:3000/prompt?type=Stand%20Up%20Comedian%20(Character)%20By:%20devisasari"
```

### POST /text-no-context

```bash
curl -X POST http://localhost:3000/text-no-context \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello there"}'
```

```bash
curl -X POST http://localhost:3000/text-no-context \
  -H "Content-Type: application/json" \
  -d '{"PROMPT":"Write a haiku about snow"}'
```

### POST /chat/send

```bash
curl -X POST http://localhost:3000/chat/send \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hi","chatId":"demo"}'
```

```bash
curl -X POST http://localhost:3000/chat/send \
  -H "Content-Type: application/json" \
  -d '{"PROMPT":"Continue","chatID":"demo"}'
```

### POST /chat/attach-image

```bash
curl -X POST http://localhost:3000/chat/attach-image \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/cat.png"}'
```

```bash
curl -X POST http://localhost:3000/chat/attach-image \
  -H "Content-Type: application/json" \
  -d '{"URL":"https://example.com/dog.jpg"}'
```

### POST /chat/inform

```bash
curl -X POST http://localhost:3000/chat/inform \
  -H "Content-Type: application/json" \
  -d '{"chatId":"demo","inform":"You are helpful."}'
```

```bash
curl -X POST http://localhost:3000/chat/inform \
  -H "Content-Type: application/json" \
  -d '{"chatID":"demo","inform":"Answer in Spanish."}'
```

### POST /chat/create

```bash
curl -X POST http://localhost:3000/chat/create \
  -H "Content-Type: application/json" \
  -d '{"chatId":"demo"}'
```

```bash
curl -X POST http://localhost:3000/chat/create \
  -H "Content-Type: application/json" \
  -d '{"chatID":"demo2"}'
```

### POST /chat/delete

```bash
curl -X POST http://localhost:3000/chat/delete \
  -H "Content-Type: application/json" \
  -d '{"chatId":"demo"}'
```

```bash
curl -X POST http://localhost:3000/chat/delete \
  -H "Content-Type: application/json" \
  -d '{"chatID":"demo2"}'
```

### POST /chat/reset

```bash
curl -X POST http://localhost:3000/chat/reset \
  -H "Content-Type: application/json" \
  -d '{"chatId":"demo"}'
```

```bash
curl -X POST http://localhost:3000/chat/reset \
  -H "Content-Type: application/json" \
  -d '{"chatID":"demo2"}'
```

### GET /chat/history?chatId=...

```bash
curl "http://localhost:3000/chat/history?chatId=demo"
```

```bash
curl "http://localhost:3000/chat/history?chatID=demo2"
```

### POST /chat/import-history

```bash
curl -X POST http://localhost:3000/chat/import-history \
  -H "Content-Type: application/json" \
  -d '{"chatId":"demo","json":"[]"}'
```

```bash
curl -X POST http://localhost:3000/chat/import-history \
  -H "Content-Type: application/json" \
  -d '{"chatID":"demo","json":"[{\\"role\\":\\"user\\",\\"content\\":\\"hi\\"}]"}'
```

### POST /chat/import-chats

```bash
curl -X POST http://localhost:3000/chat/import-chats \
  -H "Content-Type: application/json" \
  -d '{"json":"{\\"a\\":[{\\"role\\":\\"user\\",\\"content\\":\\"hi\\"}]}"}'
```

```bash
curl -X POST http://localhost:3000/chat/import-chats \
  -H "Content-Type: application/json" \
  -d '{"json":"{\\"b\\":[]}","merge":"Remove all chatbots and import"}'
```

### GET /chats/all

```bash
curl http://localhost:3000/chats/all
```

```bash
curl -H "Accept: application/json" http://localhost:3000/chats/all
```

### GET /chats/active

```bash
curl http://localhost:3000/chats/active
```

```bash
curl -H "Accept: application/json" http://localhost:3000/chats/active
```

### GET /image?prompt=...

```bash
curl "http://localhost:3000/image?prompt=cyberpunk%20penguin"
```

```bash
curl "http://localhost:3000/image?prompt=red%20sunset%20over%20ice"
```

## Opcode Aliases

These endpoints mirror the extension opcodes.

### POST /op/generate_text_nocontext

```bash
curl -X POST http://localhost:3000/op/generate_text_nocontext \
  -H "Content-Type: application/json" \
  -d '{"PROMPT":"Hello"}'
```

```bash
curl -X POST http://localhost:3000/op/generate_text_nocontext \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Tell a joke"}'
```

### POST /op/send_text_to_chat

```bash
curl -X POST http://localhost:3000/op/send_text_to_chat \
  -H "Content-Type: application/json" \
  -d '{"PROMPT":"Hi","chatID":"demo"}'
```

```bash
curl -X POST http://localhost:3000/op/send_text_to_chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Continue","chatId":"demo"}'
```

### POST /op/attach_image

```bash
curl -X POST http://localhost:3000/op/attach_image \
  -H "Content-Type: application/json" \
  -d '{"URL":"https://example.com/cat.png"}'
```

```bash
curl -X POST http://localhost:3000/op/attach_image \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/dog.jpg"}'
```

### POST /op/inform_chat

```bash
curl -X POST http://localhost:3000/op/inform_chat \
  -H "Content-Type: application/json" \
  -d '{"chatID":"demo","inform":"Be concise."}'
```

```bash
curl -X POST http://localhost:3000/op/inform_chat \
  -H "Content-Type: application/json" \
  -d '{"chatId":"demo","inform":"Be friendly."}'
```

### POST /op/create_chatbot

```bash
curl -X POST http://localhost:3000/op/create_chatbot \
  -H "Content-Type: application/json" \
  -d '{"chatID":"demo"}'
```

```bash
curl -X POST http://localhost:3000/op/create_chatbot \
  -H "Content-Type: application/json" \
  -d '{"chatId":"demo2"}'
```

### POST /op/delete_chatbot

```bash
curl -X POST http://localhost:3000/op/delete_chatbot \
  -H "Content-Type: application/json" \
  -d '{"chatID":"demo"}'
```

```bash
curl -X POST http://localhost:3000/op/delete_chatbot \
  -H "Content-Type: application/json" \
  -d '{"chatId":"demo2"}'
```

### POST /op/reset_chat

```bash
curl -X POST http://localhost:3000/op/reset_chat \
  -H "Content-Type: application/json" \
  -d '{"chatID":"demo"}'
```

```bash
curl -X POST http://localhost:3000/op/reset_chat \
  -H "Content-Type: application/json" \
  -d '{"chatId":"demo2"}'
```

### GET /op/get_chat_history?chatId=...

```bash
curl "http://localhost:3000/op/get_chat_history?chatId=demo"
```

```bash
curl "http://localhost:3000/op/get_chat_history?chatID=demo2"
```

### POST /op/import_history

```bash
curl -X POST http://localhost:3000/op/import_history \
  -H "Content-Type: application/json" \
  -d '{"chatID":"demo","json":"[]"}'
```

```bash
curl -X POST http://localhost:3000/op/import_history \
  -H "Content-Type: application/json" \
  -d '{"chatId":"demo","json":"[{\\"role\\":\\"user\\",\\"content\\":\\"hi\\"}]"}'
```

### POST /op/import_chats_merge

```bash
curl -X POST http://localhost:3000/op/import_chats_merge \
  -H "Content-Type: application/json" \
  -d '{"json":"{\\"a\\":[{\\"role\\":\\"user\\",\\"content\\":\\"hi\\"}]}"}'
```

```bash
curl -X POST http://localhost:3000/op/import_chats_merge \
  -H "Content-Type: application/json" \
  -d '{"json":"{\\"b\\":[]}","merge":"Remove all chatbots and import"}'
```

### GET /op/all_chats

```bash
curl http://localhost:3000/op/all_chats
```

```bash
curl -H "Accept: application/json" http://localhost:3000/op/all_chats
```

### GET /op/active_chats

```bash
curl http://localhost:3000/op/active_chats
```

```bash
curl -H "Accept: application/json" http://localhost:3000/op/active_chats
```

### GET /op/generate_image?prompt=...

```bash
curl "http://localhost:3000/op/generate_image?prompt=cyberpunk%20penguin"
```

```bash
curl "http://localhost:3000/op/generate_image?prompt=red%20sunset%20over%20ice"
```
