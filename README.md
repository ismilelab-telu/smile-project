# Smile Project

Smile Project is a visual-first playground for learning machine learning through interaction, motion, and immediate feedback.

Instead of starting with notebooks, formulas, or static explanations, Smile Project turns abstract model behavior into something learners can explore directly. The goal is to make machine learning feel clearer, more intuitive, and more engaging without reducing the ideas behind it.

## Philosophy

Smile Project is built around a simple idea: machine learning is easier to understand when learners can interact with the model, see the feedback, and build intuition before moving deeper into the math.

## Tech Stack

- React
- TypeScript
- VitePlus
- Tailwind CSS
- GSAP
- Motion
- Three.js
- Bun

## Development

Install dependencies:

```sh
bun install
```

Start the development server:

```sh
vp dev
```

For local auth and learning-backend testing, keep browser traffic on the same-origin proxy path:

```sh
VITE_LEARNING_BACKEND_URL=/api/learning-backend
LEARNING_BACKEND_URL=<Lambda Function URL>
LEARNING_BACKEND_PROXY_SECRET=<shared proxy secret>
UPSTASH_REDIS_REST_URL=<optional Upstash Redis REST URL>
UPSTASH_REDIS_REST_TOKEN=<optional Upstash Redis REST token>
```

`LEARNING_BACKEND_URL` and `LEARNING_BACKEND_PROXY_SECRET` are server-side dev proxy env values used by `vp dev`. Do not prefix the proxy secret with `VITE_`.
The Upstash values are optional for local development; when omitted, the dev proxy uses its local in-memory auth limiter.

Run project checks:

```sh
vp check src
```

Run unit tests:

```sh
vp test run
```

## Cloudflare Auth Rate Limiting

Production auth traffic should use the same-origin Pages proxy at `/api/learning-backend`.
Coarse source/IP auth abuse can be blocked at Cloudflare before Pages Functions or AWS run.
See [`docs/cloudflare-auth-rate-limiting.md`](./docs/cloudflare-auth-rate-limiting.md) for the deploy command, required Cloudflare zone/API token values, and the Pages proxy fallback switch.
