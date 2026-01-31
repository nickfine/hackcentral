# 🔧 Fix Authentication Issue

## Problem
You're seeing this error when trying to create a profile:
```
Failed to load resource: the server responded with a status of 404 ()
balanced-hound-26.clerk.accounts.dev/v1/client/sessions/.../tokens/convex

[CONVEX M(profiles:upsert)] Server Error
Uncaught Error: Not authenticated
```

## Root Cause
Clerk and Convex aren't properly connected. Clerk needs a JWT template named "convex" to issue tokens that Convex can verify.

---

## ✅ Solution (5 minutes)

### Step 1: Create Convex JWT Template in Clerk

1. Open your **Clerk Dashboard**: https://dashboard.clerk.com
2. Select your application (should see "balanced-hound-26")
3. In the sidebar, go to: **Configure** → **JWT Templates**
4. Click **+ New template** button
5. Configure the template:
   - **Name**: `convex` (must be exactly this, lowercase)
   - **Token Lifetime**: 3600 (default is fine)
   - **Claims**: Paste this JSON:

```json
{
  "aud": "convex",
  "exp": "{{token.exp}}",
  "iat": "{{token.iat}}",
  "iss": "{{token.iss}}",
  "sub": "{{user.id}}"
}
```

6. Click **Apply Changes** / **Save**
7. **IMPORTANT**: You'll see a **JWKS Endpoint URL** - copy this entire URL
   - It looks like: `https://balanced-hound-26.clerk.accounts.dev/.well-known/jwks.json`

### Step 2: Add JWKS URL to Convex

1. Open your **Convex Dashboard**: https://dashboard.convex.dev/d/tangible-ocelot-341
2. Click **Settings** in the sidebar
3. Click **Environment Variables** tab
4. Click **+ Add Variable** button
5. Add this variable:
   - **Name**: `CLERK_JWKS_URL`
   - **Value**: (paste the JWKS URL you copied from Clerk)
   - Example: `https://balanced-hound-26.clerk.accounts.dev/.well-known/jwks.json`
6. Click **Save**

### Step 3: Restart Dev Servers

Run this in your terminal:

```bash
cd "/Volumes/Extreme Pro/HackCentral"
npm run dev
```

---

## ✅ Test the Fix

1. Visit http://localhost:5173
2. Click **Sign In** (or **Sign Up** if you haven't already)
3. Complete the profile setup form
4. You should now see the dashboard with no errors!

---

## 🔍 How to Verify It's Working

### In Browser Console (should NOT see):
- ❌ `404` errors for `tokens/convex`
- ❌ `Not authenticated` errors

### In Browser Console (should see):
- ✅ `[vite] connected`
- ✅ Clerk loads without JWT errors
- ✅ Profile saves successfully

### In Convex Dashboard → Logs:
- ✅ You'll see successful `profiles:upsert` calls
- ✅ No authentication errors

---

## 📚 What This Does

**Before:**
1. User signs in with Clerk ✅
2. App tries to call Convex functions ❌
3. Clerk can't issue Convex token (no template) ❌
4. Convex rejects request (can't verify user) ❌
5. Error: "Not authenticated" ❌

**After:**
1. User signs in with Clerk ✅
2. App tries to call Convex functions ✅
3. Clerk issues JWT using "convex" template ✅
4. Convex verifies JWT using JWKS URL ✅
5. User authenticated, mutations work! ✅

---

## ⚠️ Common Issues

### Issue: Still seeing 404 errors after creating template
**Fix**: Make sure template name is exactly `convex` (lowercase, no spaces)

### Issue: Template created but still errors
**Fix**: Did you add the JWKS URL to Convex env vars? Check Settings → Environment Variables

### Issue: "Invalid JWKS URL" in Convex
**Fix**: Copy the EXACT URL from Clerk (including `https://` and `.well-known/jwks.json`)

### Issue: Works on first try, then fails
**Fix**: Restart both dev servers (frontend + backend)

---

## 🎉 Once Fixed

You'll be able to:
- ✅ Sign up and create profiles
- ✅ Browse the Library (24 AI Arsenal assets seeded)
- ✅ Browse People directory
- ✅ Create projects
- ✅ Add comments and support events

Everything is ready - just need this authentication connection!
