import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('config-mode Event update fallback contract', () => {
  it('uses schema-fallback Event updates for config draft persistence and publish writes', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/src/runtime/index.js'),
      'utf8'
    );

    expect(source).toContain('async function updateEventWithSchemaFallback(supabase, eventId, updatePayload) {');
    expect(source).toContain('Retrying Event update without missing column');
    expect(source).toContain('await updateEventWithSchemaFallback(supabase, access.event.id, {');
    expect(source).toContain('await updateEventWithSchemaFallback(supabase, access.event.id, eventUpdatePayload);');
    expect(source).toContain('await updateEventWithSchemaFallback(supabase, event.id, {');
    expect(source).not.toContain('.update({ event_branding: mergedBranding, updatedAt: nowIso, updated_at: nowIso })');
  });

  it('generates milestone ids before runtime schedule inserts', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/src/runtime/index.js'),
      'utf8'
    );

    expect(source).toContain('function extractMissingMilestoneColumn(error) {');
    expect(source).toContain('id: typeof milestone.id === "string" && milestone.id ? milestone.id : randomUUID(),');
    expect(source).toContain('Retrying Milestone insert without missing column "signal"');
  });
});
