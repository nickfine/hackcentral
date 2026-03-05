import type { PipelineStage } from '../../types';

export type HeroStageKey = 'pains' | PipelineStage;

export interface HeroStageDefinition {
  stage: HeroStageKey;
  label: string;
  description: string;
  criteria: string[];
}
