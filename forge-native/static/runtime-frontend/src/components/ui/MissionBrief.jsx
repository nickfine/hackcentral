/**
 * MissionBrief Component
 * 
 * Unified hero component that consolidates:
 * - MotdBanner (phase/role messaging)
 * - ActiveIdeasWidget (stats hero)
 * - TeamFormationStatus (action CTAs)
 * 
 * Renders phase-aware, user-state-aware content with clear CTAs.
 */

import { memo, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    Zap,
    Users,
    UserPlus,
    Lightbulb,
    Rocket,
    Trophy,
    Clock,
    ArrowRight,
} from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { CompactCountdown } from './Countdown';
import { cn } from '../../lib/design-system';
import hdGlyphIcon from '../../assets/hd-glyph.png';
import {
    computeUserState,
    getMissionContent,
} from '../../lib/missionBriefContent';

/**
 * Get phase icon
 */
const getPhaseIcon = (phase) => {
    switch (phase) {
        case 'signup':
            return UserPlus;
        case 'team_formation':
            return Users;
        case 'hacking':
            return Rocket;
        case 'submission':
            return Lightbulb;
        case 'voting':
        case 'judging':
        case 'results':
            return Trophy;
        default:
            return Zap;
    }
};

/**
 * Get phase gradient class
 */
const getPhaseGradient = (phase) => {
    switch (phase) {
        case 'signup':
            return 'gradient-cyan-blue';
        case 'team_formation':
            return 'gradient-cyan-blue';
        case 'hacking':
            return 'gradient-orange';
        case 'submission':
            return 'gradient-orange';
        case 'voting':
        case 'judging':
            return 'gradient-purple';
        case 'results':
            return 'gradient-gold';
        default:
            return 'gradient-cyan-blue';
    }
};

/**
 * MissionBrief Component
 * 
 * @param {Object} props
 * @param {string} props.eventPhase - Current event phase
 * @param {Object} props.user - Current user object
 * @param {Object|null} props.userTeam - User's team object or null
 * @param {Object} props.stats - Aggregate stats (ideas, freeAgents, teams, submissions, etc.)
 * @param {boolean} props.hasPostedIdea - Whether user has posted an idea
 * @param {boolean} props.hasSubmitted - Whether team has submitted
 * @param {Date|string} props.phaseEndDate - When current phase ends (for countdown)
 * @param {Function} props.onNavigate - Navigation handler
 * @param {Function} props.onNavigateToTeam - Team navigation handler
 * @param {string} props.className - Additional CSS classes
 */
function MissionBrief({
    eventPhase = 'signup',
    user,
    userTeam,
    stats = {},
    hasPostedIdea = false,
    hasSubmitted = false,
    isRegistered = true,
    phaseEndDate,
    onNavigate,
    onNavigateToTeam,
    onTrackEvent,
    primaryOnly = true,
    secondaryAsLink = true,
    inlineAlert = null,
    mode = 'participant',
    primaryCtaClassName,
    heroAside = null,
    className,
}) {
    // Compute user state
    const userState = useMemo(() =>
        computeUserState({ userTeam, hasPostedIdea, hasSubmitted, isRegistered }),
        [userTeam, hasPostedIdea, hasSubmitted, isRegistered]
    );

    // Get content for current phase and user state
    const content = useMemo(() =>
        getMissionContent(eventPhase, userState),
        [eventPhase, userState]
    );

    // Build context object for dynamic content
    const contextObj = useMemo(() => ({
        teamName: userTeam?.name,
        memberCount: userTeam?.memberCount || (userTeam?.members?.length || 0) + 1,
        ideaTitle: userTeam?.ideaTitle || 'Your Idea',
        projectTitle: userTeam?.projectTitle || userTeam?.name || 'Your Project',
    }), [userTeam]);

    // Resolve dynamic content
    const resolvedStatus = typeof content.status === 'function'
        ? content.status(contextObj)
        : content.status;

    const resolvedContext = typeof content.context === 'function'
        ? content.context(stats)
        : content.context;

    const trackEvent = useCallback((eventName, payload = {}) => {
        if (typeof onTrackEvent !== 'function') return;

        onTrackEvent(eventName, {
            component: 'mission_brief',
            eventPhase,
            userState,
            heroVariant: content.heroVariant || 'standard',
            headline: content.headline,
            ...payload,
        });
    }, [onTrackEvent, eventPhase, userState, content.heroVariant, content.headline]);

    // Handle CTA clicks
    const handlePrimaryCTA = () => {
        if (!content.primaryCTA || !onNavigate) return;

        trackEvent('mission_brief_cta_click', {
            ctaSlot: 'primary',
            ctaLabel: content.primaryCTA.label,
            ctaAction: content.primaryCTA.action,
            hasParams: Boolean(content.primaryCTA.params),
        });

        if (content.primaryCTA.action === 'team' && userTeam?.id && onNavigateToTeam) {
            onNavigateToTeam(userTeam.id);
        } else {
            onNavigate(content.primaryCTA.action, content.primaryCTA.params);
        }
    };

    const handleSecondaryCTA = () => {
        if (!content.secondaryCTA || !onNavigate) return;

        trackEvent('mission_brief_cta_click', {
            ctaSlot: 'secondary',
            ctaLabel: content.secondaryCTA.label,
            ctaAction: content.secondaryCTA.action,
            hasParams: Boolean(content.secondaryCTA.params),
        });

        if (content.secondaryCTA.action === 'team' && userTeam?.id && onNavigateToTeam) {
            onNavigateToTeam(userTeam.id);
        } else {
            onNavigate(content.secondaryCTA.action, content.secondaryCTA.params);
        }
    };

    const handleInlineAlertCTA = () => {
        if (!inlineAlert?.ctaAction || !onNavigate) return;

        trackEvent('mission_brief_inline_alert_click', {
            ctaLabel: inlineAlert.ctaLabel || null,
            ctaAction: inlineAlert.ctaAction,
            hasParams: Boolean(inlineAlert.ctaParams),
        });

        onNavigate(inlineAlert.ctaAction, inlineAlert.ctaParams);
    };

    const PhaseIcon = getPhaseIcon(eventPhase);
    const phaseGradient = getPhaseGradient(eventPhase);
    const isWelcomeHero = content.heroVariant === 'welcome' || eventPhase === 'signup' || eventPhase === 'team_formation';
    const lastImpressionKeyRef = useRef(null);
    const impressionKey = `${eventPhase}|${userState}|${content.headline}|${content.primaryCTA?.action || 'none'}|${content.secondaryCTA?.action || 'none'}`;
    const showSecondaryCTA = Boolean(content.secondaryCTA) && !primaryOnly;
    const missionLabel = mode === 'admin' ? 'Operations' : 'Mission';
    const alertTone = inlineAlert?.type || 'info';

    const alertStyles = {
        info: {
            wrap: 'border-cyan-500/30 bg-cyan-500/10',
            title: 'text-cyan-primary',
            body: 'text-text-secondary',
            button: 'text-cyan-primary hover:text-cyan-200',
        },
        warning: {
            wrap: 'border-warning/35 bg-warning/10',
            title: 'text-warning',
            body: 'text-text-secondary',
            button: 'text-warning hover:text-warning/80',
        },
        urgent: {
            wrap: 'border-error/35 bg-error/10',
            title: 'text-error',
            body: 'text-text-secondary',
            button: 'text-error hover:text-error/80',
        },
    };

    useEffect(() => {
        if (lastImpressionKeyRef.current === impressionKey) return;

        lastImpressionKeyRef.current = impressionKey;
        trackEvent('mission_brief_impression', {
            impressionKey,
            primaryCtaLabel: content.primaryCTA?.label || null,
            primaryCtaAction: content.primaryCTA?.action || null,
            secondaryCtaLabel: content.secondaryCTA?.label || null,
            secondaryCtaAction: content.secondaryCTA?.action || null,
        });
    }, [trackEvent, impressionKey, content.primaryCTA, content.secondaryCTA]);

    return (
        <Card
            variant="default"
            padding="lg"
            className={cn(
                'relative overflow-hidden glass-panel glass-panel-hover',
                isWelcomeHero ? '!p-5 sm:!p-6' : '!p-8 sm:!p-10',
                className
            )}
        >
            {/* Background decoration */}
            <div className="mission-particle-field" />
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gradient-to-br from-cyan-primary/10 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-gradient-to-tr from-brand/10 to-transparent blur-3xl pointer-events-none" />

            {isWelcomeHero ? (
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-stretch gap-4 sm:gap-8">
                    <div className="hidden lg:block w-16 lg:w-20 xl:w-24 flex-shrink-0">
                        <img
                            src={hdGlyphIcon}
                            alt="HackDay icon"
                            className="w-full h-full object-contain"
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h2 className="mission-hero-headline text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-2">
                            {content.headline}
                        </h2>
                        <p className="mission-hero-status text-base sm:text-lg text-text-primary font-medium mb-3 sm:mb-4">
                            {resolvedStatus}
                        </p>

                        <p className="mission-hero-context hidden sm:block text-base text-text-secondary mb-4">
                            {resolvedContext}
                        </p>

                        {inlineAlert && (
                            <div className={cn('mb-6 rounded-xl border px-4 py-3', (alertStyles[alertTone] || alertStyles.info).wrap)}>
                                <p className={cn('text-xs font-bold uppercase tracking-[0.08em] mb-1', (alertStyles[alertTone] || alertStyles.info).title)}>
                                    {inlineAlert.title || 'Action needed'}
                                </p>
                                <p className={cn('text-sm leading-relaxed', (alertStyles[alertTone] || alertStyles.info).body)}>
                                    {inlineAlert.body}
                                </p>
                                {inlineAlert.ctaLabel && inlineAlert.ctaAction && (
                                    <button
                                        type="button"
                                        onClick={handleInlineAlertCTA}
                                        className={cn(
                                            'mt-2 text-sm font-bold underline underline-offset-4 transition-colors',
                                            (alertStyles[alertTone] || alertStyles.info).button
                                        )}
                                    >
                                        {inlineAlert.ctaLabel}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className={cn('mission-hero-cta-row flex flex-wrap gap-3', isWelcomeHero ? 'mb-0' : 'mb-6')}>
                            {content.primaryCTA && (
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className={primaryCtaClassName}
                                    onClick={handlePrimaryCTA}
                                    rightIcon={<ArrowRight className="w-5 h-5" />}
                                >
                                    {content.primaryCTA.label}
                                </Button>
                            )}
                            {showSecondaryCTA && !isWelcomeHero && (
                                secondaryAsLink ? (
                                    <button
                                        type="button"
                                        onClick={handleSecondaryCTA}
                                        className={cn(
                                            'text-sm font-bold text-text-secondary underline underline-offset-4 hover:text-text-primary transition-colors px-1 py-2',
                                            isWelcomeHero && 'hidden sm:inline-flex'
                                        )}
                                    >
                                        {content.secondaryCTA.label}
                                    </button>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        size="lg"
                                        className={cn(isWelcomeHero && 'hidden sm:inline-flex')}
                                        onClick={handleSecondaryCTA}
                                    >
                                        {content.secondaryCTA.label}
                                    </Button>
                                )
                            )}
                        </div>

                    </div>

                    {heroAside && (
                        <div className="hidden lg:flex w-[260px] xl:w-[300px] flex-shrink-0 self-stretch">
                            {heroAside}
                        </div>
                    )}
                </div>
            ) : (
                <div className="relative z-10">
                    {/* Header: Phase icon + Headline */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center',
                            phaseGradient
                        )}>
                            <PhaseIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-cyan-primary">
                                {missionLabel}
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                                {content.headline}
                            </h2>
                        </div>
                    </div>

                    {/* Status message */}
                    <p className="text-lg text-text-primary font-medium mb-2">
                        {resolvedStatus}
                    </p>

                    {/* Supporting context */}
                    <p className="text-base text-text-secondary mb-6">
                        {resolvedContext}
                    </p>

                    {inlineAlert && (
                        <div className={cn('mb-6 rounded-xl border px-4 py-3', (alertStyles[alertTone] || alertStyles.info).wrap)}>
                            <p className={cn('text-xs font-bold uppercase tracking-[0.08em] mb-1', (alertStyles[alertTone] || alertStyles.info).title)}>
                                {inlineAlert.title || 'Action needed'}
                            </p>
                            <p className={cn('text-sm leading-relaxed', (alertStyles[alertTone] || alertStyles.info).body)}>
                                {inlineAlert.body}
                            </p>
                            {inlineAlert.ctaLabel && inlineAlert.ctaAction && (
                                <button
                                    type="button"
                                    onClick={handleInlineAlertCTA}
                                    className={cn(
                                        'mt-2 text-sm font-bold underline underline-offset-4 transition-colors',
                                        (alertStyles[alertTone] || alertStyles.info).button
                                    )}
                                >
                                    {inlineAlert.ctaLabel}
                                </button>
                            )}
                        </div>
                    )}

                    {/* CTAs */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        {content.primaryCTA && (
                            <Button
                                variant="primary"
                                size="lg"
                                className={primaryCtaClassName}
                                onClick={handlePrimaryCTA}
                                rightIcon={<ArrowRight className="w-5 h-5" />}
                            >
                                {content.primaryCTA.label}
                            </Button>
                        )}
                        {showSecondaryCTA && (
                            secondaryAsLink ? (
                                <button
                                    type="button"
                                    onClick={handleSecondaryCTA}
                                    className="text-sm font-bold text-text-secondary underline underline-offset-4 hover:text-text-primary transition-colors px-1 py-2"
                                >
                                    {content.secondaryCTA.label}
                                </button>
                            ) : (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={handleSecondaryCTA}
                                >
                                    {content.secondaryCTA.label}
                                </Button>
                            )
                        )}
                    </div>

                    {/* Footer: Countdown */}
                    {content.footerPrefix && phaseEndDate && (
                        <div className="flex items-center gap-3 pt-4 border-t border-arena-border">
                            <Clock className="w-5 h-5 text-text-muted" />
                            <span className="text-sm text-text-secondary">
                                {content.footerPrefix}
                            </span>
                            <CompactCountdown targetDate={phaseEndDate} showDays />
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

export default memo(MissionBrief);
