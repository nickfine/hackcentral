import type {
  BootstrapData,
  CreateHackInput,
  CreateHackResult,
  CreateProjectInput,
  CreateProjectResult,
  UpdateMentorProfileInput,
  UpdateMentorProfileResult,
  ViewerContext,
} from '../shared/types';
import { SupabaseRepository } from './supabase/repositories';

const repository = new SupabaseRepository();

export async function getBootstrapData(viewer: ViewerContext): Promise<BootstrapData> {
  return repository.getBootstrapData(viewer);
}

export async function createHack(
  viewer: ViewerContext,
  input: CreateHackInput
): Promise<CreateHackResult> {
  return repository.createHack(viewer, input);
}

export async function createProject(
  viewer: ViewerContext,
  input: CreateProjectInput
): Promise<CreateProjectResult> {
  return repository.createProject(viewer, input);
}

export async function updateMentorProfile(
  viewer: ViewerContext,
  input: UpdateMentorProfileInput
): Promise<UpdateMentorProfileResult> {
  return repository.updateMentorProfile(viewer, input);
}
