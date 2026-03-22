# Ai Summarizer

AI-powered article and document summarizer built with React, Express, and Gemini.

Ai Summarizer lets you:
- summarize public article URLs
- upload and summarize `PDF`, `DOC`, and `DOCX` files
- translate the generated summary
- listen to the summary with text-to-speech
- view key points and compression metrics

## Overview

This project is a production-style MVP focused on a simple user flow:
1. choose a source
2. generate a summary
3. review key points
4. translate or listen to the result

The app uses Gemini when a valid `GEMINI_API_KEY` is available and falls back to a local summarization strategy when Gemini is unavailable.

## Features

- URL summarization for public article pages
- file summarization for `PDF`, `DOC`, and `DOCX`
- improved article extraction with `Readability` and `jsdom`
- summary + key points output
- language translation
- text-to-speech playback
- sky-blue custom UI with dark mode
- Vercel-ready API structure

## Tech Stack

- React
- TypeScript
- Vite
- Express
- TanStack Query
- Tailwind CSS
- Gemini API
- Vercel serverless API handlers

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

```bash
cp .env.example .env
```

Then update `.env`:

```env
GEMINI_API_KEY=your_real_gemini_api_key
NODE_ENV=development
PORT=5001
GEMINI_MODEL=gemini-1.5-flash
MAX_CONTENT_LENGTH=30000
```

### 3. Start the project

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5001
```

## Build

```bash
npm run check
npm run build
```

To run the production server locally:

```bash
npm start
```

## Environment Variables

| Variable | Required | Description |
|---|---:|---|
| `GEMINI_API_KEY` | Yes | Gemini API key from Google AI Studio |
| `GEMINI_MODEL` | No | Gemini model name, default is `gemini-1.5-flash` |
| `MAX_CONTENT_LENGTH` | No | Maximum article length sent to Gemini |
| `PORT` | No | Local server port |
| `NODE_ENV` | No | Runtime mode |

## Project Structure

```text
api/
  summarize.ts
  translate.ts
  services/
    gemini.ts
    summarizer/
      index.ts
      source.ts
      summary.ts
      text.ts
      types.ts

client/
  src/
    pages/
      home.tsx

server/
  index.ts
  routes-new.ts

shared/
  schema.ts
```

## Deploy On GitHub

Important:
- do not push `.env`
- keep your real API key private
- commit only `.env.example`

Your project already ignores `.env` in [`.gitignore`](./.gitignore).

Set your GitHub repository as the `origin` remote:

```bash
git remote remove origin
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
```

Then push:

```bash
git add .
git commit -m "Initial Ai Summarizer release"
git branch -M main
git push -u origin main
```

## Deploy On Vercel

### Option 1. Import from GitHub

1. Push the project to your GitHub repository
2. Import the repository into Vercel
3. Vercel will run:

```bash
npm run build
```

4. Make sure these environment variables are added in the Vercel dashboard:

```text
GEMINI_API_KEY
GEMINI_MODEL
MAX_CONTENT_LENGTH
```

### Option 2. Vercel CLI

```bash
npm i -g vercel
vercel
```

Then add the same environment variables in Vercel.

Vercel docs:
- https://vercel.com/docs/deployments/git/vercel-for-github
- https://vercel.com/docs/environment-variables

## Notes

- If `GEMINI_API_KEY` is invalid, the app falls back to a local summarizer
- Some websites may block scraping or return limited content
- A few article pages may still need extractor tuning depending on site structure

## License

MIT

## Author

Youssef Bouzit

- GitHub: https://github.com/YOUSSEF-BT
- LinkedIn: https://www.linkedin.com/in/youssef-bouzit-74863239b/
- Email: bt.youssef.369@gmail.com
