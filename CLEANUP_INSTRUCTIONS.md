# HackDay Database Cleanup - Instructions

## ✅ Cleanup Method Deployed

I've added a bulk cleanup resolver to the Forge app that will:
- Delete all HackDay Event records
- Delete associated Milestones, EventAdmins, HackdayTemplateSeeds, and other related data
- Delete the Confluence child pages

## How to Run the Cleanup

Since `forge invoke` command isn't available, here are two options:

### Option 1: Use Browser Console (Easiest)

1. Open **any HackDay Central page** in your browser (the parent page where you create HackDays)
2. Open browser Developer Tools (F12)
3. Go to the **Console** tab
4. Paste and run this code:

```javascript
(async function cleanup() {
  console.log('🧹 Starting HackDay cleanup...');
  
  try {
    const result = await invoke('hdcBulkCleanupTestEvents', {});
    
    console.log('\n✅ Cleanup complete!');
    console.log(`📊 Results:`);
    console.log(`  - Events deleted: ${result.deletedCount}`);
    console.log(`  - Events failed: ${result.failedCount}`);
    console.log(`  - Confluence pages deleted: ${result.deletedPages}`);
    console.log(`  - Confluence pages failed: ${result.failedPages}`);
    
    if (result.errors.length > 0) {
      console.warn('\n⚠️  Errors encountered:');
      result.errors.forEach(err => console.warn(`  - ${err}`));
    }
    
    // Reload the page to see the clean state
    setTimeout(() => window.location.reload(), 2000);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
})();
```

### Option 2: Manual Supabase SQL (If needed)

If the resolver fails, you can manually run SQL in Supabase:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Go to SQL Editor
3. Run this SQL:

```sql
-- Delete all Milestones
DELETE FROM "Milestone";

-- Delete all HackdayTemplateSeeds
DELETE FROM "HackdayTemplateSeed";

-- Delete all EventAdmins
DELETE FROM "EventAdmin";

-- Delete all EventSyncState
DELETE FROM "EventSyncState";

-- Delete all EventAuditLog
DELETE FROM "EventAuditLog";

-- Delete all Events
DELETE FROM "Event";
```

**Note:** This won't delete the Confluence pages - you'd need to do that manually from Confluence.

## What Gets Deleted

- ✅ All Event records
- ✅ All Milestone records
- ✅ All HackdayTemplateSeed records
- ✅ All EventAdmin records
- ✅ All EventSyncState records  
- ✅ All EventAuditLog records
- ✅ Confluence child pages (via deletePage API)

## After Cleanup

The database will be completely clean and ready for creating new HackDays with the fixed Schedule Builder V2!
