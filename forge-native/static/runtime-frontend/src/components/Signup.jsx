/**
 * Signup Page - Multi-Step Wizard
 * First-time user onboarding with progressive disclosure
 * Ported from HD26AI for feature parity
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Eye, 
  Check, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import { SKILLS, MAX_SKILLS } from '../data/constants';
import { cn } from '../lib/design-system';
import { 
  Card, 
  Button, 
  Input, 
  Badge,
  Progress,
} from './ui';
import { VStack, HStack } from './layout';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;

// Step definitions
const STEPS = [
  { id: 1, label: 'Identity', shortLabel: 'Name' },
  { id: 2, label: 'Skills', shortLabel: 'Skills' },
  { id: 3, label: 'Participation', shortLabel: 'Role' },
];

function Signup({ 
  user, 
  updateUser, 
  onNavigate, 
  teams = [],
  eventPhase,
  onTrackEvent,
}) {
  const signupSessionIdRef = useRef(`signup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const stepsSeenRef = useRef(new Set());
  const currentStepRef = useRef(1);
  const isObserverRef = useRef(false);
  const selectedSkillsCountRef = useRef(0);
  const completedRef = useRef(false);

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState(user?.name || '');
  const [nameError, setNameError] = useState('');
  const [callsign, setCallsign] = useState(user?.callsign || '');
  const [callsignError, setCallsignError] = useState('');
  const [selectedSkills, setSelectedSkills] = useState(user?.skills || []);
  const [isObserver, setIsObserver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Skills search
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const skillInputRef = useRef(null);
  const skillDropdownRef = useRef(null);
  
  // Success state
  const [showSuccess, setShowSuccess] = useState(false);

  // Validate name
  const validateName = useCallback((value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Display name is required';
    if (trimmed.length < MIN_NAME_LENGTH) return `Name must be at least ${MIN_NAME_LENGTH} characters`;
    if (trimmed.length > MAX_NAME_LENGTH) return `Name must be no more than ${MAX_NAME_LENGTH} characters`;
    return '';
  }, []);

  // Validate callsign
  const validateCallsign = useCallback((value) => {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length < 2) return 'Callsign must be at least 2 characters';
    if (trimmed.length > 20) return 'Callsign must be no more than 20 characters';
    if (trimmed.length > 0 && !/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      return 'Callsign can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    return '';
  }, []);

  // Live name validation
  useEffect(() => {
    if (name) {
      const error = validateName(name);
      setNameError(error);
    } else {
      setNameError('');
    }
  }, [name, validateName]);

  // Live callsign validation
  useEffect(() => {
    if (callsign) {
      const error = validateCallsign(callsign);
      setCallsignError(error);
    } else {
      setCallsignError('');
    }
  }, [callsign, validateCallsign]);

  // Check if current step is valid
  const isStepValid = useCallback((step) => {
    switch (step) {
      case 1:
        return name.trim().length >= MIN_NAME_LENGTH && !nameError && !callsignError;
      case 2:
        return selectedSkills.length > 0;
      case 3:
        return true; // Participation choice is optional
      default:
        return false;
    }
  }, [name, nameError, callsignError, selectedSkills.length]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (isStepValid(currentStep)) {
      if (currentStep < STEPS.length) {
        onTrackEvent?.('signup_step_next', {
          component: 'signup_wizard',
          eventPhase: eventPhase || 'signup',
          sessionId: signupSessionIdRef.current,
          fromStep: currentStep,
          toStep: currentStep + 1,
          isObserver,
          selectedSkillsCount: selectedSkills.length,
        });
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [currentStep, isStepValid, onTrackEvent, eventPhase, isObserver, selectedSkills.length]);

  // Handle previous step
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      onTrackEvent?.('signup_step_back', {
        component: 'signup_wizard',
        eventPhase: eventPhase || 'signup',
        sessionId: signupSessionIdRef.current,
        fromStep: currentStep,
        toStep: currentStep - 1,
      });
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep, onTrackEvent, eventPhase]);

  // Handle step click
  const handleStepClick = useCallback((stepId) => {
    if (stepId !== currentStep) {
      onTrackEvent?.('signup_step_jump', {
        component: 'signup_wizard',
        eventPhase: eventPhase || 'signup',
        sessionId: signupSessionIdRef.current,
        fromStep: currentStep,
        toStep: stepId,
      });
    }
    setCurrentStep(stepId);
  }, [currentStep, onTrackEvent, eventPhase]);

  // Filter skills based on search
  const filteredSkills = SKILLS.filter(skill =>
    skill.toLowerCase().includes(skillSearchQuery.toLowerCase()) &&
    !selectedSkills.includes(skill)
  );

  // Add skill
  const handleAddSkill = useCallback((skill) => {
    if (selectedSkills.length < MAX_SKILLS && !selectedSkills.includes(skill)) {
      setSelectedSkills(prev => [...prev, skill]);
      setSkillSearchQuery('');
      setShowSkillSuggestions(false);
    }
  }, [selectedSkills]);

  // Remove skill
  const handleRemoveSkill = useCallback((skill) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  }, []);

  // Handle custom skill input
  const handleCustomSkillKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && skillSearchQuery.trim()) {
      e.preventDefault();
      const trimmed = skillSearchQuery.trim();
      if (trimmed.length >= 2 && trimmed.length <= 30 && !selectedSkills.includes(trimmed)) {
        handleAddSkill(trimmed);
      }
    }
  }, [skillSearchQuery, selectedSkills, handleAddSkill]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < MIN_NAME_LENGTH) {
      setNameError(`Display Name must be at least ${MIN_NAME_LENGTH} characters.`);
      setIsSubmitting(false);
      return;
    }
    
    try {
      await updateUser?.({
        name: trimmedName,
        callsign: callsign.trim() || null,
        skills: selectedSkills,
        isFreeAgent: !isObserver,
      });

      completedRef.current = true;
      onTrackEvent?.('signup_completed', {
        component: 'signup_wizard',
        eventPhase: eventPhase || 'signup',
        sessionId: signupSessionIdRef.current,
        completedAtStep: currentStep,
        selectedSkillsCount: selectedSkills.length,
        isObserver,
        hasCallsign: Boolean(callsign.trim()),
        destinationView: 'dashboard',
      });
      
      setShowSuccess(true);
      
      // Navigate to dashboard after brief success display
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1500);
    } catch (err) {
      console.error('Signup failed:', err);
      onTrackEvent?.('signup_failed', {
        component: 'signup_wizard',
        eventPhase: eventPhase || 'signup',
        sessionId: signupSessionIdRef.current,
        failedAtStep: currentStep,
        errorMessage: err?.message || 'unknown_error',
      });
      setIsSubmitting(false);
    }
  }, [name, callsign, selectedSkills, isObserver, updateUser, onNavigate, onTrackEvent, eventPhase, currentStep]);

  useEffect(() => {
    onTrackEvent?.('signup_flow_started', {
      component: 'signup_wizard',
      eventPhase: eventPhase || 'signup',
      sessionId: signupSessionIdRef.current,
    });
  }, [onTrackEvent, eventPhase]);

  useEffect(() => {
    const stepLabel = STEPS.find((step) => step.id === currentStep)?.label || `Step ${currentStep}`;
    stepsSeenRef.current.add(currentStep);
    currentStepRef.current = currentStep;
    isObserverRef.current = isObserver;
    selectedSkillsCountRef.current = selectedSkills.length;

    onTrackEvent?.('signup_step_view', {
      component: 'signup_wizard',
      eventPhase: eventPhase || 'signup',
      sessionId: signupSessionIdRef.current,
      step: currentStep,
      stepLabel,
      stepsSeenCount: stepsSeenRef.current.size,
      selectedSkillsCount: selectedSkills.length,
      isObserver,
    });
  }, [currentStep, onTrackEvent, eventPhase, selectedSkills.length, isObserver]);

  useEffect(() => {
    return () => {
      if (completedRef.current) return;
      onTrackEvent?.('signup_abandoned', {
        component: 'signup_wizard',
        eventPhase: eventPhase || 'signup',
        sessionId: signupSessionIdRef.current,
        lastStep: currentStepRef.current,
        stepsSeen: Array.from(stepsSeenRef.current.values()).sort((a, b) => a - b),
        selectedSkillsCount: selectedSkillsCountRef.current,
        isObserver: isObserverRef.current,
      });
    };
  }, [onTrackEvent, eventPhase]);

  // Click outside to close skill suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        skillDropdownRef.current &&
        !skillDropdownRef.current.contains(event.target) &&
        skillInputRef.current &&
        !skillInputRef.current.contains(event.target)
      ) {
        setShowSkillSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const progress = (currentStep / STEPS.length) * 100;
  const canProceed = isStepValid(currentStep);
  const isLastStep = currentStep === STEPS.length;

  // Success screen
  if (showSuccess) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/20 flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-4">
            Welcome to HackDay!
          </h1>
          <p className="text-lg text-text-secondary mb-6">
            Your profile has been created. Redirecting to dashboard...
          </p>
          <div className="w-32 h-1 bg-brand/30 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-brand animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Sign Up
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-3">
            JOIN HACKDAY
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Create your profile and get ready to hack
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-semibold text-text-secondary">
            <li className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              2-minute signup
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Pick up to 5 skills
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Edit anytime in Profile
            </li>
          </ul>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="max-w-xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted text-center mb-3">
              Step {currentStep} of {STEPS.length}
            </p>
            <div className="flex items-start justify-center">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-start">
                  <div className="w-24 sm:w-28 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => handleStepClick(step.id)}
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 cursor-pointer',
                        currentStep > step.id
                          ? 'bg-brand text-white'
                          : currentStep === step.id
                          ? 'bg-brand text-white scale-110 ring-4 ring-brand/30'
                          : 'bg-arena-elevated text-text-muted hover:bg-arena-card'
                      )}
                    >
                      {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepClick(step.id)}
                      className={cn(
                        'text-xs mt-2 font-bold transition-colors cursor-pointer',
                        currentStep >= step.id ? 'text-text-primary' : 'text-text-muted'
                      )}
                    >
                      {step.shortLabel}
                    </button>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="w-10 sm:w-14 mt-5 mx-1">
                      <div className="h-1 rounded-full bg-arena-border overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            currentStep > step.id ? 'bg-brand w-full' : 'bg-brand w-0'
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Progress value={progress} className="h-2 mt-4 max-w-xl mx-auto" />
        </div>

        {/* Step Content */}
        <Card padding="lg" className="mb-6">
          {/* Step 1: Identity */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-text-primary mb-6">
                  <span className="text-brand">1.</span> Your Identity
                </h2>
                <p className="text-sm text-text-secondary mb-5">
                  This is how others will see you in HackDay.
                </p>
                
                <VStack gap="4">
                  <Input
                    label="Display Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    size="lg"
                    error={nameError}
                    autoFocus
                  />

                  <Input
                    label="Callsign (Optional)"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="e.g., Code Ninja, Debug Master"
                    size="lg"
                    error={callsignError}
                    helperText="A fun nickname for HackDay"
                  />
                </VStack>
              </div>
            </div>
          )}

          {/* Step 2: Skills */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-text-primary mb-6">
                  <span className="text-brand">2.</span> Your Skills
                </h2>
                <p className="text-sm text-text-secondary mb-5">
                  Choose skills so teams can find a good match quickly.
                </p>

                {/* Selected Skills */}
                {selectedSkills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
                      Selected ({selectedSkills.length}/{MAX_SKILLS})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="default"
                          size="md"
                          removable
                          onRemove={() => handleRemoveSkill(skill)}
                          className="bg-brand/20 text-brand border-brand/30"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Searchable Skill Input */}
                <div className="relative" ref={skillDropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      ref={skillInputRef}
                      type="text"
                      value={skillSearchQuery}
                      onChange={(e) => {
                        setSkillSearchQuery(e.target.value);
                        setShowSkillSuggestions(true);
                      }}
                      onFocus={() => setShowSkillSuggestions(true)}
                      onKeyDown={handleCustomSkillKeyDown}
                      placeholder="Search or type a skill and press Enter"
                      maxLength={30}
                      disabled={selectedSkills.length >= MAX_SKILLS}
                      className={cn(
                        'w-full pl-10 pr-4 py-3 border-2 focus-ring-control text-sm transition-colors rounded-lg',
                        'bg-arena-bg text-text-primary placeholder:text-text-muted',
                        selectedSkills.length >= MAX_SKILLS
                          ? 'border-arena-border opacity-50 cursor-not-allowed'
                          : 'border-arena-border focus:border-brand'
                      )}
                    />
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSkillSuggestions && (filteredSkills.length > 0 || skillSearchQuery.trim()) && selectedSkills.length < MAX_SKILLS && (
                    <div className="absolute z-10 w-full mt-2 bg-arena-card border-2 border-arena-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredSkills.length > 0 && (
                        <div className="p-2">
                          <p className="text-xs text-text-muted px-2 py-1 mb-1">Suggested Skills</p>
                          {filteredSkills.slice(0, 10).map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => handleAddSkill(skill)}
                              className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-arena-elevated hover:text-text-primary rounded transition-colors flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              {skill}
                            </button>
                          ))}
                        </div>
                      )}
                      {skillSearchQuery.trim() && !selectedSkills.includes(skillSearchQuery.trim()) && (
                        <div className="p-2 border-t border-arena-border">
                          <button
                            type="button"
                            onClick={() => handleAddSkill(skillSearchQuery.trim())}
                            disabled={skillSearchQuery.trim().length < 2}
                            className="w-full text-left px-3 py-2 text-sm text-brand hover:bg-arena-elevated rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                            Add "{skillSearchQuery.trim()}"
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedSkills.length === 0 && (
                  <p className="text-sm text-text-muted mt-4">
                    Select at least one skill to continue
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Participation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-text-primary mb-6">
                  <span className="text-brand">3.</span> How Will You Participate?
                </h2>
                <p className="text-sm text-text-secondary mb-5">
                  Pick participant to join a team, or observer to follow along.
                </p>
                
                <div className="space-y-4">
                  {/* Observer Option */}
                  <button
                    type="button"
                    onClick={() => setIsObserver(!isObserver)}
                    className={cn(
                      'w-full p-6 border-2 transition-all duration-200 text-left rounded-xl',
                      isObserver
                        ? 'border-brand bg-brand/10'
                        : 'border-arena-border hover:border-arena-border-strong hover:bg-arena-elevated'
                    )}
                  >
                    <HStack gap="4" align="start">
                      <div className={cn(
                        'mt-1 w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        isObserver
                          ? 'border-brand bg-brand'
                          : 'border-text-muted'
                      )}>
                        {isObserver && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <HStack gap="2" align="center" className="mb-2">
                          <Eye className={cn(
                            'w-5 h-5',
                            isObserver ? 'text-brand' : 'text-text-secondary'
                          )} />
                          <span className={cn(
                            'font-bold text-lg',
                            isObserver ? 'text-brand' : 'text-text-primary'
                          )}>
                            Join as Observer
                          </span>
                        </HStack>
                        <p className="text-sm text-text-secondary">
                          Watch and learn from the sidelines. You'll be able to view all teams and submissions without participating in a team.
                        </p>
                      </div>
                    </HStack>
                  </button>
                  
                  {!isObserver && (
                    <Card variant="secondary" padding="md" className="bg-arena-elevated">
                      <p className="text-sm text-text-secondary">
                        <strong className="text-text-primary">Joining as a Participant:</strong> You'll be able to join or create an idea from the Ideas Marketplace after signing up.
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        <div className="pt-4 border-t border-arena-border">
          <p className="text-xs text-text-muted mb-3 text-center">
            No long forms. You can update these details anytime from your profile.
          </p>
          <div className="flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleBack}
            disabled={currentStep === 1}
            leftIcon={<ChevronLeft className="w-5 h-5" />}
          >
            Back
          </Button>
          
          {!isLastStep ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={!canProceed}
              rightIcon={<ChevronRight className="w-5 h-5" />}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={!canProceed || isSubmitting}
            >
              {isSubmitting
                ? (isObserver ? 'Joining as Observer...' : 'Creating Profile...')
                : (isObserver ? 'Join as Observer' : 'Complete Signup')}
            </Button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
