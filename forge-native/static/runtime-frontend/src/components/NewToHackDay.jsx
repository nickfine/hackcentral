/**
 * New to HackDay? Page
 * Onboarding guide and narrative flow for first-time participants
 */

import { useState } from 'react';
import {
  Users,
  ArrowRight,
  Code,
  Send,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, Button } from './ui';
import { BackButton } from './shared';
import EditableText from '../configMode/EditableText';
import EditableTextArea from '../configMode/EditableTextArea';
import heroArtwork from '../assets/new-to-hackday-hero-engaging.png';
import stepTeamArtwork from '../assets/new-to-hackday-step-team.svg';
import stepBuildArtwork from '../assets/new-to-hackday-step-build.svg';
import stepSubmitArtwork from '../assets/new-to-hackday-step-submit.svg';

const ONBOARDING_STEPS = [
  {
    id: 'step1',
    title: 'Join or Create an Idea',
    titleKey: 'newToHackday.journey.step1.title',
    description: 'Find teammates in the marketplace or post your own concept. Teams can have 2-6 members.',
    descriptionKey: 'newToHackday.journey.step1.description',
    icon: Users,
    action: 'Open Idea Marketplace',
    actionRoute: 'marketplace',
    estimatedTime: '~15 min',
    estimatedTimeKey: 'newToHackday.journey.step1.estimatedTime',
    outcome: 'Leave this step with a committed team and direction.',
    outcomeKey: 'newToHackday.journey.step1.outcome',
    doNowLabel: 'Do this now',
    doNowLabelKey: 'newToHackday.journey.step1.doNowLabel',
    artwork: stepTeamArtwork,
    accent: {
      track: 'bg-cyan-400/70',
      badge: 'bg-cyan-400/15 border-cyan-300/35 text-cyan-300',
      icon: 'text-cyan-300',
      outcome: 'text-cyan-300/90',
    },
  },
  {
    id: 'step2',
    title: 'Build Your Project',
    titleKey: 'newToHackday.journey.step2.title',
    description: 'Turn your idea into a working prototype and keep your team moving against the clock.',
    descriptionKey: 'newToHackday.journey.step2.description',
    icon: Code,
    action: 'Use Rules Checklist',
    actionRoute: 'rules',
    estimatedTime: '~20 hrs',
    estimatedTimeKey: 'newToHackday.journey.step2.estimatedTime',
    outcome: 'Leave this step with a polished demo and clear story.',
    outcomeKey: 'newToHackday.journey.step2.outcome',
    doNowLabel: 'Do this now',
    doNowLabelKey: 'newToHackday.journey.step2.doNowLabel',
    artwork: stepBuildArtwork,
    accent: {
      track: 'bg-violet-400/70',
      badge: 'bg-violet-400/15 border-violet-300/35 text-violet-300',
      icon: 'text-violet-300',
      outcome: 'text-violet-300/90',
    },
  },
  {
    id: 'step3',
    title: 'Submit With Confidence',
    titleKey: 'newToHackday.journey.step3.title',
    description: 'Upload your demo video, repository link, and final project narrative before the deadline.',
    descriptionKey: 'newToHackday.journey.step3.description',
    icon: Send,
    action: 'Open Submission',
    actionRoute: 'submission',
    estimatedTime: '~30 min',
    estimatedTimeKey: 'newToHackday.journey.step3.estimatedTime',
    outcome: 'Leave this step with a complete judging-ready entry.',
    outcomeKey: 'newToHackday.journey.step3.outcome',
    doNowLabel: 'Do this now',
    doNowLabelKey: 'newToHackday.journey.step3.doNowLabel',
    artwork: stepSubmitArtwork,
    accent: {
      track: 'bg-orange-400/70',
      badge: 'bg-orange-400/15 border-orange-300/35 text-orange-300',
      icon: 'text-orange-300',
      outcome: 'text-orange-300/90',
    },
  },
];

const HERO_STATS = [
  {
    id: 'buildWindow',
    value: '24h',
    valueKey: 'newToHackday.stats.buildWindow.value',
    label: 'Build window',
    labelKey: 'newToHackday.stats.buildWindow.label',
  },
  {
    id: 'teamSize',
    value: '2-6',
    valueKey: 'newToHackday.stats.teamSize.value',
    label: 'Team size',
    labelKey: 'newToHackday.stats.teamSize.label',
  },
  {
    id: 'demoLimit',
    value: '3 min',
    valueKey: 'newToHackday.stats.demoLimit.value',
    label: 'Demo limit',
    labelKey: 'newToHackday.stats.demoLimit.label',
  },
];

const FIRST_30_MINUTES = [
  {
    id: 'step1',
    window: '0-10 min',
    windowKey: 'newToHackday.first30.step1.window',
    title: 'Open Ideas',
    titleKey: 'newToHackday.first30.step1.title',
    detail: 'Scan active concepts and either join one quickly or post your own.',
    detailKey: 'newToHackday.first30.step1.detail',
  },
  {
    id: 'step2',
    window: '10-20 min',
    windowKey: 'newToHackday.first30.step2.window',
    title: 'Lock Team + Scope',
    titleKey: 'newToHackday.first30.step2.title',
    detail: 'Confirm who is building, what you are shipping, and what success looks like.',
    detailKey: 'newToHackday.first30.step2.detail',
  },
  {
    id: 'step3',
    window: '20-30 min',
    windowKey: 'newToHackday.first30.step3.window',
    title: 'Start Build Plan',
    titleKey: 'newToHackday.first30.step3.title',
    detail: 'Use Rules as your checklist, split owners, and begin prototype work.',
    detailKey: 'newToHackday.first30.step3.detail',
  },
];

const KEY_RULES = [
  {
    id: 'rule1',
    title: 'Team Formation',
    titleKey: 'newToHackday.keyRules.rule1.title',
    description: 'Teams must include at least 2 and no more than 6 participants.',
    descriptionKey: 'newToHackday.keyRules.rule1.description',
    icon: Users,
  },
  {
    id: 'rule2',
    title: 'Time Limit',
    titleKey: 'newToHackday.keyRules.rule2.title',
    description: 'All project work must be completed during the official HackDay window.',
    descriptionKey: 'newToHackday.keyRules.rule2.description',
    icon: Calendar,
  },
  {
    id: 'rule3',
    title: 'Submission Essentials',
    titleKey: 'newToHackday.keyRules.rule3.title',
    description: 'Submit source code, a demo video, repository link, and short project description.',
    descriptionKey: 'newToHackday.keyRules.rule3.description',
    icon: Send,
  },
];

const SOCIAL_PROOF = [
  {
    id: 'item1',
    title: 'Cross-skill teams',
    titleKey: 'newToHackday.socialProof.item1.title',
    description: 'Top projects usually pair builders, designers, and storytellers early.',
    descriptionKey: 'newToHackday.socialProof.item1.description',
  },
  {
    id: 'item2',
    title: 'Fast feedback loops',
    titleKey: 'newToHackday.socialProof.item2.title',
    description: 'Winning teams validate ideas with peers throughout the day.',
    descriptionKey: 'newToHackday.socialProof.item2.description',
  },
  {
    id: 'item3',
    title: 'Strong final demos',
    titleKey: 'newToHackday.socialProof.item3.title',
    description: 'Clear problem framing and demo narrative consistently improve scores.',
    descriptionKey: 'newToHackday.socialProof.item3.description',
  },
];

const FAQ_ITEMS = [
  {
    id: 'item1',
    question: 'What if I do not have a team?',
    questionKey: 'newToHackday.faq.item1.question',
    answer: 'Start in the Marketplace, join an existing concept, or create your own and recruit teammates quickly.',
    answerKey: 'newToHackday.faq.item1.answer',
  },
  {
    id: 'item2',
    question: 'Can I work solo?',
    questionKey: 'newToHackday.faq.item2.question',
    answer: 'No. Teams must have at least 2 members. If you are only observing, join the Observers group.',
    answerKey: 'newToHackday.faq.item2.answer',
  },
  {
    id: 'item3',
    question: 'What should I build?',
    questionKey: 'newToHackday.faq.item3.question',
    answer: 'Build something aligned with the HackDay theme that is clear, useful, and demo-friendly.',
    answerKey: 'newToHackday.faq.item3.answer',
  },
  {
    id: 'item4',
    question: 'What happens after I submit?',
    questionKey: 'newToHackday.faq.item4.question',
    answer: 'Judges review submissions and participants can vote for the People\'s Choice award.',
    answerKey: 'newToHackday.faq.item4.answer',
  },
];

function NewToHackDay({ onNavigate }) {
  const [expandedFaqId, setExpandedFaqId] = useState('item1');

  return (
    <div className="max-w-7xl mx-auto px-4 pb-28 pt-4 sm:px-6 sm:pb-16 lg:px-8">
      <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />

      <section className="mt-5">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          <Card
            padding="lg"
            className="xl:col-span-7 relative overflow-hidden border border-arena-border h-full bg-[linear-gradient(145deg,rgba(124,58,237,0.12),rgba(2,6,23,0.92)_45%,rgba(249,115,22,0.12))]"
          >
            <div className="absolute -top-20 -left-8 w-56 h-56 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 right-2 w-56 h-56 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

            <div className="relative">
              <EditableText
                contentKey="newToHackday.hero.label"
                fallback="Overview"
                as="p"
                displayClassName="mb-3 text-[11px] sm:text-xs"
              />
              <EditableText
                contentKey="newToHackday.hero.title"
                fallback="New to HackDay?"
                as="h1"
                displayClassName="text-[2.2rem] sm:text-5xl lg:text-6xl font-black tracking-tight text-text-primary leading-[1.02]"
              />
              <EditableTextArea
                contentKey="newToHackday.hero.subtitle"
                fallback="Follow one clear path: find your team, build a focused demo, and submit with confidence before time runs out."
                as="p"
                rows={3}
                displayClassName="mt-5 text-[15px] sm:text-lg leading-relaxed text-text-secondary max-w-xl"
              />

              <div className="mt-7 flex flex-wrap gap-2">
                <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-arena-elevated border border-arena-border text-sm text-text-secondary">
                  <EditableText
                    contentKey="newToHackday.hero.pathIdeas"
                    fallback="1. Ideas"
                    as="span"
                    displayClassName="inline"
                  />
                </div>
                <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-arena-elevated border border-arena-border text-sm text-text-secondary">
                  <EditableText
                    contentKey="newToHackday.hero.pathBuild"
                    fallback="2. Build"
                    as="span"
                    displayClassName="inline"
                  />
                </div>
                <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-arena-elevated border border-arena-border text-sm text-text-secondary">
                  <EditableText
                    contentKey="newToHackday.hero.pathSubmit"
                    fallback="3. Submit"
                    as="span"
                    displayClassName="inline"
                  />
                </div>
              </div>

              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => onNavigate('marketplace')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Begin Step 1: Ideas
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => onNavigate('schedule')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  View Event Timeline
                </Button>
              </div>
              <EditableTextArea
                contentKey="newToHackday.hero.recommendedFlow"
                fallback="Recommended flow: Ideas first, then Build, then Submit."
                as="p"
                rows={2}
                displayClassName="mt-4 text-xs sm:text-sm text-text-muted"
              />
            </div>
          </Card>

          <Card padding="none" className="xl:col-span-5 overflow-hidden border border-arena-border h-full">
            <div className="relative h-full min-h-[300px] sm:min-h-[420px]">
              <img
                src={heroArtwork}
                alt="HackDay journey: innovate and imagine, collaborate and build, then share and execute"
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out"
              />
            </div>
          </Card>
        </div>
      </section>

      <section className="mt-8 sm:mt-10">
        <EditableText
          contentKey="newToHackday.stats.label"
          fallback="At a glance"
          as="p"
          frameClassName="mx-auto w-fit"
          displayClassName="text-center text-xs sm:text-sm uppercase tracking-[0.08em] text-text-muted mb-3"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {HERO_STATS.map((stat) => (
            <Card key={stat.id} padding="md" className="text-center bg-arena-elevated/80">
              <EditableText
                contentKey={stat.valueKey}
                fallback={stat.value}
                as="p"
                displayClassName="text-2xl sm:text-3xl font-black text-text-primary"
              />
              <EditableText
                contentKey={stat.labelKey}
                fallback={stat.label}
                as="p"
                displayClassName="mt-1 text-xs sm:text-sm uppercase tracking-[0.08em] text-text-muted"
              />
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10 sm:mt-14">
        <Card padding="lg" className="overflow-hidden border border-arena-border">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <EditableText
                contentKey="newToHackday.first30.label"
                fallback="Overview"
                as="p"
                displayClassName="mb-2 text-sm"
              />
              <Card.Title className="text-2xl sm:text-3xl">
                <EditableText
                  contentKey="newToHackday.first30.title"
                  fallback="Your First 30 Minutes"
                  as="span"
                  displayClassName="inline"
                />
              </Card.Title>
              <EditableTextArea
                contentKey="newToHackday.first30.subtitle"
                fallback="If you are new, use this exact sequence to move from uncertainty to momentum fast."
                as="p"
                rows={3}
                displayClassName="mt-2 text-sm sm:text-base text-text-secondary max-w-2xl"
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => onNavigate('marketplace')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start in Ideas
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            {FIRST_30_MINUTES.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-arena-border bg-arena-elevated/80 p-4 sm:p-5">
                <EditableText
                  contentKey={item.windowKey}
                  fallback={item.window}
                  as="p"
                  displayClassName="text-[11px] uppercase tracking-[0.08em] text-text-muted mb-2"
                />
                <h3 className="text-base sm:text-lg font-bold text-text-primary mb-1">
                  {index + 1}.{' '}
                  <EditableText
                    contentKey={item.titleKey}
                    fallback={item.title}
                    as="span"
                    displayClassName="inline"
                  />
                </h3>
                <EditableTextArea
                  contentKey={item.detailKey}
                  fallback={item.detail}
                  as="p"
                  rows={3}
                  displayClassName="text-sm text-text-secondary leading-relaxed"
                />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-12 sm:mt-20">
        <div className="mb-7 h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />
        <div className="text-center">
          <EditableText
            contentKey="newToHackday.journey.label"
            fallback="Action"
            as="p"
            frameClassName="mx-auto w-fit"
            displayClassName="mb-2 text-sm"
          />
          <EditableText
            contentKey="newToHackday.journey.title"
            fallback="Your 3-Step HackDay Journey"
            as="h2"
            frameClassName="mx-auto"
            displayClassName="text-2xl sm:text-3xl font-black tracking-tight text-text-primary"
          />
        </div>
        <EditableTextArea
          contentKey="newToHackday.journey.subtitle"
          fallback="Move through these steps in order. Each step has a clear outcome so your team always knows what to do next."
          as="p"
          rows={3}
          frameClassName="mx-auto max-w-2xl"
          displayClassName="mt-3 text-sm sm:text-base text-text-secondary max-w-2xl mx-auto text-center"
        />

        <div className="relative mt-8">
          <div className="hidden md:block absolute left-[15%] right-[15%] top-6 h-px bg-gradient-to-r from-cyan-400/35 via-brand/45 to-orange-400/35" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {ONBOARDING_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card
                  key={step.id}
                  padding="md"
                  hoverable
                  className="relative overflow-hidden h-full"
                  style={{ borderColor: 'var(--glass-item-border)' }}
                >
                  <div className={`h-1 w-full rounded-full mb-4 ${step.accent.track}`} />
                  <div className="relative h-full flex flex-col">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="inline-flex items-center gap-2">
                        <div className={`w-12 h-12 rounded-full border flex items-center justify-center ${step.accent.badge}`}>
                          <span className="text-xl font-black">{index + 1}</span>
                        </div>
                        <div
                          className="w-9 h-9 rounded-lg bg-arena-elevated border flex items-center justify-center"
                          style={{ borderColor: 'var(--glass-item-border)' }}
                        >
                          <Icon className={`w-4 h-4 ${step.accent.icon}`} />
                        </div>
                      </div>
                      <EditableText
                        contentKey={step.estimatedTimeKey}
                        fallback={step.estimatedTime}
                        as="span"
                        displayClassName="text-xs font-bold uppercase tracking-[0.08em] text-text-muted"
                      />
                    </div>

                    <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: 'var(--glass-item-border)' }}>
                      <img
                        src={step.artwork}
                        alt={`${step.title} visual guide`}
                        className="w-full h-32 object-cover"
                      />
                    </div>

                    <EditableText
                      contentKey={step.titleKey}
                      fallback={step.title}
                      as="h3"
                      displayClassName="text-xl font-bold text-text-primary leading-tight mb-2"
                    />
                    <EditableTextArea
                      contentKey={step.descriptionKey}
                      fallback={step.description}
                      as="p"
                      rows={4}
                      displayClassName="text-sm sm:text-base leading-relaxed text-text-secondary flex-1"
                    />
                    <EditableTextArea
                      contentKey={step.outcomeKey}
                      fallback={step.outcome}
                      as="p"
                      rows={3}
                      displayClassName={`text-sm mt-3 mb-4 ${step.accent.outcome}`}
                    />

                    <EditableText
                      contentKey={step.doNowLabelKey}
                      fallback={step.doNowLabel}
                      as="p"
                      displayClassName="text-[11px] uppercase tracking-[0.08em] text-text-muted mb-2"
                    />
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      onClick={() => onNavigate(step.actionRoute)}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {step.action}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-12 sm:mt-20">
        <div className="mb-7 h-px bg-gradient-to-r from-transparent via-violet-300/35 to-transparent" />
        <Card padding="lg" className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-7">
              <EditableText
                contentKey="newToHackday.keyRules.label"
                fallback="Rules"
                as="p"
                frameClassName="mx-auto lg:mx-0 w-fit"
                displayClassName="mb-2 text-sm text-center lg:text-left"
              />
              <Card.Title className="text-2xl sm:text-3xl mb-3 text-center lg:text-left">
                <EditableText
                  contentKey="newToHackday.keyRules.title"
                  fallback="Key Rules You Must Get Right"
                  as="span"
                  displayClassName="inline"
                />
              </Card.Title>
              <EditableTextArea
                contentKey="newToHackday.keyRules.subtitle"
                fallback="Keep these three rules locked in and you will avoid most first-time submission mistakes."
                as="p"
                rows={3}
                displayClassName="text-sm sm:text-base leading-relaxed text-text-secondary mb-5 max-w-2xl text-center lg:text-left"
              />

              <div className="space-y-3">
                {KEY_RULES.map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <div
                      key={rule.id}
                      className="flex gap-3 p-4 sm:p-5 bg-arena-elevated/90 rounded-xl border border-arena-border"
                    >
                      <div className="w-10 h-10 rounded-lg bg-arena-card border border-arena-border flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-text-secondary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <EditableText
                          contentKey={rule.titleKey}
                          fallback={rule.title}
                          as="h3"
                          displayClassName="text-base sm:text-lg font-bold text-text-primary mb-1"
                        />
                        <EditableTextArea
                          contentKey={rule.descriptionKey}
                          fallback={rule.description}
                          as="p"
                          rows={3}
                          displayClassName="text-sm sm:text-base text-text-secondary leading-relaxed"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => onNavigate('rules')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Open Full Rules Checklist
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full rounded-2xl border border-arena-border p-5 sm:p-6 bg-arena-elevated shadow-sm">
                <EditableText
                  contentKey="newToHackday.socialProof.heading"
                  fallback="What successful teams do"
                  as="p"
                  displayClassName="text-xs uppercase tracking-[0.1em] text-text-muted mb-3"
                />
                <div className="space-y-3">
                  {SOCIAL_PROOF.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-arena-border bg-arena-card">
                      <EditableText
                        contentKey={item.titleKey}
                        fallback={item.title}
                        as="h3"
                        displayClassName="font-bold text-text-primary text-base mb-1"
                      />
                      <EditableTextArea
                        contentKey={item.descriptionKey}
                        fallback={item.description}
                        as="p"
                        rows={3}
                        displayClassName="text-sm text-text-secondary leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 rounded-xl border border-arena-border bg-brand/10">
                  <EditableText
                    contentKey="newToHackday.socialProof.quickStart.title"
                    fallback="Need a quick start?"
                    as="p"
                    displayClassName="text-sm text-text-primary font-bold"
                  />
                  <EditableTextArea
                    contentKey="newToHackday.socialProof.quickStart.subtitle"
                    fallback="Use this sequence and you will stay on track:"
                    as="p"
                    rows={2}
                    displayClassName="text-sm text-text-secondary mt-1"
                  />
                  <ol className="mt-2 space-y-1 text-sm text-text-secondary">
                    <li>
                      <EditableText
                        contentKey="newToHackday.socialProof.quickStart.step1"
                        fallback="1. Open Ideas and lock your team."
                        as="span"
                        displayClassName="inline"
                      />
                    </li>
                    <li>
                      <EditableText
                        contentKey="newToHackday.socialProof.quickStart.step2"
                        fallback="2. Use Rules as your build checklist."
                        as="span"
                        displayClassName="inline"
                      />
                    </li>
                    <li>
                      <EditableText
                        contentKey="newToHackday.socialProof.quickStart.step3"
                        fallback="3. Submit before deadline with demo + repo."
                        as="span"
                        displayClassName="inline"
                      />
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-12 sm:mt-16">
        <div className="mb-7 h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />
        <Card padding="lg">
          <EditableText
            contentKey="newToHackday.faq.label"
            fallback="FAQ"
            as="p"
            frameClassName="mx-auto w-fit"
            displayClassName="mb-2 text-sm text-center"
          />
          <Card.Title className="text-2xl sm:text-3xl mb-3 text-center">
            <EditableText
              contentKey="newToHackday.faq.title"
              fallback="Frequently Asked Questions"
              as="span"
              displayClassName="inline"
            />
          </Card.Title>
          <EditableTextArea
            contentKey="newToHackday.faq.subtitle"
            fallback="Quick answers to remove blockers and keep your team moving."
            as="p"
            rows={3}
            frameClassName="mx-auto max-w-2xl"
            displayClassName="text-sm sm:text-base leading-relaxed text-text-secondary mb-5 max-w-2xl mx-auto text-center"
          />

          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => {
              const isOpen = expandedFaqId === item.id;
              const faqAnswerId = `faq-answer-${item.id}`;
              return (
                <div key={item.id} className="rounded-xl border border-arena-border bg-arena-elevated/80 overflow-hidden">
                  <div className="w-full px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
                    <EditableText
                      contentKey={item.questionKey}
                      fallback={item.question}
                      as="p"
                      frameClassName="flex-1"
                      displayClassName="font-bold text-base sm:text-lg text-text-primary"
                    />
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-arena-border bg-arena-card px-2.5 py-2 text-text-muted hover:text-text-primary"
                      onClick={() => setExpandedFaqId(isOpen ? '' : item.id)}
                      aria-expanded={isOpen}
                      aria-controls={faqAnswerId}
                      aria-label={isOpen ? 'Collapse answer' : 'Expand answer'}
                    >
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 flex-shrink-0" />
                      )}
                    </button>
                  </div>

                  <div
                    id={faqAnswerId}
                    className={`grid transition-all duration-200 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  >
                    <div className="overflow-hidden">
                      <EditableTextArea
                        contentKey={item.answerKey}
                        fallback={item.answer}
                        as="p"
                        rows={4}
                        displayClassName="px-4 sm:px-5 pb-4 text-sm sm:text-base leading-relaxed text-text-secondary"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="mt-10 sm:mt-12">
        <Card
          padding="md"
          className="border border-brand/35 bg-[linear-gradient(90deg,rgba(249,115,22,0.18)_0%,rgba(12,22,44,0.88)_46%,rgba(6,182,212,0.16)_100%)] max-w-3xl mx-auto"
        >
          <div className="flex items-center justify-center">
            <div className="w-full text-center">
              <EditableText
                contentKey="newToHackday.nextStep.label"
                fallback="Next step"
                as="p"
                frameClassName="mx-auto w-fit"
                displayClassName="text-xs uppercase tracking-[0.08em] text-text-muted mb-1"
              />
              <EditableText
                contentKey="newToHackday.nextStep.title"
                fallback="Ready to start Step 1?"
                as="p"
                frameClassName="mx-auto"
                displayClassName="text-base sm:text-lg font-bold text-text-primary"
              />
              <EditableTextArea
                contentKey="newToHackday.nextStep.subtitle"
                fallback="Enter Ideas now, then come back and follow the full journey."
                as="p"
                rows={2}
                frameClassName="mx-auto"
                displayClassName="text-sm text-text-secondary mt-1 mb-4"
              />
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => onNavigate('marketplace')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Begin Step 1: Ideas
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => onNavigate('schedule')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  View Event Timeline
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 sm:hidden pointer-events-none">
        <div className="pointer-events-auto rounded-2xl border border-brand/35 bg-[linear-gradient(90deg,rgba(249,115,22,0.24)_0%,rgba(12,22,44,0.95)_46%,rgba(6,182,212,0.24)_100%)] p-3 shadow-2xl backdrop-blur">
          <EditableText
            contentKey="newToHackday.mobileQuickStart.label"
            fallback="Quick start"
            as="p"
            frameClassName="mx-auto w-fit"
            displayClassName="text-[11px] uppercase tracking-[0.08em] text-text-muted text-center mb-2"
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => onNavigate('marketplace')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Step 1: Ideas
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => onNavigate('schedule')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Timeline
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewToHackDay;
