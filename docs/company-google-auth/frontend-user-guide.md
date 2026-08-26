# Company Google Sign-in Guide

Status: produced during Step 6

## Prerequisites
- A Google Cloud OAuth 2.0 web client configured for Google Identity Services.
- A matching `VITE_GOOGLE_CLIENT_ID` in the frontend environment.
- `GOOGLE_CLIENT_ID` and `GOOGLE_ALLOWED_DOMAIN=cyberlogitec.com` in the backend environment.
- An active employee record whose email exactly matches the verified Google Workspace email.

## Start and Stop
- Start backend: `cd backend; npm run dev`
- Start frontend: `cd frontend; npm run dev`
- Stop either process with `Ctrl+C`.

## Configured URLs
- The login page loads Google Identity Services from `https://accounts.google.com/gsi/client`.
- The frontend posts the returned credential to `POST /api/auth/google`.

## Expected Behavior
- Select **Sign in with company Google account** on the login page.
- Google returns an ID token for the configured client.
- The backend verifies the token and permits only a verified `@cyberlogitec.com` identity mapped to an active employee.
- On success, the app stores its own JWT session and follows the requested route.

## Configurable Values
- `VITE_GOOGLE_CLIENT_ID`: public Google OAuth client ID used by Google Identity Services.
- `GOOGLE_CLIENT_ID`: same client ID used by backend token validation.
- `GOOGLE_ALLOWED_DOMAIN`: Workspace domain; currently `cyberlogitec.com`.

## Known Limitations
- The Google Cloud client must authorize the frontend origin in its Google Cloud Console configuration.
- Password sign-in remains available for existing accounts.
- The feature does not create employee records; HR or an administrator must provision them first.