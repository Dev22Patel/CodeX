const userBuckets = new Map(); // Per-user token buckets

function createBucket() {
    return {
        tokens: 5,
        lastRefill: Date.now()
    };
}

function refillUserBucket(bucket) {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;

    const tokensToAdd = Math.floor(elapsed / 25000); // 1 token every 25 seconds
    if (tokensToAdd > 0) {
        bucket.tokens = Math.min(5, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
    }
}

const rateLimiter = (req, res, next) => {
    const userId = req.user.id;

    // Get or create user bucket
    let bucket = userBuckets.get(userId);
    if (!bucket) {
        bucket = createBucket();
        userBuckets.set(userId, bucket);
    }

    refillUserBucket(bucket);

    if (bucket.tokens <= 0) {
        return res.status(429).json({
            message: "Rate limit exceeded. Please wait a few seconds before submitting again."
        });
    }

    // Consume token
    bucket.tokens -= 1;

    next();
};

module.exports = rateLimiter;
