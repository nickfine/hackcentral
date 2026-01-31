# Clerk Authentication Setup

HackCentral uses Clerk for authentication, integrated with Convex.

## Quick Setup (5 minutes)

### 1. Create Clerk Account

1. Go to https://clerk.com and sign up (free tier available)
2. Create a new application
3. Choose "React" as your framework

### 2. Get Your Publishable Key

1. In the Clerk Dashboard, go to **API Keys**
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)

### 3. Add to Environment Variables

Add to `.env.local`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 4. Configure Convex Integration

In Clerk Dashboard:

1. Go to **JWT Templates**
2. Create a new template called "convex"
3. Use this configuration:

```json
{
  "aud": "convex",
  "exp": "{{token.exp}}",
  "iat": "{{token.iat}}",
  "iss": "{{token.iss}}",
  "sub": "{{user.id}}"
}
```

4. Copy the **JWKS Endpoint URL**

In Convex Dashboard (https://dashboard.convex.dev):

1. Go to your project → **Settings** → **Environment Variables**
2. Add:
   - Key: `CLERK_JWKS_URL`
   - Value: (paste the JWKS URL from Clerk)

### 5. Configure Email Domain Restriction (Optional but Recommended)

To enforce single-org assumption (only allow company email domains):

1. In Clerk Dashboard, go to **User & Authentication** → **Restrictions**
2. Enable **Email domain restrictions**
3. Add your company domain (e.g., `company.com`)
4. Save

This ensures only org members can sign up.

### 6. Customize Appearance (Optional)

Clerk provides beautiful pre-built components. Customize them:

1. Go to **Customization** → **Theme**
2. Match your brand colors
3. Adjust button styles, fonts, etc.

## Testing

1. Restart your dev servers:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:5173

3. You should see:
   - Sign In / Sign Up buttons (if not authenticated)
   - Profile setup form (on first sign in)
   - Full app (after profile creation)

## How It Works

### Authentication Flow

1. **User clicks "Sign Up"**
   - Clerk modal appears with sign up form
   - User creates account
   - Clerk redirects back to app

2. **App checks for Convex profile**
   - `useAuth()` hook checks `api.profiles.getCurrentProfile`
   - If no profile exists, shows `ProfileSetup` component

3. **User creates profile**
   - Fills out profile form (name, experience level, tags)
   - Calls `api.profiles.upsert` mutation
   - Redirects to dashboard

4. **Subsequent logins**
   - Clerk automatically logs user in
   - Profile already exists
   - Goes straight to dashboard

### Components

- **`AuthGuard`**: Protects routes, handles auth flow
- **`SignInButton`**: Clerk sign-in modal trigger
- **`SignUpButton`**: Clerk sign-up modal trigger
- **`UserButton`**: User avatar + dropdown menu
- **`ProfileSetup`**: First-time profile creation form

### Hooks

- **`useAuth()`**: Custom hook for auth state + profile
  - `isAuthenticated`: Boolean, user is signed in
  - `user`: Clerk user object
  - `profile`: Convex profile document
  - `needsProfile`: Boolean, user needs to create profile
  - `signOut()`: Function to sign out

## Troubleshooting

### "Invalid publishable key" error

- Check `.env.local` has correct `VITE_CLERK_PUBLISHABLE_KEY`
- Restart dev server after adding env vars

### "Unauthorized" when creating profile

- Verify JWKS URL is added to Convex environment variables
- Check JWT template in Clerk is named "convex"

### Profile not saving

- Open browser console for errors
- Check Convex dashboard → Logs for backend errors
- Verify `api.profiles.upsert` mutation exists

## Production Deployment

### Environment Variables

Add to Vercel (or your hosting platform):

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
```

### Clerk Production Settings

1. Switch to Production instance in Clerk Dashboard
2. Configure production domain:
   - Go to **Domains**
   - Add your production domain (e.g., `app.yourcompany.com`)
3. Update email domain restrictions for production

### Convex Production

1. Deploy Convex backend:
   ```bash
   npm run convex:deploy
   ```

2. In Convex production deployment settings:
   - Add `CLERK_JWKS_URL` environment variable (production JWKS URL)

## Security Notes

- Never commit `.env.local` (already in `.gitignore`)
- Use test keys in development, production keys in production
- Email domain restrictions help enforce org boundary
- Clerk automatically handles password security, 2FA, session management

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Convex Guide](https://docs.convex.dev/auth/clerk)
- [Convex Auth Documentation](https://docs.convex.dev/auth)
