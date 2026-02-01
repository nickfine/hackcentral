/**
 * AI 101 Micro-guide - Static content for new users
 */

import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { SectionHeader } from '@/components/shared';

export default function Guide() {
  return (
    <div className="min-w-0 space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="btn btn-ghost btn-sm inline-flex items-center gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <SectionHeader
        title="AI 101 micro-guide"
        description="A short intro to AI hacks and how to use HackDay Central."
      />

      <section className="space-y-4">
        <h2 className="font-semibold text-lg">What are AI hacks?</h2>
        <p className="text-muted-foreground">
          AI hacks are reusable building blocks for AI-assisted work: prompts, skills, and apps. They live in <strong>Completed Hacks</strong> and can be
          attached to <strong>Hacks In Progress</strong> so your team reuses what works instead of starting from scratch.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg">How do I reuse a hack?</h2>
        <p className="text-muted-foreground">
          Go to <Link to="/hacks?tab=completed" className="text-primary underline">Completed Hacks</Link> and open the
          <strong> Featured Hacks</strong> for curated, verified hacks. Click a hack to see its content and
          description. Use &quot;I used this&quot; to record that you copied, referenced, or linked it—and
          optionally attach it to a hack in progress so it counts toward project AI adoption.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg">How do I contribute?</h2>
        <p className="text-muted-foreground">
          Submit a new hack from Completed Hacks (&quot;Submit Hack&quot;). Start as In progress, then mark it
          verified when it&apos;s ready for others. Attach hacks to your <Link to="/hacks?tab=in_progress" className="text-primary underline">Hacks In Progress</Link> so
          your work is visible on the Dashboard and in metrics. Share impact stories from the Dashboard
          to tell others how AI helped.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg">Where to go next</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2">
          <li><Link to="/hacks?tab=completed" className="text-primary underline">Completed Hacks</Link> — Browse and submit AI hacks</li>
          <li><Link to="/hacks?tab=completed&arsenal=true" className="text-primary underline">Featured Hacks</Link> — Curated, high-trust hacks</li>
          <li><Link to="/hacks?tab=in_progress" className="text-primary underline">Hacks In Progress</Link> — Create projects and attach hacks</li>
          <li><Link to="/onboarding" className="text-primary underline">Get started</Link> — All onboarding paths</li>
        </ul>
      </section>

      <div className="pt-4">
        <Link to="/dashboard" className="btn btn-primary inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
