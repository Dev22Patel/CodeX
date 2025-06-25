const userBuckets = new Map(); // Per-user token buckets
const GLOBAL_MAX_TOKENS = 5;
const GLOBAL_REFILL_INTERVAL = 2000;

let globalTokens = GLOBAL_MAX_TOKENS;

setInterval(() => {
    if (globalTokens < GLOBAL_MAX_TOKENS) globalTokens++;
}, GLOBAL_REFILL_INTERVAL);

function createBucket() {
    return {
        tokens: 10,
        lastRefill: Date.now()
    };
}

function refillUserBucket(bucket) {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;

    const tokensToAdd = Math.floor(elapsed / 5000); // 1 token every 5 seconds
    if (tokensToAdd > 0) {
        bucket.tokens = Math.min(10, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
    }
}

const rateLimiter = (req, res, next) => {
    const userId = req.user.id;

    // 1. Check global tokens
    if (globalTokens <= 0) {
        return res.status(429).json({
            message: "Too many submissions globally. Please wait and try again."
        });
    }

    // 2. Get or create user bucket
    let bucket = userBuckets.get(userId);
    if (!bucket) {
        bucket = createBucket();
        userBuckets.set(userId, bucket);
    }

    refillUserBucket(bucket);

    if (bucket.tokens <= 0) {
        return res.status(429).json({
            message: "Rate limit exceeded for your account. Please wait a few seconds."
        });
    }

    // Consume both tokens
    bucket.tokens -= 1;
    globalTokens -= 1;

    next();
};

module.exports = rateLimiter;



// 1. Per-User Bucket – Why 10 Tokens and 1 per 5 Seconds
// Most users make quick corrections after a failed code submission.

// So I allow up to 10 quick submissions (burst capacity).

// After that, I refill 1 token every 5 seconds – this allows a user to continuously work, but not spam.

// Why 5s? It's enough time for a user to get feedback, make a correction, and retry – without punishing them.

// 2. Global Bucket – Why 5 Tokens and 1 per 2 Seconds
// Since I'm using a 3rd-party service (Judge0 via RapidAPI), I need to protect against exhausting our quota.

// I limit total concurrent outgoing requests to 5, refilling 1 every 2 seconds → 30 requests per minute.

// This keeps us within API plan limits, while still handling small bursts from multiple users.

// 3. Tradeoff Consideration
// I tested different values during development. This config offers a balance:

// ⚡ Fast enough for real-time user feedback

// 🔒 Safe enough to avoid abuse or overuse of Judge0
