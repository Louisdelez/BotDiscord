const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

/**
 * Generate text from a simple prompt.
 * @param {object} config - AIConfig from Prisma (provider, model, openaiApiKey, embedModel, temperature, maxTokens)
 * @param {string} prompt - The prompt text
 * @param {object} [opts] - { temperature, maxTokens }
 * @returns {Promise<string>} Generated text
 */
async function aiGenerate(config, prompt, opts = {}) {
  const provider = config?.provider || 'ollama';
  const model = config?.model || OLLAMA_MODEL;
  const temperature = opts.temperature ?? config?.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? config?.maxTokens ?? 500;

  if (provider === 'openai') {
    return openaiChat(config.openaiApiKey, model, [{ role: 'user', content: prompt }], { temperature, maxTokens });
  }

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature, num_predict: maxTokens },
    }),
  });
  const data = await res.json();
  return data.response || '';
}

/**
 * Chat with multiple messages.
 * @param {object} config - AIConfig from Prisma
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} [opts] - { temperature, maxTokens, json }
 * @returns {Promise<string>} Assistant reply
 */
async function aiChat(config, messages, opts = {}) {
  const provider = config?.provider || 'ollama';
  const model = config?.model || OLLAMA_MODEL;
  const temperature = opts.temperature ?? config?.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? config?.maxTokens ?? 500;

  if (provider === 'openai') {
    return openaiChat(config.openaiApiKey, model, messages, { temperature, maxTokens, json: opts.json });
  }

  const body = {
    model,
    messages,
    options: { temperature, num_predict: maxTokens },
    stream: false,
  };
  if (opts.json) body.format = 'json';

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.message?.content || '';
}

/**
 * Generate an embedding vector.
 * @param {object} config - AIConfig from Prisma
 * @param {string} text
 * @returns {Promise<number[]>} Embedding vector
 */
async function aiEmbed(config, text) {
  const provider = config?.provider || 'ollama';
  const embedModel = config?.embedModel || OLLAMA_EMBED_MODEL;

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: embedModel,
        input: text,
      }),
    });
    const data = await res.json();
    return data.data?.[0]?.embedding || [];
  }

  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: embedModel,
      prompt: text,
    }),
  });
  const data = await res.json();
  return data.embedding || [];
}

async function openaiChat(apiKey, model, messages, opts = {}) {
  const body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 500,
  };
  if (opts.json) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = { aiGenerate, aiChat, aiEmbed };
