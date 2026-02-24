# Wizard Step 2 - Visual Preview

## What You Should See

### 1. Timezone Selector (Existing)
```
┌────────────────────────────────────────────┐
│ Timezone: [Europe/London ▼]               │
└────────────────────────────────────────────┘
```

### 2. Event Duration Selector (NEW)
```
┌────────────────────────────────────────────┐
│ Event Duration                             │
│ How many days will your HackDay run?       │
│                                            │
│ ┌───────┐  ┌───────┐  ┌───────┐          │
│ │   1   │  │   2   │  │   3   │          │
│ │  Day  │  │ Days  │  │ Days  │          │
│ └───────┘  └───────┘  └───────┘          │
│   (Default: 2 Days selected)              │
└────────────────────────────────────────────┘
```

### 3. Schedule Events Selection (NEW)
```
┌────────────────────────────────────────────────────────┐
│ Schedule Events                                        │
│ Select which events to include in your schedule       │
│                                                        │
│ ┌─── Pre-Event (Blue border) ────────────────────┐  │
│ │ ☑ [✓] Pre-Event                                 │  │
│ │   ☑ 📝 Registration Opens                       │  │
│ │       Registration portal opens for             │  │
│ │       participants                               │  │
│ │   ☑ 🔒 Registration Closes                      │  │
│ │       Final deadline to register                │  │
│ │   ☑ 👥 Team Formation Opens                     │  │
│ │       Start forming teams in the Marketplace    │  │
│ │   ☑ ⏰ Team Formation Closes                    │  │
│ │       Final deadline to join a team             │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌─── Core Event (Green border) ──────────────────┐  │
│ │ ☑ [✓] Core Event                                │  │
│ │   ☑ 🎉 Opening Ceremony                         │  │
│ │       Kickoff event and announcements           │  │
│ │   ☑ 💻 Hacking Begins                           │  │
│ │       Start building your projects              │  │
│ │   ☑ 🏁 Code Freeze & Submission Deadline        │  │
│ │       Final deadline for project submissions    │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌─── Activities (Purple border) ─────────────────┐  │
│ │ ☐ [▢] Activities                                │  │
│ │   ☐ 🍽️ Lunch Break                              │  │
│ │       Scheduled lunch break                     │  │
│ │   ☐ 📢 Afternoon Check-in                       │  │
│ │       Mid-day standup or Q&A                    │  │
│ │   ☐ 🍕 Dinner Break                             │  │
│ │       Scheduled dinner break                    │  │
│ │   ☐ 🌙 Evening Check-in                         │  │
│ │       End of day updates                        │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌─── Closing (Orange border) ────────────────────┐  │
│ │ ☑ [▣] Closing                                   │  │
│ │   ☑ 🎤 Project Presentations                    │  │
│ │       Teams present their projects              │  │
│ │   ☑ 🗳️ Voting Opens                             │  │
│ │       Community voting begins                   │  │
│ │   ☐ ⏱️ Voting Closes                            │  │
│ │       Voting period ends                        │  │
│ │   ☑ ⚖️ Judging Period                           │  │
│ │       Judges evaluate submissions               │  │
│ │   ☑ 🏆 Awards Ceremony                          │  │
│ │       Results announcement and celebration      │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 4. Schedule Builder (Existing - Unchanged)
```
┌────────────────────────────────────────────┐
│ When does hacking start?                   │
│ All other dates are calculated from this   │
│                                            │
│ [2026-06-15T09:00] 📅                     │
│                                            │
│ Timezone: Europe/London                    │
│                                            │
│ (Cascade of phase cards appears below...)  │
└────────────────────────────────────────────┘
```

## Interactive Behaviors

### Duration Selector
- **Click any button** → Selected state (teal background, darker border)
- **Default**: 2 Days is pre-selected
- **Visual feedback**: Hover state on non-selected buttons

### Event Selection
- **Category checkbox (▣)**:
  - All checked → Full checkbox [✓]
  - Some checked → Indeterminate [▣]
  - None checked → Empty checkbox [☐]
  - Click → Toggles all events in category

- **Individual event checkbox**:
  - Click → Toggle on/off
  - Affects category checkbox state

- **Default state**:
  - Pre-Event: All ✓
  - Core Event: All ✓
  - Activities: All ☐
  - Closing: Most ✓ (except "Voting Closes")

## Mobile View (< 640px)

Duration buttons stack vertically:
```
┌──────────────┐
│      1       │
│     Day      │
└──────────────┘
┌──────────────┐
│      2       │
│    Days      │ ← Selected
└──────────────┘
┌──────────────┐
│      3       │
│    Days      │
└──────────────┘
```

Event categories remain stacked (same as desktop).

## Color Scheme

- **Pre-Event**: `border-color: #3b82f6` (Blue)
- **Core Event**: `border-color: #10b981` (Green)
- **Activities**: `border-color: #8b5cf6` (Purple)
- **Closing**: `border-color: #f59e0b` (Orange)

- **Duration Selected**: `border-color: #0f766e` (Teal), `background: #ccfbf1` (Teal subtle)
- **Duration Hover**: `border-color: #cbd5e1`, `background: #f8fafc`

## How to Actually Test

Since HackCentral is a Forge app, you need to test it in an Atlassian environment:

### Option 1: Forge Tunnel (Recommended for Development)
```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
forge tunnel
```

Then navigate to your Confluence/Jira instance and access HackCentral.

### Option 2: Deploy to Development Site
```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
forge deploy --no-verify
forge install --upgrade --site YOUR_SITE.atlassian.net
```

### What to Click

1. **In Confluence/Jira**: Open HackCentral macro/app
2. **Click**: "Create HackDay" button
3. **Fill Step 1**: Event name, icon, tagline
4. **Click**: "Next" to Step 2
5. **You should now see**: The new UI (duration + events)
6. **Test**: Click duration buttons
7. **Test**: Toggle event checkboxes
8. **Test**: Toggle category checkboxes
9. **Fill**: Schedule Builder (set hacking start date)
10. **Click**: "Next" through remaining steps
11. **Click**: "Create HackDay"
12. **Navigate**: To created HackDay → Schedule page
13. **Verify**: Milestones appear for selected events

## Expected Console Output

When everything works correctly, you should see:
- No errors in browser console
- No TypeScript errors
- Smooth state transitions when clicking
- Correct payload logged (if you add console.log to handleCreateDraft)

## Debugging Tips

If something doesn't look right:

1. **Open browser DevTools** (F12)
2. **Check Console** for errors
3. **Check Elements tab** to verify:
   - `.duration-selector` exists
   - `.event-selection-panel` exists
   - Classes are applied correctly
4. **Check Network tab** for failed requests
5. **Check React DevTools** to inspect component state:
   - `wEventDuration` should be 1, 2, or 3
   - `wSelectedEvents` should be an array of event IDs

## Success Indicators

✅ Duration selector renders with 3 buttons
✅ Button selection state changes on click
✅ Event selection panel shows 4 categories
✅ Checkboxes are interactive
✅ Default selections are correct
✅ Category toggles work
✅ ScheduleBuilder still appears below
✅ Can complete entire wizard
✅ Created HackDay shows new milestones on Schedule page

## Next Steps

After confirming everything works:
1. Test different event combinations
2. Test 1-day vs 3-day events
3. Verify milestones display correctly on Schedule page
4. Check mobile responsiveness
5. Consider UX improvements for future iterations
