# Deployment Checklist

Complete this checklist to deploy InsuroNews to production.

## Pre-Deployment

- [x] Firebase project created (`insuronews`)
- [x] OpenAI API key stored as Firebase secret (`OPENAI_API_KEY`)
- [x] Firestore rules configured (public read, no client writes)
- [x] Firestore indexes created (publishedAt, categories+publishedAt)
- [x] Web app builds successfully (`npm run build`)
- [x] Functions build successfully (`npm run build`)
- [x] GitHub repository created and pushed

## Deployment Steps

### 1. Deploy Firestore Rules & Indexes

```bash
firebase deploy --only firestore
```

**Expected output:**
```
✔  Deployed firestore.rules
✔  Deployed firestore.indexes
```

### 2. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

**Expected output:**
```
✔  functions[pollFeeds(us-central1)]: Successful create operation.
✔  functions[runOnce(us-central1)]: Successful create operation.
```

**Functions deployed:**
- `pollFeeds`: Scheduled hourly (every 60 minutes, UTC)
- `runOnce`: Manual HTTP trigger for testing

### 3. Deploy Web App (Hosting)

```bash
# Build first
cd web && npm run build && cd ..

# Deploy
firebase deploy --only hosting
```

**Expected output:**
```
✔  Deploy complete!
Hosting URL: https://insuronews.firebaseapp.com
```

### 4. Enable TTL Auto-Cleanup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select `insuronews` project
3. Navigate to Firestore → `news` collection
4. Click "TTL Policy" (top right)
5. Select `expireAt` field
6. Click "Create Policy"

**Result:** Documents auto-delete 45 days after creation

## Post-Deployment Verification

### Test Manual Trigger

```bash
firebase functions:call runOnce
```

**Expected:**
- Function executes successfully
- Check Firestore Console → `news` collection
- Should see 5-20 new documents with:
  - `title`, `url`, `source`, `imageUrl`
  - `summaryBullets` (3-5 items)
  - `categories` (1-4 tags)
  - `relevance` (0.5-1.0)
  - `publishedAt`, `createdAt`, `expireAt` timestamps

### Test Web App

1. Open https://insuronews.firebaseapp.com
2. Verify:
   - [ ] Page loads (white cards on mist background)
   - [ ] News items display with title, source, bullets
   - [ ] Category tags visible in footer
   - [ ] Filter buttons work (click a category)
   - [ ] Infinite scroll works (scroll to bottom, more items load)
   - [ ] Images load (if available)

### Check Logs

```bash
firebase functions:log
```

**Look for:**
- `Found X candidate URLs` — RSS/HTML scrape results
- `Hourly poll completed` — Successful run
- No `Process err` or `Schema fail` messages

## Monitoring

### Daily Checks

- [ ] Check Firebase Console for function errors
- [ ] Verify Firestore document count growing
- [ ] Test web app loads and displays articles

### Weekly Checks

- [ ] Review function logs for patterns
- [ ] Check OpenAI API usage/costs
- [ ] Verify TTL cleanup is working (old docs disappearing)

## Troubleshooting

### Functions Not Running

**Check:**
```bash
firebase functions:log
```

**Common issues:**
- OpenAI API key not set: `firebase functions:secrets:set OPENAI_API_KEY`
- Firestore rules blocking writes: Check `firestore.rules`
- RSS feed down: Check `functions/src/sources.ts` URLs

### No Articles Appearing

**Debug:**
1. Manually trigger: `firebase functions:call runOnce`
2. Check logs: `firebase functions:log`
3. Verify Firestore has documents: Console → `news` collection
4. Check relevance scores (may be < 0.5)

### Web App Not Loading

**Check:**
1. Hosting deployed: `firebase deploy --only hosting`
2. Firebase config correct: `web/src/lib/firebase.ts`
3. Build output exists: `web/dist/index.html`

### High Costs

**Optimize:**
- Reduce `p-limit` concurrency (currently 3)
- Increase relevance threshold (currently 0.5)
- Use cheaper model: Set `OPENAI_MODEL=gpt-4o-mini` (already default)
- Reduce feed URLs in `functions/src/sources.ts`

## Rollback

If issues occur:

```bash
# Revert to previous version
git revert HEAD
git push origin main

# Redeploy
firebase deploy
```

## Cost Estimates

**Monthly (estimated):**
- Firestore: $0-5 (read-heavy, TTL cleanup)
- Cloud Functions: $0-10 (hourly runs, ~1-2 min each)
- OpenAI: $5-20 (gpt-4o-mini, ~150 articles/hour)
- Hosting: $0 (free tier)

**Total: ~$5-35/month**

## Next Steps

After successful deployment:

1. **Monitor**: Set up alerts in Firebase Console
2. **Expand**: Add more RSS feeds in `functions/src/sources.ts`
3. **Enhance**: Implement search, email digest, saved filters
4. **Scale**: Consider Firestore sharding if > 10k docs/day

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Notes**: _______________

