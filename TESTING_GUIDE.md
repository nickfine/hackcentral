# Testing Guide: HackDay Duration & Schedule Events Feature

## Build Verification ✅
- TypeScript compilation: **PASSED**
- Vite build: **PASSED**
- No compilation errors detected

## Code Review Verification ✅

### 1. Type Definitions (types.ts) ✅
- `EventDuration` type added (1 | 2 | 3)
- `ScheduleEventType` union with 16 event types
- `ScheduleEventDefinition` interface defined
- `EventSchedule` updated with new fields

### 2. Data Layer (data/scheduleEvents.ts) ✅
- 16 event definitions created
- Organized in 4 categories (pre-event, core, activities, closing)
- Helper functions implemented

### 3. Components ✅
- `EventSelectionPanel` component created
- Properly integrated into App.tsx
- Imports verified

### 4. Wizard Integration (App.tsx) ✅
- State variables added (lines 799-800):
  - `wEventDuration` (default: 2)
  - `wSelectedEvents` (initialized with defaults)
- Step 2 UI enhanced (lines 2085-2118):
  - Duration selector with 3 buttons
  - Event selection panel with checkboxes
  - Positioned before ScheduleBuilder
- Payload assembly updated (line 1258-1271):
  - Includes `duration` and `selectedEvents`

### 5. Backend (HD26Forge index.js) ✅
- 24 milestone definitions added
- Supports all new event types
- Backward compatible

### 6. Styling (styles.css) ✅
- Duration selector styles added
- Event selection panel styles added
- Responsive breakpoints included

## Manual Testing Steps

Since the Forge app requires the Atlassian environment to run properly, here's how to test:

### Option 1: Deploy to Forge Tunnel
```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
forge tunnel
```

Then access through an Atlassian product (Confluence/Jira).

### Option 2: Deploy to Test Environment
```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
forge deploy --no-verify
forge install --upgrade
```

### What to Test in the Wizard

#### Step 1: Navigate to Wizard
1. Open HackCentral in Confluence/Jira
2. Click "Create HackDay" button
3. Complete Step 1 (Basic Info)
4. Click "Next" to go to Step 2

#### Step 2: Test Duration Selector
1. **Verify 3 buttons are displayed**: 1 Day, 2 Days, 3 Days
2. **Test selection**: Click each button
3. **Verify visual feedback**: Selected button should have different styling (teal/green border)
4. **Default state**: Should default to "2 Days"

#### Step 3: Test Event Selection Panel
1. **Verify 4 categories are displayed**:
   - Pre-Event (blue border)
   - Core Event (green border)
   - Activities (purple border)
   - Closing (orange border)

2. **Test individual event checkboxes**:
   - Click individual events to toggle on/off
   - Verify checkmark appears/disappears
   - Verify event icon and description are visible

3. **Test category-level toggles**:
   - Click category header checkbox
   - Should select/deselect all events in that category
   - Test indeterminate state (some but not all selected)

4. **Verify default selections**:
   - Pre-Event: All should be checked by default
   - Core Event: All should be checked by default
   - Activities: All should be unchecked by default
   - Closing: Most should be checked (votingEnds unchecked)

#### Step 4: Test Schedule Builder Integration
1. **Verify ScheduleBuilder still appears** below event selection
2. **Set a hacking start date** using the anchor input
3. **Verify cascade still works** - other dates auto-populate
4. **Complete the wizard** through all steps

#### Step 5: Test Payload & Creation
1. On Step 5 (Review), verify schedule shows:
   - Timezone
   - Hacking starts date
   - Submission deadline
2. Click "Create HackDay"
3. Wait for creation to complete

#### Step 6: Verify in Created HackDay
1. Navigate to the newly created HackDay page
2. Go to the Schedule page
3. **Verify milestones appear**:
   - Should show only selected events
   - Should group by date (columns for each day)
   - Should include new event types (Opening Ceremony, breaks, presentations)

### Expected Behaviors

✅ **Duration selector**:
- Responsive button group
- Clear visual selection state
- Mobile-friendly (stacks vertically on small screens)

✅ **Event selection panel**:
- Checkboxes organized by colored category
- Icons make events easily scannable
- Category toggles work bidirectionally
- Indeterminate state for partial selection

✅ **Wizard flow**:
- No breaking changes to existing steps
- ScheduleBuilder continues to work as before
- Can proceed through all 5 steps without errors

✅ **Backend integration**:
- Only creates milestones for selected events
- New event types properly labeled
- Multi-day events show day numbers (Day 1, Day 2, Day 3)

### Edge Cases to Test

1. **Select 1 day + all activities**
   - Should work fine
   - Activities will all be on same day

2. **Select 3 days + no activities**
   - Should work fine
   - Only core events across 3 days

3. **Deselect core events**
   - System should allow it (user choice)
   - Milestones will simply not be created

4. **Change duration after setting events**
   - Should maintain event selection
   - User can adjust times in ScheduleBuilder

## Known Limitations (By Design)

1. **ScheduleBuilder not duration-aware** (MVP)
   - User manually sets event times using cascade
   - Future: Auto-generate templates based on duration

2. **No per-day activity scheduling in UI** (MVP)
   - Backend supports Day1/Day2/Day3 variants
   - UI shows generic "Lunch Break" checkbox
   - Future: Show "Lunch Break (Day 1)", "Lunch Break (Day 2)", etc.

3. **No validation for selected events vs duration** (MVP)
   - User can select any combination
   - Future: Warn if many events selected for 1-day event

## Troubleshooting

### Build fails
- Check Node version: `node --version` (should be 18+)
- Clear build cache: `rm -rf dist/ node_modules/ && npm install`
- Rebuild: `npm run build`

### Forge tunnel not working
- Restart tunnel: `forge tunnel`
- Check Forge CLI version: `forge --version`
- Update if needed: `npm install -g @forge/cli`

### Wizard doesn't show new UI
- Clear browser cache
- Check Atlassian CDN cache (may take 5-10 minutes)
- Verify deployment: `forge deploy --no-verify`
- Check console for errors

### Components look unstyled
- Verify styles.css was updated
- Check browser dev tools for missing CSS
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

## Success Checklist

- [ ] Build completes without errors
- [ ] Duration selector appears in Step 2
- [ ] 3 duration buttons are clickable
- [ ] Selection state visually changes
- [ ] Event selection panel appears below duration
- [ ] 4 categories are visible with correct colors
- [ ] Individual checkboxes work
- [ ] Category toggles work
- [ ] Default selections are correct
- [ ] ScheduleBuilder still appears and works
- [ ] Can complete wizard all 5 steps
- [ ] Created HackDay shows new milestones
- [ ] Schedule page displays correctly
- [ ] Mobile responsive layout works

## Next Steps After Testing

If testing reveals issues:
1. Check browser console for errors
2. Verify backend logs in Forge
3. Test with different event combinations
4. Verify database has correct milestone records

If testing succeeds:
1. Consider UX improvements (templates, better day organization)
2. Add validation and warnings
3. Enhance ScheduleBuilder to be duration-aware
4. Add analytics to track most common configurations
