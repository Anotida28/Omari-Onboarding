# Omari-Onboarding

This repository is now set up as a simple full-stack starter project with:

- `backend/` for the API
- `frontend/` for the React app
- `media/` for your existing images and design assets

## Project structure

```text
Omari-Onboarding/
├── backend/
├── frontend/
├── media/
├── .gitignore
└── README.md
```

## Quick start

1. Install backend dependencies:
   `cd backend && npm install`
2. Install frontend dependencies:
   `cd ../frontend && npm install`
3. Start the backend:
   `cd ../backend && npm run dev`
4. Start the frontend:
   `cd ../frontend && npm start`

The frontend expects the backend at `http://localhost:5000`.

## Internal gateway for local development

Internal sign-in now expects real gateway configuration. Set `INTERNAL_AUTH_API_URL` and `INTERNAL_ACCESS_API_BASE_URL` to your AD-backed authentication and access endpoints.

Internal sign-in is gateway-only. Local or break-glass internal login is no longer used by the `/api/auth/internal/login` flow.

If you explicitly want the local mock for development, turn on `INTERNAL_GATEWAY_MOCK_ENABLED=true`.

Default mock internal accounts:

- `gateway.reviewer` / `Omari123!`
- `gateway.intake` / `Omari123!`
- `gateway.opslead` / `Omari123!`

You can override those users through `backend/.env` with `INTERNAL_GATEWAY_MOCK_USERS_JSON`. Use a JSON array shaped like:

```json
[
  {
    "username": "gateway.reviewer",
    "password": "Omari123!",
    "fullName": "Internal Reviewer",
    "email": "gateway.reviewer@omari.local",
    "mobileNumber": "+263771000101",
    "accessProfile": "review_ops",
    "externalReference": "EMP-1001",
    "hasPortalAccess": true
  }
]
```
