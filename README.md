# InsuroNews

A real-time P&C insurance news aggregator powered by Firebase, React, and AI-driven summarization.

**Live**: https://insuronews.firebaseapp.com

## Features

- **Hourly RSS Feed Polling**: Automatically collects news from 4+ insurance RSS feeds + HTML newsrooms
- **AI Summarization**: Uses OpenAI GPT-4o-mini to generate 3-5 bullet summaries + category classification
- **Infinite Scroll Feed**: React app with Firestore pagination (20 items/page)
- **Category Filtering**: 11 P&C insurance categories (Regulatory, Catastrophe, Auto, etc.)
- **Public Read-Only**: Firestore rules allow public read; only Cloud Functions write
- **TTL Auto-Cleanup**: Articles auto-expire after 45 days

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Backend**: Firebase Cloud Functions (TypeScript, 2nd gen)
- **Database**: Firestore with composite indexes
- **AI**: OpenAI Chat Completions (gpt-4o-mini)
- **Hosting**: Firebase Hosting

## Project Structure

```
insuronews/
├── web/                          # React frontend
│   ├── src/
│   │   ├── lib/
│   │   │   ├── firebase.ts       # Firebase config & exports
│   │   │   └── types.ts          # TypeScript interfaces
│   │   ├── features/feed/
│   │   │   ├── Feed.tsx          # Main feed component (infinite scroll)
│   │   │   ├── NewsCard.tsx      # News item display
│   │   │   └── FilterBar.tsx     # Category filters
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css             # Tailwind + global styles
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── functions/                    # Cloud Functions backend
│   ├── src/
│   │   ├── index.ts              # Main scheduler + manual trigger
│   │   └── sources.ts            # RSS feed URLs
│   └── package.json
├── firestore.rules               # Security rules (public read, no client writes)
├── firestore.indexes.json        # Composite indexes for queries
├── firebase.json                 # Firebase config
└── .firebaserc                   # Project alias
```

## Setup & Deployment

### Prerequisites

- Node.js 20+
- Firebase CLI (`npm i -g firebase-tools`)
- OpenAI API key (stored as Firebase secret)

### Local Development

```bash
# Install dependencies
cd web && npm install
cd ../functions && npm install

# Start dev server (web only)
cd web && npm run dev
# Open http://localhost:5173
```

### Deploy to Firebase

```bash
# Build web app
cd web && npm run build && cd ..

# Deploy Firestore rules & indexes
firebase deploy --only firestore

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy hosting
firebase deploy --only hosting

# Or deploy everything
firebase deploy
```

### Manual Trigger (Testing)

After deployment, trigger the collector once to seed data:

```bash
firebase functions:call runOnce
```

Then check Firestore Console → `news` collection for populated documents.

## Configuration

### OpenAI Secret

The API key is stored securely in Firebase Secret Manager:

```bash
firebase functions:secrets:set OPENAI_API_KEY
# Paste your key when prompted
```

Functions access it via `process.env.OPENAI_API_KEY` (with secret binding in `firebase.json`).

### RSS Feeds

Edit `functions/src/sources.ts` to add/remove feeds:

```typescript
export const FEEDS: string[] = [
  "https://www.insurancejournal.com/rss/news",
  "https://www.claimsjournal.com/rss/news",
  // Add more...
];
```

### TTL Cleanup

After first deploy, enable TTL in Firebase Console:

1. Go to Firestore → `news` collection
2. Click "TTL Policy" → Enable on `expireAt` field
3. Documents auto-delete 45 days after creation

## API & Data Model

### NewsDoc (Firestore)

```typescript
{
  id: string;                    // sha1(canonical_url)
  title: string;                 // AI-refined title
  url: string;                   // Canonical URL
  source: string;                // Domain origin
  imageUrl?: string;             // og:image
  publishedAt: Timestamp;        // Article publish date
  summaryBullets: string[];      // 3-5 bullets (≤22 words each)
  categories: Category[];        // 1-4 tags from fixed taxonomy
  relevance: number;             // 0..1 (AI confidence)
  createdAt: Timestamp;          // When added to DB
  expireAt: Timestamp;           // Auto-delete after 45 days
}
```

### Categories

```
Regulatory | Catastrophe | Auto | Homeowners | Commercial | 
Reinsurance | Claims | InsurTech | M&A | Cyber | Pricing
```

## Performance & Cost

- **Concurrency**: p-limit(3) to avoid rate limits & spike costs
- **Deduplication**: SHA1 hash of canonical URL prevents duplicates
- **Filtering**: Keyword pre-filter + AI relevance threshold (0.5)
- **Pagination**: 20 items/page; IntersectionObserver for infinite scroll
- **Model**: gpt-4o-mini (~$0.15 per 1M input tokens; ~$0.60 per 1M output)
- **Firestore**: Composite indexes for fast queries; TTL for cleanup

## Observability

Cloud Functions logs are visible in Firebase Console:

```bash
firebase functions:log
```

Key log messages:
- `Found X candidate URLs` — RSS/HTML scrape results
- `Hourly poll completed` — Successful run
- `Process err` — Individual article processing failure
- `Schema fail` — AI output validation error

## Next Steps

1. **Search**: Add client-side fuzzy search or Firestore full-text index
2. **Email Digest**: Daily summary email (MJML template)
3. **Deep Links**: Route by document ID for sharing
4. **Saved Filters**: localStorage for user preferences
5. **Analytics**: Custom GA events on article clicks
6. **More Feeds**: Add international sources, regulatory databases

## License

MIT

## Support

For issues or questions, open a GitHub issue or contact the maintainer.

