# Phase 1.5: Mentor Matching & Capacity Management

**Goal:** Enable users to discover mentors, request mentoring sessions, and manage their mentor capacity, creating a functional peer-to-peer mentorship system within the organization.

**Status:** 🎯 Ready to Implement  
**Estimated Complexity:** Medium  
**Dependencies:** Phase 1 Polish (✅ Complete)

---

## Overview

This phase implements the mentor matching system that's already designed in the schema but not yet functional in the UI. Users will be able to:

1. **Set mentor capacity** (profile settings)
2. **Browse mentors** (People page - filter by mentor availability)
3. **Request mentoring** (click "Get Paired with Mentor" or request from profile)
4. **Manage requests** (view pending/accepted/completed mentor sessions)
5. **Track usage** (mentor capacity vs sessions used)

---

## Current State

### ✅ Already Built (Schema & Backend)
- `mentorRequests` table with full schema
- `mentorCapacity` and `mentorSessionsUsed` fields in profiles
- `updateMentorCapacity` mutation in `convex/profiles.ts`
- Capability tags: "happy_to_mentor", "seeking_mentor", "mentorship_champion"
- "Get Paired with Mentor" button exists (non-functional)

### ❌ Not Yet Built (Frontend & Backend Queries)
- No Convex queries/mutations for mentor requests CRUD
- No UI for setting mentor capacity in Profile settings
- No mentor filtering on People page
- No mentor request modal/flow
- No mentor dashboard to view/manage requests
- No notifications for mentor request status changes

---

## Implementation Plan

### Task 1: Backend - Mentor Request Queries & Mutations

**File:** `convex/mentorRequests.ts` (new file)

**Create the following functions:**

1. **`create`** - Mutation to create a mentor request
   - Args: `mentorId`, `requestedDuration`, `topic?`
   - Validation:
     - Check requester is not mentor (can't mentor yourself)
     - Check mentor has available capacity (mentorSessionsUsed < mentorCapacity)
     - Check no pending request already exists between these two users
   - Creates request with status "pending"
   - Returns request ID

2. **`listForMentor`** - Query to get all requests for current user as mentor
   - Filter by status (pending/accepted/completed/cancelled)
   - Return with requester profile info
   - Ordered by most recent first

3. **`listForRequester`** - Query to get all requests from current user
   - Filter by status
   - Return with mentor profile info
   - Ordered by most recent first

4. **`updateStatus`** - Mutation to update request status
   - Args: `requestId`, `newStatus`, `scheduledAt?`
   - Validation:
     - Check user is either mentor or requester
     - Check valid status transition (pending → accepted/cancelled, accepted → completed/cancelled)
   - If accepting: check mentor still has capacity
   - If completing: increment mentorSessionsUsed for mentor
   - Update status and scheduledAt if provided

5. **`cancel`** - Mutation to cancel a request
   - Args: `requestId`
   - Validation: only requester or mentor can cancel
   - Set status to "cancelled"

6. **`getAvailableMentors`** - Query to list mentors with capacity
   - Filter profiles where `mentorCapacity > mentorSessionsUsed`
   - Include experienceLevel, capabilityTags
   - Exclude current user
   - Return with available capacity count

**Acceptance Criteria:**
- ✅ All mutations validate auth and permissions
- ✅ Capacity checks prevent overbooking
- ✅ Queries include necessary profile information
- ✅ Status transitions are validated

---

### Task 2: Profile Settings - Mentor Capacity

**File:** `src/pages/Profile.tsx`

**Add to Settings tab:**

1. **Mentor Capacity Section**
   - Label: "Monthly Mentoring Availability"
   - Description: "Set how many mentoring sessions you can offer per month. Leave at 0 if you're not available for mentoring."
   - Input: Number input (0-20 range recommended)
   - Display current usage: `{mentorSessionsUsed} / {mentorCapacity} sessions used this month`
   - Show "happy_to_mentor" tag automatically when capacity > 0

**Implementation:**
```typescript
const [mentorCapacity, setMentorCapacity] = useState(profile?.mentorCapacity ?? 0);

const handleMentorCapacityUpdate = async () => {
  await updateMentorCapacity({ capacity: mentorCapacity });
  toast.success('Mentor capacity updated!');
};
```

**Acceptance Criteria:**
- ✅ Current capacity displayed and editable
- ✅ Usage stats shown (X / Y sessions used)
- ✅ Updates save with success toast
- ✅ Validation: capacity must be 0-20

---

### Task 3: People Page - Mentor Filter & Discovery

**File:** `src/pages/People.tsx`

**Add mentor filtering:**

1. **New Filter Dropdown**
   - Label: "Mentor Availability"
   - Options: "All", "Available Mentors", "Seeking Mentors"
   - Position: Next to experience level filter

2. **Filter Logic**
   - "Available Mentors": Show profiles where `mentorCapacity > mentorSessionsUsed`
   - "Seeking Mentors": Show profiles with "seeking_mentor" capability tag
   - Update empty state to account for mentor filter

3. **ProfileCard Enhancement**
   - Show mentor badge/icon when `mentorCapacity > 0`
   - Show "Available: X slots" when mentor has capacity
   - Show "Fully booked" when `mentorSessionsUsed >= mentorCapacity`

**Acceptance Criteria:**
- ✅ Mentor filter works with debounced search
- ✅ Available mentor count visible on profile cards
- ✅ Empty state message when no mentors available
- ✅ Filter persists with other filters (experience, search)

---

### Task 4: Mentor Request Modal

**File:** `src/pages/People.tsx` (new component: `MentorRequestModal`)

**Triggered by:** 
- "Get Paired with Mentor" button (shows list of available mentors)
- Profile detail modal "Request Mentoring" button (pre-selects that mentor)

**Modal Contents:**

1. **Mentor Selection** (if triggered from main button)
   - List of available mentors with profile cards
   - Shows available capacity
   - Click to select mentor

2. **Request Form**
   - Selected mentor info (avatar, name, experience, tags)
   - Session duration dropdown: 30 min / 1 hour / 2 hours
   - Topic input (optional, textarea, placeholder: "What would you like help with?")
   - Available capacity warning if mentor is almost full

3. **Actions**
   - Cancel button
   - Submit "Request Mentoring" button
   - Loading state during submission

**Validation:**
- Check user is not requesting themselves
- Check mentor has available capacity
- Duration must be selected

**Success Flow:**
- Create mentor request
- Show success toast: "Mentoring request sent to [Mentor Name]!"
- Close modal
- Optional: Navigate to requests view

**Acceptance Criteria:**
- ✅ Modal shows available mentors or pre-selected mentor
- ✅ Form validation works
- ✅ Success/error toasts on submit
- ✅ Modal closes and resets on success
- ✅ Accessible (keyboard nav, aria labels)

---

### Task 5: Mentor Requests Dashboard

**File:** `src/pages/Profile.tsx` (new tab: "Mentoring")

**Add new tab to Profile page:**

**Tab: "Mentoring"**

Shows two sections side-by-side:

#### Section 1: "Requests I've Made"
- List of mentor requests from current user
- Grouped by status: Pending, Accepted, Completed
- Each request shows:
  - Mentor name, avatar
  - Topic (if provided)
  - Duration
  - Status badge
  - Date created / scheduled date
  - Actions:
    - Pending: Cancel button
    - Accepted: "Mark Complete" button (after scheduled time)
    - Completed: View only

#### Section 2: "Mentoring I'm Providing"
- Only shown if `mentorCapacity > 0`
- Show capacity usage: `{mentorSessionsUsed} / {mentorCapacity} sessions this month`
- List of requests where current user is mentor
- Grouped by status: Pending, Accepted, Completed
- Each request shows:
  - Requester name, avatar
  - Topic (if provided)
  - Duration
  - Status badge
  - Date created
  - Actions:
    - Pending: Accept / Decline buttons, optional schedule date/time picker
    - Accepted: "Mark Complete" button
    - Completed: View only

**Empty States:**
- No requests made: "You haven't requested any mentoring yet. Visit the People page to find mentors!"
- No mentoring provided: "Set your mentor capacity in Settings to start mentoring others."

**Acceptance Criteria:**
- ✅ Both sections show appropriate requests
- ✅ Status badges color-coded (pending: yellow, accepted: blue, completed: green, cancelled: gray)
- ✅ Actions work with success/error toasts
- ✅ Empty states guide users to next action
- ✅ Real-time updates when requests change

---

### Task 6: Profile Detail Modal - Request Mentoring Button

**File:** `src/pages/People.tsx` (update `ProfileDetailModal`)

**Add mentoring action:**

1. **Show "Request Mentoring" button** when:
   - Profile has `mentorCapacity > mentorSessionsUsed` (available capacity)
   - Viewer is not viewing their own profile
   - No pending request already exists between viewer and this mentor

2. **Button behavior:**
   - Opens `MentorRequestModal` with this mentor pre-selected
   - Passes mentor info to modal

3. **Show capacity info:**
   - Display: "Available for mentoring: X slots remaining"
   - Or: "Fully booked this month" if no capacity

**Acceptance Criteria:**
- ✅ Button only shows when appropriate
- ✅ Opens request modal with correct mentor
- ✅ Capacity info clearly displayed
- ✅ Disabled state if fully booked

---

## Data Flow

### Request Mentoring Flow
```
User clicks "Get Paired with Mentor" or "Request Mentoring" on profile
  ↓
MentorRequestModal opens
  ↓
[If from main button] User selects mentor from available list
  ↓
User enters duration and optional topic
  ↓
User clicks "Request Mentoring"
  ↓
Convex mutation: mentorRequests.create()
  ↓
Validates capacity, creates request with status "pending"
  ↓
Success toast + close modal
  ↓
Request appears in requester's "Requests I've Made" list
Request appears in mentor's "Mentoring I'm Providing" list
```

### Accept Request Flow
```
Mentor views request in "Mentoring I'm Providing"
  ↓
Clicks "Accept" button
  ↓
Optional: Selects scheduled date/time
  ↓
Convex mutation: mentorRequests.updateStatus("accepted")
  ↓
Validates capacity still available
  ↓
Updates request status, saves scheduledAt
  ↓
Success toast
  ↓
Request moves to "Accepted" section for both users
```

### Complete Request Flow
```
After session happens, either user clicks "Mark Complete"
  ↓
Convex mutation: mentorRequests.updateStatus("completed")
  ↓
Increments mentor's mentorSessionsUsed
  ↓
Sets completedAt timestamp
  ↓
Success toast
  ↓
Request moves to "Completed" section
Mentor's available capacity decreases by 1
```

---

## Testing Plan

### Unit Tests (Backend)
- ✅ Can't request yourself as mentor
- ✅ Can't request mentor with no capacity
- ✅ Can't have multiple pending requests between same users
- ✅ Completing request increments mentorSessionsUsed
- ✅ Invalid status transitions are rejected
- ✅ Only requester or mentor can update request

### Integration Tests (Browser)
1. **Set Mentor Capacity**
   - Navigate to Profile → Settings
   - Set mentor capacity to 2
   - Verify save with success toast
   - Verify "happy_to_mentor" tag appears

2. **Filter Available Mentors**
   - Navigate to People page
   - Select "Available Mentors" filter
   - Verify only mentors with capacity shown
   - Verify mentor badges and capacity displayed

3. **Request Mentoring**
   - Click "Get Paired with Mentor"
   - Select a mentor
   - Enter duration (1 hour) and topic ("Need help with prompt engineering")
   - Submit request
   - Verify success toast
   - Navigate to Profile → Mentoring tab
   - Verify request appears in "Requests I've Made" with "Pending" status

4. **Accept Request (as Mentor)**
   - Switch to mentor user profile
   - Navigate to Profile → Mentoring tab
   - Verify request appears in "Mentoring I'm Providing" with "Pending" status
   - Click "Accept" button
   - Optionally set scheduled date
   - Verify success toast
   - Verify request moves to "Accepted" section
   - Verify mentor's available capacity decreased

5. **Complete Request**
   - Click "Mark Complete" on accepted request
   - Verify success toast
   - Verify request moves to "Completed" section
   - Verify mentor's mentorSessionsUsed incremented

6. **Cancel Request**
   - Create another request
   - Click "Cancel" button while pending
   - Verify request disappears or moves to cancelled
   - Verify success toast

---

## UI/UX Considerations

### Visual Design
- **Mentor Badge**: Small icon/badge on profile cards for mentors (e.g., graduation cap icon)
- **Capacity Indicator**: Progress bar or "X / Y slots" text
- **Status Badges**: Color-coded (pending: yellow, accepted: blue, completed: green, cancelled: gray)
- **Empty States**: Friendly messages with call-to-action buttons

### Accessibility
- All modals have proper aria labels and keyboard navigation
- Status badges have accessible color contrast
- Form inputs have proper labels and validation messages
- Screen reader announces status changes

### Mobile Responsive
- Mentor request modal works on mobile (scrollable list, touch-friendly)
- Profile Mentoring tab stacks sections vertically on mobile
- Filter dropdowns collapse appropriately

---

## Edge Cases & Error Handling

### Edge Cases
1. **Mentor fills up while request in progress**
   - Show error toast: "This mentor is now fully booked. Please select another mentor."
   - Return to mentor selection

2. **User cancels before mentor accepts**
   - Request disappears from both users' lists
   - Mentor can't accept cancelled request

3. **Month rolls over**
   - `mentorSessionsUsed` should reset to 0 (requires scheduled function - Phase 2)
   - For Phase 1.5: Manual reset or note in UI "Resets monthly"

4. **Requester deletes profile**
   - Request shows "User not found" in mentor's list
   - Can still be marked complete/cancelled

### Error Messages
- "You cannot request yourself as a mentor"
- "This mentor is fully booked this month"
- "You already have a pending request with this mentor"
- "Failed to send request. Please try again."
- "Request not found"
- "You don't have permission to update this request"

---

## Success Metrics

After Phase 1.5, we should be able to measure:
- Number of users with mentor capacity > 0
- Number of mentor requests created
- Acceptance rate (accepted / total requests)
- Completion rate (completed / accepted)
- Average sessions per mentor
- Top mentors by sessions provided

---

## Future Enhancements (Phase 2+)

Not included in Phase 1.5 but planned for future:
- **Email notifications** for request status changes
- **Calendar integration** for scheduled sessions
- **Mentor recommendations** based on capability tags match
- **Mentor ratings/feedback** after completed sessions
- **Monthly mentor capacity reset** (scheduled function)
- **Mentor leaderboard** on Dashboard
- **"Mentor Champion" badge** for top mentors
- **Recurring mentorship** (ongoing mentor-mentee relationships)
- **Group mentoring** sessions
- **Mentor search** with advanced filters

---

## Files to Create/Modify

### New Files (3)
1. `convex/mentorRequests.ts` - All mentor request queries and mutations

### Modified Files (2)
2. `src/pages/Profile.tsx` - Add mentor capacity settings + Mentoring tab
3. `src/pages/People.tsx` - Add mentor filter, request modal, update ProfileDetailModal

---

## Estimated Implementation Time

| Task | Complexity | Estimate |
|------|-----------|----------|
| 1. Backend queries/mutations | Medium | 30-45 min |
| 2. Profile mentor capacity settings | Low | 15-20 min |
| 3. People page mentor filter | Low | 20-30 min |
| 4. Mentor request modal | Medium | 45-60 min |
| 5. Mentoring dashboard tab | High | 60-90 min |
| 6. Profile detail request button | Low | 15-20 min |
| Testing & polish | Medium | 30-45 min |
| **Total** | - | **~4-5 hours** |

---

## Definition of Done

Phase 1.5 is complete when:
- ✅ All 6 tasks implemented and tested
- ✅ Users can set mentor capacity in profile settings
- ✅ Users can filter and discover available mentors
- ✅ Users can request mentoring from available mentors
- ✅ Mentors can accept/decline requests
- ✅ Both parties can mark requests complete
- ✅ Requests can be cancelled
- ✅ Capacity tracking works correctly
- ✅ All UI has proper loading/error states
- ✅ All features tested in browser via Playwright
- ✅ No linter errors
- ✅ Code committed with proper version bump (0.3.1 → 0.4.0)
- ✅ Documentation updated in learnings.md

---

**Created:** January 31, 2026  
**Status:** 📋 Ready for Implementation  
**Next Step:** Begin with Task 1 (Backend - Mentor Request Queries & Mutations)
