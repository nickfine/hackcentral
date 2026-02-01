/**
 * AI 101 Micro-guide - Static content for new users
 */

import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, ArrowLeft } from 'lucide-react';

export default function Guide() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="btn btn-ghost btn-sm inline-flex items-center gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          AI 101 micro-guide
        </h1>
        <p className="text-muted-foreground mt-1">
          A short intro to AI assets and how to use HackDay Central.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg">What are AI assets?</h2>
        <p className="text-muted-foreground">
          AI assets are reusable building blocks for AI-assisted work: prompts, skills, and apps. They live in the <strong>Library</strong> and can be
          attached to <strong>Projects</strong> so your team reuses what works instead of starting from scratch.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg">How do I reuse an asset?</h2>
        <p className="text-muted-foreground">
          Go to the <Link to="/library" className="text-primary underline">Library</Link> and open the
          <strong> AI Arsenal</strong> for curated, verified assets. Click an asset to see its content and
          description. Use &quot;I used this&quot; to record that you copied, referenced, or linked it—and
          optionally attach it to a project so it counts toward project AI adoption.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg">How do I contribute?</h2>
        <p className="text-muted-foreground">
          Submit a new asset from the Library (&quot;Submit Asset&quot;). Start as a draft, then mark it
          verified when it&apos;s ready for others. Attach assets to your <Link to="/projects" className="text-primary underline">Projects</Link> so
          your work is visible on the Dashboard and in metrics. Share impact stories from the Dashboard
          to tell others how AI helped.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg">Where to go next</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2">
          <li><Link to="/library" className="text-primary underline">Library</Link> — Browse and submit AI assets</li>
          <li><Link to="/library?arsenal=true" className="text-primary underline">AI Arsenal</Link> — Curated, high-trust assets</li>
          <li><Link to="/projects" className="text-primary underline">Projects</Link> — Create projects and attach assets</li>
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
