/**
 * Onboarding Page - Get started paths for new users
 * Paths: AI Experiment Starter, Copilot prompt pack, Reuse Featured Hacks item; link to AI 101 guide.
 */

import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, Library, FileText, Bot, ArrowRight } from 'lucide-react';

export default function Onboarding() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Get started</h1>
        <p className="text-muted-foreground mt-1">
          Choose a path to start using AI hacks in your work.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/library?arsenal=true"
          className="card p-6 hover:shadow-md transition-shadow flex flex-col"
        >
          <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-semibold text-lg mb-2">AI Experiment Starter template</h2>
          <p className="text-muted-foreground text-sm mb-4 flex-1">
            Start a new AI experiment with proper structure and risk assessment. Find it in Featured Hacks.
          </p>
          <span className="text-primary text-sm font-medium inline-flex items-center gap-1">
            Open Featured Hacks <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          to="/library?arsenal=true"
          className="card p-6 hover:shadow-md transition-shadow flex flex-col"
        >
          <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-semibold text-lg mb-2">Copilot prompt pack for your role</h2>
          <p className="text-muted-foreground text-sm mb-4 flex-1">
            Curated prompts, skills, and apps by use case: code review, meeting notes, docs, and more.
          </p>
          <span className="text-primary text-sm font-medium inline-flex items-center gap-1">
            Browse Featured Hacks <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          to="/library?arsenal=true"
          className="card p-6 hover:shadow-md transition-shadow flex flex-col"
        >
          <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
            <Library className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-semibold text-lg mb-2">Reuse a Featured Hacks item</h2>
          <p className="text-muted-foreground text-sm mb-4 flex-1">
            Copy first, create later. Start by reusing a verified prompt, skill, or app from Completed Hacks.
          </p>
          <span className="text-primary text-sm font-medium inline-flex items-center gap-1">
            Explore Completed Hacks <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      <div className="card p-6 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg mb-1">AI 101 micro-guide</h2>
            <p className="text-muted-foreground text-sm mb-4">
              New to AI hacks? Learn what they are, how to reuse them, and how to contribute.
            </p>
            <Link to="/guide" className="btn btn-primary btn-sm inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Read the guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
