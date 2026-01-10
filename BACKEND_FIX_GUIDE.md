# Backend Build Error Fix Guide

## Problem Summary

95 build errors across 12 backend files due to incorrect database query method usage.

**Error Pattern:**
```
error TS2345: Argument of type 'TemplateStringsArray' is not assignable to parameter of type 'string'.
```

## Root Cause

Old code uses `db.rawQueryRow`, `db.rawQueryAll`, and `db.rawQuery` methods which expect different parameter formats than the template literal syntax being used.

## Solution

Replace all `rawQuery*` methods with the correct Encore.ts database methods:

### Query Method Mapping

| Old Method (BROKEN) | New Method (WORKING) | Use Case |
|---------------------|----------------------|----------|
| `db.rawQueryRow<T>` | `db.queryRow<T>` | SELECT returning single row |
| `db.rawQueryAll<T>` | `db.queryAll<T>` | SELECT returning multiple rows |
| `db.rawQuery` | `db.exec` | INSERT/UPDATE/DELETE without RETURNING |

### Example Fixes

#### Fix 1: SELECT Single Row
```typescript
// BEFORE (broken):
const user = await db.rawQueryRow<User>`
  SELECT * FROM users WHERE id = ${userId}
`;

// AFTER (working):
const user = await db.queryRow<User>`
  SELECT * FROM users WHERE id = ${userId}
`;
```

#### Fix 2: SELECT Multiple Rows
```typescript
// BEFORE (broken):
const cards = await db.rawQueryAll<Card>`
  SELECT * FROM cards WHERE category_id = ${categoryId}
`;

// AFTER (working):
const cards = await db.queryAll<Card>`
  SELECT * FROM cards WHERE category_id = ${categoryId}
`;
```

#### Fix 3: INSERT with RETURNING
```typescript
// BEFORE (broken):
const newCard = await db.rawQueryRow<Card>`
  INSERT INTO cards (title, slug) 
  VALUES (${title}, ${slug})
  RETURNING *
`;

// AFTER (working):
const newCard = await db.queryRow<Card>`
  INSERT INTO cards (title, slug) 
  VALUES (${title}, ${slug})
  RETURNING *
`;
```

#### Fix 4: UPDATE/DELETE without RETURNING
```typescript
// BEFORE (broken):
await db.rawQuery`
  UPDATE users SET status = ${status} WHERE id = ${userId}
`;

// AFTER (working):
await db.exec`
  UPDATE users SET status = ${status} WHERE id = ${userId}
`;
```

## Files Requiring Fixes

### ✅ FIXED
1. **backend/affiliates/manage_links.ts** - 4 occurrences fixed
   - Line 38: `rawQueryRow` → `queryRow`
   - Line 60: `rawQueryAll` → `queryAll`
   - Line 78: `rawQueryRow` → `queryRow`
   - Line 110: `rawQuery` → `exec`

### ⚠️ NEEDS FIXING
2. **backend/affiliates/track_click.ts** - ~3 errors
3. **backend/affiliates/track_conversion.ts** - ~4 errors
4. **backend/financial/invoices.ts** - ~2 errors (+ 1 callable issue)
5. **backend/moderation/queue.ts** - ~10 errors (+ authHandler issue)
6. **backend/notifications/manage.ts** - ~12 errors
7. **backend/recommendations/generate.ts** - ~10 errors
8. **backend/recommendations/track_interaction.ts** - ~6 errors
9. **backend/search/advanced_search.ts** - ~3 errors
10. **backend/search/suggestions.ts** - ~4 errors
11. **backend/subscriptions/manage.ts** - ~12 errors
12. **backend/subscriptions/plans.ts** - ~4 errors

## Additional Issues Found

### Issue 1: Null Safety
Some files have `.toString()` calls on potentially null values:

```typescript
// PROBLEM:
const user = await db.queryRow<User>`...`;
await logAudit({ userId: user.id.toString() }); // user might be null

// SOLUTION:
const user = await db.queryRow<User>`...`;
if (!user) throw APIError.notFound("User not found");
await logAudit({ userId: user.id.toString() });
```

### Issue 2: authHandler Not Found
In `moderation/queue.ts`:
```typescript
// PROBLEM:
Cannot find name 'authHandler'

// SOLUTION:
Import from correct location or remove if unused
```

### Issue 3: Callable Type Issues
In `financial/invoices.ts`:
```typescript
// PROBLEM:
This expression is not callable. Type 'Promise<void>' has no call signatures.

// SOLUTION:
Check if function returns a Promise and await it properly
```

## Batch Find/Replace Strategy

For quick fixes across all files:

### Step 1: Find all rawQueryRow
```bash
find backend -name "*.ts" -exec grep -l "rawQueryRow" {} \;
```

### Step 2: Replace in each file
```bash
# Use your editor's find/replace:
# Find: db.rawQueryRow
# Replace: db.queryRow
```

### Step 3: Find all rawQueryAll
```bash
# Find: db.rawQueryAll
# Replace: db.queryAll
```

### Step 4: Find all rawQuery (exec)
```bash
# Find: db.rawQuery`
# Replace: db.exec`
```

### Step 5: Verify Changes
```bash
encore build
```

## Verification Checklist

After fixing each file:
- [ ] All `rawQueryRow` → `queryRow`
- [ ] All `rawQueryAll` → `queryAll`
- [ ] All `rawQuery` (without Row/All) → `exec`
- [ ] Add null checks where needed
- [ ] Fix any type mismatches
- [ ] Test the affected endpoints

## Expected Outcome

After all fixes:
- ✅ 0 build errors
- ✅ All services compile successfully
- ✅ Advanced features become available:
  - Affiliate link tracking
  - Content recommendations
  - Subscription management
  - Advanced search
  - Notification system

## Time Estimate

- **Per file:** 5-10 minutes
- **Total (12 files):** 1-2 hours
- **Testing:** 30 minutes
- **Total:** 2-3 hours

## Notes

- The core database API is `db.queryRow`, `db.queryAll`, and `db.exec`
- Template literal syntax is correct, just wrong method names
- These errors don't affect core functionality (auth, cards, basic payments)
- Fix can be done incrementally - one service at a time
- Each fix makes more features available immediately

## Example Workflow

1. Pick a file (e.g., `affiliates/track_click.ts`)
2. Open in editor
3. Find/Replace: `rawQueryRow` → `queryRow`
4. Find/Replace: `rawQueryAll` → `queryAll`
5. Find/Replace: `rawQuery` → `exec`
6. Add null checks where needed
7. Save and run `encore build`
8. Fix any remaining errors
9. Test the affected endpoints
10. Move to next file

---

**Status:** 1/12 files fixed (8% complete)  
**Next Priority:** Fix `notifications/manage.ts` and `moderation/queue.ts` (most errors)
