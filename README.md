This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Running the backends with Docker

`docker/docker-compose.yml` starts every backend at once: MySQL (`kelseydb`, schema loaded on first
start), auth-service-backend on 3001, points-system-backend on 3002 and ai-chatbot-backend on 3003.
It builds the backend repositories from folders next to this one:

```
kelsey/
  main-frontend/          <- this repo
  auth-service-backend/
  points-system-backend/
  ai-chatbot-backend/
```

```bash
cp docker/env.example docker/.env   # fill in passwords, JWT_SECRET, GROQ_API_KEY
npm run backends:up                 # build and start in the background
npm run backends:logs               # follow the logs
npm run backends:down               # stop (add -v to the compose command to also wipe the database)
```

Then point the frontend at them: copy the "Local backends" lines from `env.example` into
`.env.local` and run the frontend as usual with `npm run dev`. MySQL is on `127.0.0.1:3307` from the host.

The schema files only run when the database volume is empty. After pulling schema changes, apply the
new file from `auth-service-backend/migrations/`, or reset with
`docker compose -f docker/docker-compose.yml down -v` (deletes all data).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
