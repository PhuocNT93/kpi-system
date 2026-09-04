# Step 10: Monitoring

- Ensure the GitHub Action `develop-keepalive.yml` fires correctly and hits the Free Tier Web Service every 12 mins.
- Watch Render dashboard for any unexpected spins or DB timeouts.
- Monitor `SERVER_WAKING_UP` occurrences in the frontend logs or analytics to ensure the retry duration is sufficient.
