# AI assistant

OpenLeaf has a built-in AI assistant that can read and edit your files, compile your project, and check the result against the actual PDF. Point it at errors and let it iterate until the build is green.

## Connect a provider

Open Settings → AI Assistant. There's a card for each supported provider. Paste your key and hit Save, and that provider becomes active.

| Provider | Type | Notes |
|---|---|---|
| **OpenAI** | API key | GPT-4o, GPT-4.1, o3-mini |
| **Anthropic** | API key | Claude Sonnet 4, 3.5 Sonnet/Haiku |
| **Groq** | API key | Very fast Llama inference |
| **OpenRouter** | API key | One key → many labs' models |
| **DeepSeek** | API key | V3 / R1 reasoner |
| **Mistral** | API key | Mistral Large / Codestral |
| **xAI (Grok)** | API key | Grok 2 |
| **Z.AI (GLM)** | API key | GLM coding models |
| **Ollama** | Local host | Runs on your machine, no key needed |

Each card links out to where you can grab a key. Keys are stored locally only, in `~/.openleaf/config.json`.

## Run it locally with Ollama

If you don't want any data leaving your machine, use Ollama.

1. [Install Ollama](https://ollama.com) and pull a model: `ollama pull llama3.2` (or `qwen2.5`, `mistral`, and so on).
2. In Settings → AI Assistant, pick the **Ollama (local)** card.
3. The host is `http://localhost:11434` by default. Save it.
4. Choose the model you pulled. The assistant now runs fully offline.

## Switching providers and models

- The active provider has a blue badge. Saving any provider's key makes it active.
- Change the model from the dropdown on the active card.
- If you have multiple keys, use **Activate** on any saved card to switch.
- Click the trash icon on a card to delete that key. Deleting the active key disables AI access until you connect another.

## What it can do

The assistant supports these tools:

| Tool | What it does |
|---|---|
| `read_file` | Read a file's contents |
| `write_file` | Write or overwrite a file |
| `replace_in_file` | Find & replace within a file |
| `create_file` | Create a file or folder |
| `rename_file` | Rename or move a path |
| `delete_file` | Delete a file or folder |
| `list_files` | List the project tree |
| `search_project` | Search text across all projects |
| `compile` | Compile LaTeX to PDF |
| `get_log` | Read the last compile log |
| `get_pdf_text` | Extract text from the rendered PDF |
| `set_main_doc` | Set the main document |
| `toggle_theme` | Toggle light/dark mode |

## Tips

- Ask in plain language: _"fix the LaTeX errors"_, _"add a Publications section"_, _"recompile and check the PDF shows my name"_.
- For targeted fixes it prefers `replace_in_file` over rewriting whole files.
- It loops: compile, read errors, fix, recompile until the build succeeds, then explains what it did.

## Privacy

Your document content and keys stay on your machine. API calls go directly from the app to the provider you chose (or to `localhost` for Ollama). There's no OpenLeaf server in the middle.
