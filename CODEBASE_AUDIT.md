# ARBITARY Codebase Audit Report

## Executive Summary
ARBITARY is a Next.js 16 + React 19 application with TypeScript, Tailwind CSS, and Drizzle ORM. It's a hybrid platform combining:
- **Marketing/Event Management**: Landing page, event showcase, admin event management
- **Social Task Platform**: Users complete social media tasks (like posts, watch videos, etc.) to earn points
- **User Profiles**: Users can track their progress, points, and completed tasks
- **Admin Dashboard**: Admins create tasks, manage events, and verify user submissions

---

## 1. API Routes Analysis

### Authentication Routes
**`POST /api/auth/signup`**
- Creates new user accounts with credentials
- Validates: email uniqueness, password length (8+ chars), all fields required
- Hashes password with bcryptjs
- ⚠️ **ISSUES**: 
  - No email validation (could accept invalid emails)
  - No rate limiting on signup attempts
  - No CAPTCHA/bot prevention
  - Generic error messages leak user existence

**`GET|POST /api/auth/[...nextauth]`**
- NextAuth handler (routes all auth traffic)
- Supports: Google, Facebook, Credentials providers
- ✅ Good: Updates lastLoginAt on login
- ⚠️ **ISSUES**:
  - Google/Facebook signup creates user on first auth (no approval needed)
  - Missing email verification for credential signup
  - No account lockout after failed login attempts

### Event Routes
**`GET /api/events`**
- Fetches all events sorted by date (newest first)
- Returns: id, title, date, category, status, venue, description, heroImageUrl
- ⚠️ **ISSUES**:
  - No pagination (returns all events)
  - No filtering by status (homepage manually filters for "Upcoming")
  - No error handling for database failures

**`POST /api/events` (CREATE/UPDATE)**
- Complex endpoint handling event creation and full updates
- Creates/updates: event, access types, timeline items, content sections, media items
- Uses database transaction
- ⚠️ **ISSUES**:
  - No admin role check (anyone can POST)
  - "Wipe & replace" strategy for relations (deletes all old data without archiving)
  - No validation on event data
  - No input sanitization
  - No image URL validation (could store malicious URLs)
  - Missing error handling for transaction failures

**`GET /api/events/[id]`**
- Fetches single event with all nested relations
- Efficiently batches database queries with Promise.all()
- ✅ Good: Handles missing events with 404
- ⚠️ **ISSUES**:
  - No caching despite being read-only
  - Could be optimized with Drizzle relations querying

### User Routes
**`PATCH /api/user/profile`**
- Updates user profile: name, phone, bio, location
- Uses Zod validation (strict mode)
- ✅ Good: Requires authentication, strict validation
- ⚠️ **ISSUES**:
  - Phone regex allows potentially invalid formats
  - No duplicate phone check (but DB has unique constraint)
  - No file upload support for profile pictures

**`GET /api/user/points`**
- Returns user's current point balance
- ✅ Simple and clean

**`GET /api/user/tasks`**
- Fetches tasks available to user with their completion status
- Supports filtering by taskType
- Maps complex join to simpler shape
- ⚠️ **ISSUES**:
  - No pagination (returns all tasks)
  - watchDuration always returned as null (frontend issue?)
  - No sorting options

**`POST /api/user/tasks` (PICK UP TASK)**
- User claims a task to work on
- Prevents multiple active tasks of same type simultaneously
- ✅ Good: Business logic is sound
- ⚠️ **ISSUES**:
  - No task availability check (admins can delete while user is working)
  - No time-based task expiration

**`DELETE /api/user/tasks`**
- User abandons a picked-up task
- Simple cleanup
- ⚠️ **ISSUES**:
  - No status validation (can't delete "Verified" tasks)
  - No punishment for task abandonment

**`POST /api/user/tasks/youtube-complete`**
- Mark YouTube task as "Completed" and award points
- Enforces minimum watch duration (default 30s)
- ✅ Good: Prevents instant completion via API
- ⚠️ **ISSUES**:
  - Time check is client-side originatable (assignedAt from DB)
  - "Completed" vs "Verified" status confusion
  - No verification that user actually watched
  - Points awarded immediately without verification
  - Could be exploited if client is manipulated

### Admin Routes
**`POST /api/admin/tasks` (CREATE TASK)**
- Admins create tasks for users
- Supports: social platforms, video URLs, watch duration
- Validates required fields
- ⚠️ **ISSUES**:
  - **NO ROLE CHECK** - Anyone can create tasks!
  - No URL validation
  - No watchDuration validation (could be negative or 0)
  - Points not validated (could be negative)

**`GET /api/admin/tasks`**
- Lists all tasks with completion counts
- ⚠️ **ISSUES**:
  - **NO ROLE CHECK** - Anyone can list tasks!
  - Returns all tasks (no pagination)

**`PUT /api/admin/tasks/[id]` (UPDATE TASK)**
- Updates task details
- ⚠️ **ISSUES**:
  - **NO ROLE CHECK**
  - Same validation issues as create
  - No check if task has active assignments

**`DELETE /api/admin/tasks/[id]`**
- Deletes task
- ⚠️ **ISSUES**:
  - **NO ROLE CHECK**
  - No soft delete (permanent removal)
  - No cascade check for user_tasks

**`GET /api/admin/social-posts`** (INCOMPLETE IN AUDIT)
- Fetches posts from Facebook, Instagram, YouTube, TikTok
- Extensive error handling
- ✅ Good: Comprehensive error types and status codes
- ⚠️ **ISSUES**:
  - Very long, appears incomplete in source
  - Multiple platform credential dependencies

**`PATCH /api/admin/tasks/verify`**
- Admins verify/reject user task submissions
- Updates user points based on verification
- ✅ Has role check
- ⚠️ **ISSUES**:
  - Only verifies "Pending Verification" status (hardcoded)
  - Doesn't prevent point double-awarding if user manipulates status
  - No audit log of who verified what

---

## 2. Pages Analysis

### Landing Page (`/page.tsx`)
- Shows upcoming events from API
- Renders Hero section, Events section
- ✅ Good: Fetches dynamic data
- ⚠️ **ISSUES**:
  - Date formatting could fail with invalid dates
  - No loading state during fetch
  - No error state if API fails
  - Unfiltered events field usage

### Auth Pages
**`/login`**
- Email/password credentials OR Google/Facebook OAuth
- Shows remember me checkbox (not implemented)
- ✅ Good: Google/Facebook options
- ⚠️ **ISSUES**:
  - Password visibility toggle works
  - "Remember me" doesn't persist
  - No rate limiting message
  - XSS risk: Error messages displayed raw

**`/signup`**
- Three signup flows: Google, Facebook, Credentials
- Password confirmation validation
- ✅ Good: Front-end validation
- ⚠️ **ISSUES**:
  - Client-side only password confirmation (server validates)
  - No password strength indicator
  - Terms acceptance required but not shown
  - No email verification flow

### Main App Pages

**`/dashboard` (USER)**
- Hub for task management
- Shows stats, task list, activity sidebar
- Tabs for Daily/Monthly view
- Mutation handlers for: pickup, cancel, complete
- ✅ Complex state management with tabs/animations
- ⚠️ **ISSUES**:
  - `completeMutation` PATCH endpoint doesn't exist in API
  - "Pending Verification" status created client-side, not server
  - No proof image upload UI shown in audit
  - YouTube task completion flow separate (uses POST not PATCH)

**`/profile`**
- Shows profile, settings, tasks history
- Three tabs: Profile, Settings, Tasks
- Fetches user points and tasks
- Edit mode with save/discard
- ✅ Well-structured component
- ⚠️ **ISSUES**:
  - Session doesn't include phone/bio/location (must update JWT)
  - Tasks filter only shows picked-up tasks (missing assigned but not started)
  - Points might be stale after task completion

**`/events`**
- Lists all upcoming and past events
- Event cards with date, image, links to detail
- ✅ Good visual design
- ⚠️ **ISSUES**:
  - All events loaded at once (no pagination)
  - Past/Upcoming split happens client-side
  - Date parsing could fail

**`/events/[id]`** (NOT FULLY AUDITED)
- Detail page for single event
- Likely shows access types, timeline, content sections

**`/about`, `/work`**
- Stub pages (just Header + Footer)
- Likely incomplete features

### Admin Pages

**`/admin/login`**
- Admin-specific login page
- Checks that user.role === "admin" after signin
- ✅ Good: Role verification
- ⚠️ **ISSUES**:
  - Calls `/api/auth/session` endpoint that doesn't exist in audit
  - No redirect if already authenticated
  - Error message could be more helpful

**`/admin/dashboard`**
- Massive component handling three features:
  1. **Event Management**: Create/Edit events with timeline, access types, content sections
  2. **Task Management**: Create/Edit/Delete tasks
  3. **User Submissions**: Verify/Reject user task submissions
- Complex form state management
- ✅ Uses transactions properly
- ⚠️ **MASSIVE ISSUES**:
  - No role check in component (relies on page routing)
  - Event editing has very complex state
  - Image upload handling unclear
  - No success/error toasts for some operations
  - Form resets but doesn't always clear
  - Hard to test due to complexity
  - No confirmation before deleting tasks

---

## 3. Authentication Setup (`src/auth.ts`)

### Providers
1. **Google**: OAuth with clientId/clientSecret
2. **Facebook**: OAuth with public_profile,email scopes
3. **Credentials**: Email/password with bcrypt validation

### Key Flow
- OAuth providers create user if doesn't exist (upsert on email)
- Credentials require exact password match
- Updates lastLoginAt on successful login
- JWT token includes: userId, name, image, role, provider, lastLoginAt

### Security Issues
1. **No email verification** - OAuth creates account immediately
2. **No account lockout** - Brute force possible on credentials
3. **Google account check** - Prevents "This email is linked to a Google account" error (good UX)
4. **Facebook token stored in JWT** - `facebookAccessToken` persisted (security risk!)
5. **Role default "USER"** - But stored as "admin" in some places (inconsistent)

---

## 4. Database Schema Analysis

### Tables Structure

**`users`**
- id (serial PK)
- email (varchar, unique) - credential signin
- name, image - from OAuth or signup
- password (text, nullable) - null if OAuth only
- phoneNumber (varchar, unique, nullable)
- bio (text, nullable)
- location (text, nullable)
- provider - "credentials", "google", "facebook"
- googleId, role, points - roles seem inconsistent
- createdAt, lastLoginAt

**`tasks`**
- id, title, description, taskType, points
- postUrl, platform, socialPostId, actionType
- watchDuration (int, nullable) - YouTube only
- createdByAdminId - admin who created it
- createdAt
- ⚠️ Missing: dueDate, isActive (soft delete), completionProofRequired

**`user_tasks`**
- id, userId, taskId, status
- proofImageUrl, proofUrl - for submission proof
- assignedAt, completedAt
- Indexes on userId, taskId, status (good!)
- ⚠️ Missing: expiredAt, submittedAt, verifiedBy

**`events`**
- id, title, eventType, status, eventDate, venue, description, heroImageUrl
- ⚠️ Missing: slug, capacity, soldOut

**`events` Relations**
- contentSections (cascading delete)
- accessTypes (cascading delete)
- timelineItems (cascading delete)
- mediaItems (nested through contentSections)

### Migration History
- Migration 0: Base schema (users, tasks, user_tasks, events, etc.)
- Migration 1: Unknown changes (not audited)
- Migration 2: Added social task fields + user profile fields + points
  - Added: postUrl, platform, socialPostId, actionType, watchDuration, proofUrl, phoneNumber, bio, location, points

---

## 5. Components Analysis

### Layout Components
- `form-input.tsx` - Input wrapper (not fully read)
- `loading-screen.tsx` - Loading UI
- `loading-wrapper.tsx` - Suspense wrapper
- `manage-task.tsx` - Admin task management interface
  - Sub-components: TaskFormModal, TaskTable, TaskRow, etc.
- `user-submissions.tsx` - Admin view for verifying user submissions

### UI Components
- **`header.tsx`**
  - Animated logo with typing effect
  - Scrolls to compact navbar with backdrop blur
  - Navigation pill with active state
  - Profile dropdown
  - ✅ Great UX with animations
  - ⚠️ Typing animation might be slow on mobile

- **`footer.tsx`**
  - Brand column with social links
  - Navigation links
  - Contact info
  - Newsletter signup form
  - ✅ Well-structured
  - ⚠️ Newsletter form doesn't actually submit anywhere

- **`profile-dropdown.tsx`** - (Not fully read)

### User Dashboard Components
- `stats-header.tsx` - Shows points, completed tasks, active tasks
- `activity-sidebar.tsx` - Activity feed
- `task-card.tsx` - Individual task display
- `task-list.tsx` - List of tasks with actions
- `youtube-modal.tsx` - Modal for YouTube task completion

### Section Components
- `hero-section.tsx` - Landing page hero
- (Others not fully audited)

### Task Management Components
**`TaskFormModal.tsx`**
- Creates/edits tasks with dynamic form
- Supports multiple platforms: manual, youtube, facebook, instagram
- Platform-specific fields (watchDuration for YouTube)
- ✅ Good: Platform abstraction
- ⚠️ **ISSUES**:
  - Validation only happens on submit
  - No URL validation before submission
  - Platform switch loses form data

**`PlatformSelector.tsx`** - Radio buttons for platform selection
**`SocialPostPicker.tsx`** - Fetches and displays available social posts
**`TaskTable.tsx`** - Admin task list with edit/delete
**`TaskRow.tsx`** - Individual task row with actions

---

## 6. Hooks Analysis

### `useAuth.ts`
- Simple hook wrapping `useSession()`
- Redirects to `/admin/adminloginpage` if not authenticated
- ⚠️ **ISSUES**:
  - Typo: `adminloginpage` should be `/admin/login`
  - Uses `useRouter` from "next/router" (old Pages Router) - doesn't work with App Router!
  - Should use `useRouter` from "next/navigation"
  - Hook never gets called, seems unused

---

## 7. Lib Utilities Analysis

### `facebook.ts`
- `getPagePosts()` - Fetches page posts from Facebook Graph API v19.0
- `checkUserLikedPost()` - Checks if user liked a specific post
- ⚠️ **ISSUES**:
  - Very short utility, main logic in `/api/admin/social-posts`
  - Error handling minimal

### `social/type.ts`
- Central types for social media: Platform (fb/ig/yt/tiktok)
- SocialPost interface (id, platform, title, url, likeCount, publishedAt)
- SocialTaskConfig interface
- PLATFORM_ACTIONS, PLATFORM_LABELS, PLATFORM_COLORS lookups
- ✅ Good centralization

### `manage-task/types.ts` (Not fully read)

---

## 8. Configuration Files

### `next.config.ts`
- (Not read, assume standard Next.js 16 config)

### `tsconfig.json`
- (Not read, assume standard TypeScript)

### `drizzle.config.ts`
- (Not read, assume standard Drizzle config)

### `.env` Variables Required
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- FACEBOOK_LOGIN_APP_ID, FACEBOOK_LOGIN_APP_SECRET
- FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN
- INSTAGRAM_USER_ID, INSTAGRAM_ACCESS_TOKEN
- Database: PostgreSQL (pg)

---

## 9. Providers & Global Setup

### `providers.tsx`
- SessionProvider (NextAuth)
- QueryClientProvider (React Query with 60s staleness)
- LoadingWrapper (app-wide loading state)
- ✅ Good setup
- ⚠️ Missing: Error boundary

### `layout.tsx`
- Global Tailwind styles
- Fonts: Geist, DM Sans
- Toast notifications (react-hot-toast)
- ✅ Clean layout

---

## 10. Database Migrations

### Latest Schema (Migration 0002)
Added in latest migration:
- Tasks: post_url, platform, social_post_id, action_type, watch_duration (YouTube)
- Users: phone_number, bio, location, points
- user_tasks: proof_url (for submission evidence)

### Missing Migrations
- Profile picture upload for users
- Event slug generation
- Task expiration dates
- Soft delete for tasks

---

---

# 🚨 CRITICAL ISSUES SUMMARY

## Security 🔴 CRITICAL
1. **API Routes Missing Auth Checks**
   - `POST /api/admin/tasks` - No role verification
   - `GET /api/admin/tasks` - No role verification
   - `PUT /api/admin/tasks/[id]` - No role verification
   - `DELETE /api/admin/tasks/[id]` - No role verification
   - **Any user can create/modify/delete tasks**

2. **YouTube Task Completion Exploitable**
   - Time validation uses `assignedAt` (from DB)
   - Frontend could submit immediately after pickup
   - No verification video was actually watched
   - Points awarded without admin review

3. **No Input Validation**
   - Event endpoints accept unvalidated data
   - URLs not validated (could inject malicious content)
   - No sanitization of text fields

4. **Social Media Token Stored in JWT**
   - Facebook access token persisted in auth token
   - Token could be extracted from local storage
   - No token refresh strategy

5. **Email Verification Missing**
   - OAuth immediately creates account (no email verification)
   - Credential signup has no email verification
   - Could receive tasks with unverified email

## Data Integrity 🟠 HIGH
1. **Race Conditions**
   - Concurrent task pickup/deletion could cause issues
   - No pessimistic locking on user_tasks updates

2. **Point Manipulation**
   - Points awarded on "Completed" but verified later
   - Admin could modify points directly
   - No audit trail of point changes

3. **Cascading Deletes**
   - Deleting task leaves user_tasks orphaned (despite foreign key constraint)
   - Event deletion cascades to all relations

## Data Loss Risk
1. **No Soft Deletes**
   - Admins can permanently delete tasks
   - No task history/archive
   - Event edits destroy old relations (wipe strategy)

2. **No Backups Mentioned**
   - PostgreSQL database is critical single point of failure

## Business Logic Issues 🟡 MEDIUM
1. **Role Inconsistency**
   - "USER" vs "user" case sensitivity
   - "admin" role in some places vs "ADMIN" in others
   - Role stored in both user table and JWT

2. **Status States Unclear**
   - Task statuses: "In Progress", "Completed", "Pending Verification", "Verified"
   - Not consistently enforced across APIs
   - No state machine / valid transitions

3. **Duplicate Task Pickup**
   - Prevents duplicate same-type active tasks
   - But doesn't clear old completed tasks
   - User could re-pickup same task multiple times

4. **Points System**
   - Points awarded on YouTube immediately (should require verification)
   - Social platform tasks never award points (no verification mechanism)
   - No way to dispute incorrectly verified tasks

5. **Event Management**
   - No approval workflow for new events
   - No publish/draft status
   - No SEO fields (meta description, etc.)

## Code Quality Issues 🟡 MEDIUM
1. **Incomplete Implementations**
   - `useAuth` hook written for Pages Router, not App Router
   - Admin login calls non-existent `/api/auth/session` endpoint
   - Newsletter signup has no backend
   - `/work` and `/about` pages are stubs

2. **Error Handling**
   - Generic 500 errors (no proper error codes)
   - No error boundary in app
   - Failed API calls don't retry

3. **No Pagination**
   - All events loaded at once
   - All tasks loaded at once
   - Could cause performance issues at scale

4. **Type Safety**
   - Session user cast to `any` in multiple places: `(session.user as any).id`
   - Should create proper User type in session

5. **Component Complexity**
   - `/admin/dashboard` is 1000+ lines (should split)
   - No separation of concerns

## Performance Issues 🟡 MEDIUM
1. **No Caching**
   - Events fetched every time
   - React Query config reasonable (60s stale time)

2. **Large Queries**
   - No field selection in some queries (fetches all columns)
   - No pagination limits

3. **Header Animation**
   - Typing animation might be slow on older devices
   - Could block page load

## Missing Features
1. No email notifications
2. No password reset flow
3. No 2FA/MFA
4. No audit logs
5. No analytics
6. No admin approval for user registrations
7. No bulk task creation
8. No task scheduling/automation
9. No referral system (despite having points system)
10. No social media integration for direct verification

---

# ✅ POSITIVE ASPECTS

1. **Modern Tech Stack**: Next.js 16, React 19, TypeScript, Drizzle ORM
2. **Good UX Design**: Smooth animations, responsive layout
3. **Proper Auth Providers**: Multiple OAuth + credentials
4. **Database Transactions**: Event creation uses proper transactions
5. **Indexed Queries**: user_tasks has proper indexes
6. **Type Safety**: TypeScript used throughout
7. **Component Organization**: Clear folder structure
8. **API Error Handling**: Proper HTTP status codes
9. **Form Validation**: Zod for profile updates
10. **React Query**: Good state management for data fetching

---

# 📋 RECOMMENDED IMPROVEMENTS (Priority Order)

## CRITICAL (Fix Immediately)
1. **Add role checks to all admin API routes** - Prevents unauthorized access
2. **Implement proper YouTube task verification** - Don't award points on completion
3. **Add input validation** - Use Zod on all API endpoints
4. **Remove social token from JWT** - Store separately or use refresh tokens
5. **Fix useAuth hook** - Use new Next.js router

## HIGH (Fix Soon)
1. **Implement email verification** - For both OAuth and credentials
2. **Add rate limiting** - On signup and login
3. **Soft delete tasks** - Archive instead of permanent delete
4. **Create state machine for task status** - Define valid transitions
5. **Add audit logs** - Track admin actions and point changes
6. **Implement error boundary** - Global error handling
7. **Add database backup strategy** - Critical for data safety

## MEDIUM (Plan Next Sprint)
1. **Add pagination** - For events and tasks
2. **Implement password reset** - For credential users
3. **Complete admin dashboard split** - Break into multiple components
4. **Add task expiration** - Auto-cleanup old active tasks
5. **Fix role inconsistency** - Use enum or constants
6. **Newsletter backend** - Persist subscriptions
7. **Complete missing pages** - `/work` and `/about`
8. **Add 2FA** - Optional for extra security
9. **Implement referral system** - Match points feature

## LOW (Nice to Have)
1. **Task templates** - Reusable task configurations
2. **Analytics dashboard** - Track user engagement
3. **Bulk operations** - Create multiple tasks at once
4. **Advanced filtering** - Filter tasks by date, points, platform
5. **Leaderboard** - Show top users by points
6. **Achievements/Badges** - Gamification
7. **API documentation** - OpenAPI/Swagger docs
8. **Performance monitoring** - Track slow queries

---

# 🔍 TESTING GAPS

- No unit tests in codebase
- No integration tests visible
- Admin routes completely untested (no role checks!)
- Race conditions in task pickup not tested
- Point calculation logic untested
- Email verification flow missing entirely

---

# 📊 Codebase Statistics

- **Tech Stack**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Drizzle ORM
- **Database**: PostgreSQL with 6+ tables
- **API Routes**: 15+ endpoints
- **Pages**: 10+ pages
- **Components**: 15+ components
- **Auth Providers**: 3 (Google, Facebook, Credentials)
- **Platforms Supported**: 4 (Facebook, Instagram, YouTube, TikTok)

---

**Report Generated**: June 2, 2026  
**Codebase Version**: 0.1.0
