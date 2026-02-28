/**
 * Rules Page
 * General HackDay rules and guidelines
 */

import { useMemo } from 'react';
import {
  Check,
  X,
  AlertTriangle,
  Lightbulb,
  Code,
  FileText,
  Users,
  Clock,
  Award,
} from 'lucide-react';
import { Card } from './ui';
import { BackButton } from './shared';
import EditableText from '../configMode/EditableText';
import EditableTextArea from '../configMode/EditableTextArea';

// ============================================================================
// RULES DATA
// ============================================================================

const ALLOWED_RULES = [
  {
    id: 'searchDocs',
    title: 'Search Engines & Documentation',
    titleKey: 'rules.allowed.searchDocs.title',
    description: 'Google, DuckDuckGo, Bing, Stack Overflow, and official documentation',
    descriptionKey: 'rules.allowed.searchDocs.description',
    example: 'Searching for solutions or reading documentation',
    exampleKey: 'rules.allowed.searchDocs.example',
  },
  {
    id: 'ideFeatures',
    title: 'IDE Features',
    titleKey: 'rules.allowed.ideFeatures.title',
    description: 'Standard IDE autocomplete, IntelliSense, and code formatting tools',
    descriptionKey: 'rules.allowed.ideFeatures.description',
    example: 'Using VS Code autocomplete or Prettier for formatting',
    exampleKey: 'rules.allowed.ideFeatures.example',
  },
  {
    id: 'librariesFrameworks',
    title: 'Libraries & Frameworks',
    titleKey: 'rules.allowed.librariesFrameworks.title',
    description: 'Using npm packages, UI libraries, and open-source frameworks',
    descriptionKey: 'rules.allowed.librariesFrameworks.description',
    example: 'Installing and using React, Tailwind CSS, or Express.js',
    exampleKey: 'rules.allowed.librariesFrameworks.example',
  },
  {
    id: 'templatesBoilerplates',
    title: 'Templates & Boilerplates',
    titleKey: 'rules.allowed.templatesBoilerplates.title',
    description: 'Starting from project templates and scaffolding tools',
    descriptionKey: 'rules.allowed.templatesBoilerplates.description',
    example: 'Running "npm create vite@latest" to scaffold a project',
    exampleKey: 'rules.allowed.templatesBoilerplates.example',
  },
  {
    id: 'collaborationTools',
    title: 'Collaboration Tools',
    titleKey: 'rules.allowed.collaborationTools.title',
    description: 'Pair programming, code reviews, and team collaboration',
    descriptionKey: 'rules.allowed.collaborationTools.description',
    example: 'Working together with teammates on code',
    exampleKey: 'rules.allowed.collaborationTools.example',
  },
];

const NOT_ALLOWED_RULES = [
  {
    id: 'prebuiltProjects',
    title: 'Pre-built Projects',
    titleKey: 'rules.notAllowed.prebuiltProjects.title',
    description: 'Cannot submit projects that were built before the HackDay started',
    descriptionKey: 'rules.notAllowed.prebuiltProjects.description',
    example: 'Submitting a project you worked on last month',
    exampleKey: 'rules.notAllowed.prebuiltProjects.example',
  },
  {
    id: 'purchasedSolutions',
    title: 'Purchased Solutions',
    titleKey: 'rules.notAllowed.purchasedSolutions.title',
    description: 'No buying pre-made code, designs, or complete solutions',
    descriptionKey: 'rules.notAllowed.purchasedSolutions.description',
    example: 'Purchasing templates or complete projects from marketplaces',
    exampleKey: 'rules.notAllowed.purchasedSolutions.example',
  },
  {
    id: 'plagiarism',
    title: 'Plagiarism',
    titleKey: 'rules.notAllowed.plagiarism.title',
    description: 'All code must be original work created during the HackDay',
    descriptionKey: 'rules.notAllowed.plagiarism.description',
    example: 'Copying entire projects or significant portions from elsewhere',
    exampleKey: 'rules.notAllowed.plagiarism.example',
  },
];

const GENERAL_RULES = [
  {
    id: 'timeLimit',
    icon: Clock,
    titleKey: 'rules.general.timeLimit.title',
    descriptionKey: 'rules.general.timeLimit.description',
    title: 'Time Limit',
    description: 'All work must be completed within the official HackDay timeframe. No pre-built projects.',
  },
  {
    id: 'teamSize',
    icon: Users,
    titleKey: 'rules.general.teamSize.title',
    descriptionKey: 'rules.general.teamSize.description',
    title: 'Team Size',
    description: 'Teams must have 2-6 members. All members must be registered participants.',
  },
  {
    id: 'originalWork',
    icon: Code,
    titleKey: 'rules.general.originalWork.title',
    descriptionKey: 'rules.general.originalWork.description',
    title: 'Original Work',
    description: 'Projects must be original work created during the HackDay. Open source libraries are allowed.',
  },
  {
    id: 'submissionRequirements',
    icon: FileText,
    titleKey: 'rules.general.submissionRequirements.title',
    descriptionKey: 'rules.general.submissionRequirements.description',
    title: 'Submission Requirements',
    description: 'Submit source code, a demo video (max 3 min), and project description by the deadline.',
  },
  {
    id: 'judgingCriteria',
    icon: Award,
    titleKey: 'rules.general.judgingCriteria.title',
    descriptionKey: 'rules.general.judgingCriteria.description',
    title: 'Judging Criteria',
    description: 'Projects judged on Innovation, Execution, Design, and Theme Adherence.',
  },
  {
    id: 'codeOfConduct',
    icon: AlertTriangle,
    titleKey: 'rules.general.codeOfConduct.title',
    descriptionKey: 'rules.general.codeOfConduct.description',
    title: 'Code of Conduct',
    description: 'Be respectful, inclusive, and professional. Harassment of any kind will not be tolerated.',
  },
];

const TIPS = [
  {
    id: 'tip1',
    textKey: 'rules.tips.tip1',
    text: 'Work together with your team — collaboration is key!',
  },
  {
    id: 'tip2',
    textKey: 'rules.tips.tip2',
    text: 'Take breaks when needed — rest helps productivity',
  },
  {
    id: 'tip3',
    textKey: 'rules.tips.tip3',
    text: 'Plan before coding — whiteboarding and design help',
  },
  {
    id: 'tip4',
    textKey: 'rules.tips.tip4',
    text: "Leverage your team's diverse skills and perspectives",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

function Rules({ onNavigate, maxTeamSize = 6 }) {
  const resolvedTeamSize = Number.isFinite(Number(maxTeamSize)) && Number(maxTeamSize) >= 2
    ? Number(maxTeamSize)
    : 6;

  const generalRules = useMemo(() => (
    GENERAL_RULES.map((rule) => {
      if (rule.id === 'teamSize') {
        return {
          ...rule,
          description: `Teams must have 2-${resolvedTeamSize} members. All members must be registered participants.`,
        };
      }
      return rule;
    })
  ), [resolvedTeamSize]);

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Guidelines
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-2">
            HackDay Rules
          </h1>
          <EditableTextArea
            contentKey="rules.header.subtitle"
            fallback="Guidelines and expectations for all participants"
            as="p"
            rows={2}
            displayClassName="text-text-secondary max-w-2xl"
          />
        </div>
      </div>

      {/* General Rules */}
      <Card padding="lg" className="mb-6">
        <Card.Title className="mb-4">
          <EditableText
            contentKey="rules.general.sectionTitle"
            fallback="General Rules"
            as="span"
            frameClassName="flex-1"
            displayClassName="inline"
          />
        </Card.Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {generalRules.map((rule) => {
            const Icon = rule.icon;
            return (
              <div
                key={rule.id}
                className="flex gap-3 p-4 bg-arena-elevated rounded-lg border border-arena-border"
              >
                <div className="w-10 h-10 rounded-lg bg-arena-card flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <EditableText
                    contentKey={rule.titleKey}
                    fallback={rule.title}
                    as="h4"
                    displayClassName="font-bold text-text-primary"
                  />
                  <EditableTextArea
                    contentKey={rule.descriptionKey}
                    fallback={rule.description}
                    as="p"
                    rows={3}
                    displayClassName="text-sm text-text-secondary"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* What's Allowed */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <EditableText
              contentKey="rules.allowed.sectionTitle"
              fallback="What's Allowed"
              as="h3"
              frameClassName="flex-1"
              displayClassName="text-lg font-bold text-success"
            />
          </div>
          <div className="space-y-3">
            {ALLOWED_RULES.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-success/5 border border-success/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <EditableText
                      contentKey={item.titleKey}
                      fallback={item.title}
                      as="div"
                      displayClassName="font-semibold text-text-primary"
                    />
                    <EditableTextArea
                      contentKey={item.descriptionKey}
                      fallback={item.description}
                      as="p"
                      rows={3}
                      displayClassName="text-sm text-text-secondary"
                    />
                    <p className="text-xs text-text-muted mt-1 italic">
                      e.g.,{' '}
                      <EditableTextArea
                        contentKey={item.exampleKey}
                        fallback={item.example}
                        as="span"
                        rows={2}
                        displayClassName="inline text-xs text-text-muted italic"
                      />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* What's NOT Allowed */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center">
              <X className="w-5 h-5 text-error" />
            </div>
            <EditableText
              contentKey="rules.notAllowed.sectionTitle"
              fallback="What's NOT Allowed"
              as="h3"
              frameClassName="flex-1"
              displayClassName="text-lg font-bold text-error"
            />
          </div>
          <div className="space-y-3">
            {NOT_ALLOWED_RULES.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-error/5 border border-error/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <EditableText
                      contentKey={item.titleKey}
                      fallback={item.title}
                      as="div"
                      displayClassName="font-semibold text-text-primary"
                    />
                    <EditableTextArea
                      contentKey={item.descriptionKey}
                      fallback={item.description}
                      as="p"
                      rows={3}
                      displayClassName="text-sm text-text-secondary"
                    />
                    <p className="text-xs text-text-muted mt-1 italic">
                      e.g.,{' '}
                      <EditableTextArea
                        contentKey={item.exampleKey}
                        fallback={item.example}
                        as="span"
                        rows={2}
                        displayClassName="inline text-xs text-text-muted italic"
                      />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Pro Tips */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-400" />
          </div>
          <EditableText
            contentKey="rules.tips.sectionTitle"
            fallback="Pro Tips"
            as="h3"
            frameClassName="flex-1"
            displayClassName="text-lg font-bold text-amber-400"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TIPS.map((tip) => (
            <div
              key={tip.id}
              className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg"
            >
              <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <EditableTextArea
                contentKey={tip.textKey}
                fallback={tip.text}
                as="span"
                rows={2}
                displayClassName="block w-full text-sm text-text-primary"
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default Rules;
