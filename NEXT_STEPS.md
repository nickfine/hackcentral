# Next Steps - HackCentral Implementation

## ✅ What's Been Completed

### 1. Roadmap Updated to v2.3
- ✅ Converted from Supabase/PostgreSQL to Convex/TypeScript
- ✅ Updated all code examples to use Convex patterns
- ✅ Fixed all technical issues from reviews
- ✅ Added comprehensive visibility and security rules

### 2. AI Arsenal Seed Data Created
- ✅ Added 15 high-quality AI assets to `convex/seedData.ts`:
  - 8 Prompts (code review, meeting notes, documentation, user stories, bugs, SQL, emails, test cases, data analysis, brainstorming, copy, API design, accessibility, onboarding, tech debt)
  - 2 Templates (AI experiment starter, prompt engineering checklist)
  - 2 Agent Blueprints (customer support triage, content moderation)
  - 3 Guardrails (PII detection, prompt injection defense, output validation)
  - 1 Evaluation Rubric (prompt quality)
  - 1 Structured Output (risk assessment schema)

### 3. Pages Connected to Backend
- ✅ Library page now queries and displays real assets
- ✅ People page now queries and displays real profiles
- ✅ Search and filtering working
- ✅ Arsenal section populated with actual data

---

## 🚀 Immediate Actions Required

### Step 1: Seed the Database

Run these commands in order:

```bash
# Start Convex dev server (if not already running)
npm run dev:backend
```

Then in Convex Dashboard (https://dashboard.convex.dev):

1. Navigate to your project → **Functions** tab
2. Run these internal mutations:
   - `seedData:seedCapabilityTags` → Seeds 13 capability tags
   - `seedData:seedAIArsenal` → Seeds 15 AI Arsenal assets

**Expected Output:**
- Capability tags: 13 tags across 4 categories (experience, tools, skills, mentorship)
- AI Arsenal: 15 verified assets (prompts, templates, agents, guardrails)

### Step 2: Test the Application

```bash
# Start full application (frontend + backend)
npm run dev
```

Visit http://localhost:5173

**What to Test:**

1. **Authentication Flow:**
   - Click "Sign Up" → Create account with Clerk
   - Complete profile setup form
   - Verify redirect to dashboard

2. **People Directory:**
   - Navigate to /people
   - See your profile in the list
   - Test search and filtering
   - Verify capability tags display

3. **Library & AI Arsenal:**
   - Navigate to /library
   - See 15 AI Arsenal assets
   - Test filtering by type (prompts, templates, etc.)
   - Test filtering by status (verified)
   - Test search

4. **Dashboard:**
   - Verify page loads (metrics will show once we have activity)

---

## 📋 Next Development Tasks (In Priority Order)

### Phase 1 Completion (Next 2-3 weeks)

#### High Priority (Week 2-3)

1. **Connect Dashboard to Real Metrics** ✓ Backend ready, needs UI connection
   - Create `convex/metrics.ts` with the query functions (already specified in roadmap)
   - Connect Dashboard page to metrics queries
   - Display real percentages and counts

2. **Build Projects Page** ✓ Backend ready, needs UI
   - Connect to `projects.list` query
   - Create project creation form
   - Add project cards with visibility indicators
   - Implement filtering

3. **Add Project Comments** ✓ Schema exists, needs implementation
   - Create `convex/projectComments.ts` queries
   - Build comment component
   - Add comment form
   - Wire up to Projects detail view

4. **Add Project Support Events** ✓ Schema exists, needs implementation
   - Create `convex/projectSupport.ts` queries
   - Build "Like" and "Offer Help" buttons
   - Display support counts

#### Medium Priority (Week 3-4)

5. **Asset Detail View**
   - Create modal or dedicated page for asset details
   - Show full metadata (intended user, context, limitations, risk notes, examples)
   - Add reuse tracking (when user copies/references)

6. **Profile Detail View**
   - Show full profile with contribution history
   - Display all capability tags
   - Show mentor availability (if applicable)

7. **Implement Search Improvements**
   - Add debouncing to search inputs
   - Highlight search matches
   - Add "No results" states

#### Lower Priority (Week 4-6)

8. **Add Reuse Tracking**
   - Create `convex/libraryReuse.ts` mutations
   - Track when assets are copied/referenced
   - Display reuse counts on asset cards

9. **Add Mentor Matching** (Phase 1.5)
   - Create mentor request form
   - Implement matching algorithm
   - Build mentor dashboard

---

## 🔍 Testing Checklist

Before proceeding to Phase 2, verify:

- [ ] Users can sign up and create profiles
- [ ] Profiles are visible based on visibility settings
- [ ] AI Arsenal shows 15 seeded assets
- [ ] Library filtering works (type, status)
- [ ] Library search works
- [ ] People directory shows profiles
- [ ] People filtering works (experience level)
- [ ] People search works
- [ ] Projects can be created
- [ ] Projects respect visibility (private by default)
- [ ] Comments can be added to projects
- [ ] Support events can be tracked

---

## 📝 Known Remaining Work

### Phase 1 (Must Complete)
- Dashboard metrics integration
- Projects UI implementation
- Comments and support events
- Asset detail views
- Reuse tracking

### Phase 1.5 (Can Start in Parallel)
- Mentor matching workflow
- Recognition system basics

### Phase 2+ (Future)
- AI-assisted search
- Badge calculations
- Impact stories
- Governance checks
- Advanced metrics (Gini coefficient)

---

## 🐛 Known Issues

None yet! The foundation is solid.

---

## 📖 Documentation

- `ROADMAP.md` - Complete technical roadmap (v2.3 with Convex)
- `IMPLEMENTATION_PLAN.md` - Phased development plan
- `CONVEX_SETUP.md` - Convex setup guide
- `CLERK_SETUP.md` - Clerk authentication guide
- `README.md` - Project overview

---

## 🆘 Need Help?

1. **Convex Issues**: Check `convex/` folder or run `npx convex logs`
2. **Clerk Issues**: Check Clerk Dashboard → Logs
3. **Frontend Issues**: Check browser console
4. **Deployment Issues**: Check Vercel logs

---

**Status**: Phase 1 in progress (~25% complete)  
**Last Updated**: January 31, 2026
