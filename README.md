# BotDiscord

A full-featured Discord bot ecosystem with a web dashboard, real-time multiplayer games, AI integration, and comprehensive community/moderation tools.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite, Zustand, TailwindCSS, Recharts, React Router |
| **API** | Express, WebSocket (ws), JWT, Redis pub/sub |
| **Bot** | Discord.js 14, play-dl, node-cron, sharp, Google TTS |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Infra** | Turborepo, pnpm workspaces, Docker Compose |
| **AI** | Ollama (local), OpenAI |
| **i18n** | 5 langues : FR, EN, DE, ES, IT |

## Architecture

```
├── apps/
│   ├── api/          # Express REST + WebSocket server
│   ├── bot/          # Discord.js bot (35+ commands)
│   └── web/          # React SPA (15 pages, 60+ components)
├── packages/
│   ├── shared/       # Prisma client & utilities
│   └── i18n/         # Internationalization (5 locales)
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Features

### Multiplayer Games (10)

Real-time online games with lobby system, spectating, and rematch support.

| Game | Type | Hidden Info |
|------|------|:-----------:|
| Chess | Board | |
| Shogi | Board | |
| Go | Board | |
| Connect 4 | Board | |
| UNO | Card | ✓ |
| Jass | Card | ✓ |
| Poker | Card | ✓ |
| Mahjong | Tile | ✓ |
| Monopoly | Board | |
| Werewolf | Social deduction | ✓ |

### Discord Bot

- **Moderation** — warn, mute, kick, ban, modlog, automod (toxicity, spam, links detection)
- **Music** — play, queue, playlists, voice playback
- **Community** — polls, suggestions, confessions, quotes, starboard
- **XP & Levels** — experience system, leaderboards, role rewards, badges
- **AI** — chatbot, voice AI, content generation, summaries, FAQ
- **Mini-games** — RPG, pets, creature collection, quizzes, adventures
- **Utilities** — reminders, crypto alerts, keyword alerts, reaction roles, events

### Web Dashboard

- Discord OAuth2 login
- Server management & configuration
- Live game interface with per-game boards
- Music player control
- Moderation logs & stats
- Watch Together (synchronized video)
- Server setup wizard with templates

### Integrations

GitHub, Trello, Linear, Jira

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (for PostgreSQL, Redis, Ollama)

## Getting Started

### 1. Clone & install

```bash
git clone <repo-url>
cd BotDiscord
pnpm install
```

### 2. Start services

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, and Ollama.

### 3. Configure environment

Create a `.env` file at the root with:

```env
DATABASE_URL=postgresql://discord_bot:discord_bot_pwd@localhost:5432/discord_bot
REDIS_URL=redis://localhost:6379
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret
```

### 4. Setup database

```bash
pnpm db:generate
pnpm db:push
```

### 5. Deploy bot commands

```bash
cd apps/bot && pnpm deploy-commands
```

### 6. Run development

```bash
pnpm dev
```

This starts all apps in parallel via Turborepo:
- **API** → `http://localhost:3001`
- **Web** → `http://localhost:5173`
- **Bot** → connects to Discord

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all apps |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:studio` | Open Prisma Studio |

## License

[MIT](LICENSE)
