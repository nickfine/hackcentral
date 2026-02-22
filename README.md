# HackCentral

An AI Maturity Accelerator platform that transforms early adopter experiments into reusable assets, accelerates adoption through social pull and mentorship, and makes organizational AI maturity visible and measurable.

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Convex (Database, Real-time, Server Functions)
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom components with Framer Motion animations
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm
- A Convex account (free tier available at [convex.dev](https://convex.dev))

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Convex

```bash
# Login to Convex
npx convex login

# Initialize Convex (creates a new project)
npx convex dev
```

This will:
- Create a new Convex deployment
- Generate your deployment URL
- Start the Convex development server

### 3. Configure Environment Variables

Copy the deployment URL from the terminal output and add it to `.env.local`:

```bash
# .env.local
VITE_CONVEX_URL=https://your-deployment-name.convex.cloud
```

### 4. Seed Initial Data

1. Open the Convex Dashboard: https://dashboard.convex.dev
2. Navigate to your project → Functions tab
3. Run the `seedData:seedCapabilityTags` internal mutation

This will populate the initial capability tags (AI Early Adopter, AI Power User, etc.).

### 5. Start Development Server

```bash
npm run dev
```

This starts both:
- Convex backend (watches for changes in `convex/`)
- Vite frontend (http://localhost:5173)

## 📁 Project Structure

```
HackCentral/
├── convex/                  # Convex backend
│   ├── schema.ts           # Database schema
│   ├── profiles.ts         # Profile queries/mutations
│   ├── projects.ts         # Project queries/mutations
│   ├── libraryAssets.ts    # Library queries/mutations
│   ├── capabilityTags.ts   # Capability tag queries
│   └── seedData.ts         # Seed data functions
├── src/
│   ├── components/         # React components
│   │   ├── shared/        # Shared components (Header, Sidebar, Layout)
│   │   ├── ui/            # UI primitives (buttons, inputs, etc.)
│   │   ├── dashboard/     # Dashboard components
│   │   ├── library/       # Library components
│   │   ├── people/        # People module components
│   │   └── projects/      # Project components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and configuration
│   │   ├── convex.ts      # Convex client setup
│   │   ├── design-system.ts # Design tokens
│   │   └── utils.ts       # Utility functions
│   ├── pages/             # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Library.tsx
│   │   ├── People.tsx
│   │   ├── Projects.tsx
│   │   └── Profile.tsx
│   ├── styles/            # Global styles
│   ├── types/             # TypeScript types
│   └── App.tsx            # Main app component
├── tests/                 # Test files
├── ROADMAP.md            # Complete project roadmap
├── IMPLEMENTATION_PLAN.md # Detailed implementation plan
└── CONVEX_SETUP.md       # Detailed Convex setup guide

```

## 🎨 Design system

Shared UI components and page patterns (SectionHeader, ModalWrapper, SkeletonGrid, etc.) are documented in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md). Use these for new pages and modals to keep the app consistent.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

## 🚢 Deployment

### Deploy Convex Backend

```bash
npm run convex:deploy
```

This creates a production Convex deployment. Update your production environment with the new URL.

### Deploy Frontend to Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variable: `VITE_CONVEX_URL=<your-production-convex-url>`
3. Deploy!

Vercel will automatically:
- Run `npm run build`
- Deploy the `dist/` folder
- Configure SPA routing (via `vercel.json`)

### Monitoring & feedback (Phase 4)

- **Error tracking (Sentry)**  
  Set `VITE_SENTRY_DSN` in production (e.g. in Vercel env) to report unhandled errors. Leave unset in dev. See `.env.example`.

- **Vercel Analytics**  
  Page views and Web Vitals are reported when the app is deployed on Vercel (`@vercel/analytics` is included).

- **A/B testing (lightweight)**  
  Convex env vars drive copy variants. In Convex Dashboard → Settings → Environment Variables, set `NUDGE_COPY_VARIANT=a` or `b` to switch the learning-summary nudge copy on project detail. The app uses `settings.getPublicConfig`; add more keys there to run other experiments.

## 📖 Key Concepts

### AI Maturity Dashboard
Visualizes org-wide AI maturity progress using a staged behavioral model (Experimenting → Repeating → Scaling → Transforming).

### Completed Hacks & Featured Hacks
Repository of reusable AI assets (prompts, skills, and apps) with quality gates (Draft → Verified → Deprecated).

### People Module
Pull engine for adoption - makes support visible, enables mentorship, and routes late joiners to appropriate resources.

### Projects
Track AI experiments and implementations with visibility controls (private/org/public) and anonymous submission support.

### Mentor Matching
One-click pairing system to convert early adopter energy into distributed enablement capacity.

### Recognition & Social Proof
Badges, leaderboards, and impact stories to create FOMO and measurable value visibility.

## 📚 Documentation

- [Full Roadmap](./ROADMAP.md) - Complete project vision and technical architecture
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Phased development plan
- [Convex Setup Guide](./CONVEX_SETUP.md) - Detailed Convex documentation
- [Convex Docs](https://docs.convex.dev) - Official Convex documentation
- **Progress and plans:** Active source-of-truth is `learnings.md`, `PLAN_HDC_V2_EXECUTION.md`, and `forge-native/CONTINUATION_HANDOFF.md`. Historical code reviews, plans, and checkpoint logs are in [docs/archive/](./docs/archive/README.md). Canonical runbooks and phase docs are in [docs/](./docs/README.md).

## 🎯 Success Metrics

- Accelerate from <20% to >50% regular AI-using contributors within 12 months
- Early adopters seed ≥70% of reusable AI assets
- Increasing Library reuse rate
- Increasing % of projects shipping AI artefacts

## 🤝 Contributing

This is a private organizational tool. Contributions follow the platform's own workflow:
1. Experiment with AI in your work
2. Share reusable assets to the Library
3. Help others through mentorship
4. Celebrate wins with impact stories

## 📝 License

Private/Internal Use

## 🔗 Related Resources

- [GitHub Repository](https://github.com/nickfine/hackcentral)
- [Convex Dashboard](https://dashboard.convex.dev)
