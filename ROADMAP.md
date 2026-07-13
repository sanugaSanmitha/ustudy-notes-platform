# ROADMAP.md - UStudy Notes Trading Platform Development Roadmap

> **Date**: 2026-07-04  
> **Core Goal**: Completing the P0 tasks in order will deliver a fully functional MVP trading loop that is ready for launch.  
> **Upon completion of P0, users will be able to**: register -> upload grades -> get verified -> upload notes -> browse the course repository -> add to cart -> enjoy tiered free-item discounts / coupons -> pay -> view orders and immediately download copyright-protected PDFs. The platform will have internationalisation, scheduled jobs, basic SEO, and end-to-end tests, making it production-ready.

---

## Authentication Strategy: Resend + GitHub Student Pack

We use **Resend** for email delivery and **GitHub Student Developer Pack** to get a **free custom domain** for verification, eliminating the need to purchase a domain or use Microsoft Entra External ID.

### Why This Approach

| Aspect | Resend + GitHub Student Pack |
| :--- | :--- |
| **Email Delivery** | Resend API - simple, developer-friendly |
| **Custom Domain** | Free via GitHub Student Pack (Name.com or Namecheap) |
| **Domain Cost** | $0/year (renews at standard price) |
| **Email Verification** | Custom logic with Supabase tokens - full control |
| **Domain Verification** | Add DNS records in Resend Dashboard |
| **Cost** | Resend free tier + free domain |

### How to Get Your Free Domain

1. **Apply for GitHub Student Developer Pack** - Verify student status with `.edu` email or academic documents
2. **Claim your free domain** - Name.com offers 1-year free domain (extensions like `.dev`, `.app`, `.live`) or Namecheap offers `.me` TLD
3. **No credit card required** for the free domain
4. **Verify the domain in Resend Dashboard** - Add the DNS records Resend provides

---

## P0: MVP Core Trading Loop + Launch Foundation (in execution order)

### Phase 1: Project Foundation & Global Configuration

- [x] **1. Project scaffolding and Supabase client setup**
  - **Files/routes involved**: `package.json`, `next.config.ts`, `tailwind.config.ts`, `src/lib/supabase/server.ts`, `client.ts`, `admin.ts`, `.env.local`, `.env.example`
  - **Acceptance criteria**: `npm run dev` starts without errors; calling `supabase.auth.getSession()` via the Supabase client correctly returns `{ data: { session: null } }`; all environment variables are loaded with no warnings.
  - **Dependencies**: None

- [x] **2. Design system implementation and global layout**
  - **Files/routes involved**: `tailwind.config.ts`, `src/app/globals.css`, `src/components/ui/*` (all shadcn components), `src/components/layout/MainNavbar.tsx`, `MobileBottomBar.tsx`, `Footer.tsx`, `src/app/(main)/layout.tsx`, `src/app/admin/layout.tsx`
  - **Acceptance criteria**: Homepage is accessible; desktop shows top navigation bar, mobile shows bottom tab bar; global background, fonts, and colours comply with DESIGN.md; all shadcn components import and render correctly.
  - **Dependencies**: Task 1

- [x] **3. i18n routing configuration and language switcher**
  - **Files/routes involved**: `next.config.ts`, `src/i18n.ts`, `src/messages/zh-Hant.json`, `zh-Hans.json`, `en.json`, `src/app/[locale]/layout.tsx`, language switcher in `MainNavbar`
  - **Acceptance criteria**: `/zh`, `/en` routes display the homepage in the corresponding language; the language toggle in the navbar switches between three languages and page text updates immediately; all base UI copy is covered in all three languages.
  - **Dependencies**: Task 2

### Phase 2: Database & Security

- [x] **4. Database migration and seed data**
  - **Files/routes involved**: `docs/migrations/001_initial_schema.sql`, seed script `scripts/seed.ts`
  - **Acceptance criteria**:
    - 4a: After running the migration in Supabase SQL Editor, all 20+ tables, indexes, and RLS policies are created and visible in the Table Editor.
    - 4b: Running the seed script populates the database with 30-50 seed notes, corresponding courses, and users; the homepage displays these seed notes correctly.
  - **Dependencies**: Task 1 (database connection ready)

- [x] **5. Auth middleware and RLS policy enforcement**
  - **Files/routes involved**: `src/middleware.ts`, `src/lib/supabase/admin.ts`, RLS policies for each table (via SQL or Supabase Dashboard)
  - **Acceptance criteria**: Unauthenticated access to `/cart`, `/checkout`, etc. redirects to login; regular users accessing `/admin` get 404 or permission denied; API queries to `notes` return only records with `status = 'published'` (in conjunction with RLS).
  - **Dependencies**: Task 4

### Phase 3: User & Verification

- [x] **6. GitHub Student Pack setup & Resend domain verification**
  - **Files/routes involved**: GitHub Education portal, Resend Dashboard, domain DNS settings (Name.com/Namecheap)
  - **Acceptance criteria**:
    - 6a: GitHub Student Developer Pack application approved
    - 6b: Free domain claimed from Name.com or Namecheap
    - 6c: Domain added and verified in Resend Dashboard (DNS records added)
    - 6d: `RESEND_API_KEY` configured in `.env.local`
    - 6e: Can send a test email from the verified domain via Resend API
  - **Dependencies**: Task 1 (environment variables ready)

- [x] **7. User registration / login and email verification flow**
  - **Files/routes involved**: `src/app/(auth)/register/page.tsx`, `login/page.tsx`, `verify-email/page.tsx`, `src/app/api/auth/register/route.ts`, `login/route.ts`, `verify-email/route.ts`, `resend-verification/route.ts`, `src/lib/resend/client.ts`
  - **Acceptance criteria**:
    - 7a: Register with an `@ust.hk` or `@connect.ust.hk` email
    - 7b: Verification email sent via Resend from the verified custom domain (e.g., `noreply@yourdomain.dev`)
    - 7c: Click verification link -> status changes to `active` -> can log in
    - 7d: Non-university emails are blocked on the frontend with a clear message
    - 7e: Account locks for 15 minutes after 5 failed login attempts
    - 7f: Resend verification email limited to 3 times per day
  - **Dependencies**: Task 6

- [ ] **8. User profile page**
  - **Files/routes involved**: `src/app/(main)/profile/page.tsx`, `src/app/api/auth/reset-password/route.ts`
  - **Acceptance criteria**: After login, users can access the profile page via the nav menu, showing email, anonymous ID, registration time, etc.; supports password change (requires current password verification), after which the user must re-login.
  - **Dependencies**: Task 7

- [ ] **9. Grade verification module**
  - **Files/routes involved**: `src/app/(main)/grades/upload/page.tsx`, `status/page.tsx`, `src/app/api/grades/upload/route.ts`, `status/route.ts`, `manual/route.ts`
  - **Acceptance criteria**: Upload a parsable transcript PDF; frontend displays parsed course list; after confirmation, status becomes `pending_review`; uploading a scanned PDF falls back to manual input mode, guiding the user to fill in details and upload a screenshot; exceeding 3 uploads per day is rejected.
  - **Dependencies**: Task 7

### Phase 4: Note System

- [ ] **10. Note upload and management**
  - **Files/routes involved**: `src/app/(main)/notes/upload/page.tsx`, `edit/[id]/page.tsx`, `src/app/api/notes/route.ts`, `notes/[id]/route.ts`
  - **Acceptance criteria**: Verified sellers can enter the upload page; selecting a course auto-fills academic year, semester, and grade; title <=30 characters, description <=200 characters, price >=8; after PDF upload, the backend auto-generates first-three-page previews; drafts are editable; submitting for review sets status to `pending_review`.
  - **Dependencies**: Task 9

### Phase 5: Browsing & Detail

- [ ] **11. Course repository homepage**
  - **Files/routes involved**: `src/app/(main)/page.tsx`, `src/components/features/note/NoteCard.tsx`, `FilterBar.tsx`, `SortSelect.tsx`, `src/app/api/notes/route.ts` (GET list)
  - **Acceptance criteria**: Homepage displays a dynamic list of courses; multi-select filters (academic year, semester, course, grade, language) use AND logic and update instantly; sorting (by sales, grade, recency) works correctly; empty state shows a hand-drawn illustration.
  - **Dependencies**: Tasks 4, 10 (requires published notes)

- [ ] **12. Note detail page**
  - **Files/routes involved**: `src/app/(main)/notes/[id]/page.tsx`, `preview/` (full-screen view), `src/components/features/review/ReviewList.tsx`, `ReviewForm.tsx`
  - **Acceptance criteria**: Clicking a note card goes to the detail page; can carousel the first three preview pages and click to enlarge; shows note info, anonymous seller, grade badge, price, sales count; buyers can write reviews (1-500 characters), sellers can reply, buyers can add follow-up reviews; non-buyers do not see the review input.
  - **Dependencies**: Task 11

### Phase 6: Cart, Payment & Order Management

- [ ] **13. Shopping cart and discount calculation**
  - **Files/routes involved**: `src/app/(main)/cart/page.tsx`, `src/app/api/cart/route.ts`, `cart/items/route.ts`, `cart/items/[id]/route.ts`, `src/lib/utils/cart-utils.ts`
  - **Acceptance criteria**: Cart persists across sessions; items can be removed individually, quantity per item is fixed at 1; when cart has >=3 notes, the lowest-priced note is automatically marked free (tie-break by earliest added); frontend progress bar shows "Buy X more to get one free"; coupons are auto-compared and the best option is displayed.
  - **Dependencies**: Task 12

- [ ] **14. Payment integration**
  - **Files/routes involved**: `src/app/(main)/checkout/page.tsx`, `src/app/api/orders/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/lib/stripe/checkout.ts`
  - **Acceptance criteria**: Checkout page shows order summary, payment method selection (excluding international cards); discounts applied correctly generate the final amount; when using stored balance, if balance is insufficient and shortfall <=5, wallet deficit top-up is triggered; redirect to Stripe Checkout in test mode; upon successful payment, webhook updates order status to `paid`, wallet deductions and profit sharing are correct, cart is cleared, and notifications are sent.
  - **Dependencies**: Task 13

- [ ] **15. My orders and download management page**
  - **Files/routes involved**: `src/app/(main)/orders/page.tsx`, `orders/[id]/page.tsx`, `src/app/api/orders/route.ts` (GET list), `orders/[id]/route.ts` (GET detail)
  - **Acceptance criteria**: Paid orders appear in `/orders` list with status "paid"; detail page shows each note item and discount breakdown; for `paid` orders, a "Download" button is shown (calls the download API); after download, the button remains available for re-download.
  - **Dependencies**: Task 14

### Phase 7: Download & Wallet

- [ ] **16. Download with copyright page insertion**
  - **Files/routes involved**: `src/app/api/download/[orderItemId]/route.ts`, `download/[orderItemId]/status/route.ts`, `src/lib/pdf/copyright.ts`
  - **Acceptance criteria**: Clicking download automatically downloads the PDF with a copyright page inserted before the original first page; download links are valid for 5 minutes; exceeding 20 downloads per day per user returns a 429 error and logs the event.
  - **Dependencies**: Task 15

- [ ] **17. Wallet system**
  - **Files/routes involved**: `src/app/(main)/wallet/page.tsx`, `wallet/topup/page.tsx`, `src/app/api/wallets/route.ts`, `transactions/route.ts`, `topup/route.ts`, `topup/webhook/route.ts`, `transfer/route.ts`, `src/app/api/coupons/route.ts`, `coupons/apply/route.ts`
  - **Acceptance criteria**: Wallet page shows earning and stored balances separately; top-up page displays four tiers, selecting one triggers Stripe payment; upon success, balance is credited and corresponding flat coupons are issued; first top-up >=20 grants bonus, released after spending >=10; flat coupons can be used at checkout with correct rules; earning-to-stored transfer at 1:1 with restrictions; overdue wallet deficit top-up will suspend stored-balance payment and send reminders.
  - **Dependencies**: Task 14

### Phase 8: Growth & Social

- [ ] **18. Referral and dividend system**
  - **Files/routes involved**: `src/app/(main)/referrals/page.tsx`, `src/app/api/referrals/user/route.ts`, `note/[noteId]/route.ts`, `validate/route.ts`, `route.ts`
  - **Acceptance criteria**: Users generate a unique referral code; new users who register with the code and make their first purchase get 10% off (max 5 off); referrers receive 5% bonus; note referral codes can be used only once per note per user; anti-loss check: bonus is not issued if commission <= Stripe fees.
  - **Dependencies**: Task 17

- [ ] **19. Daily shareholder program**
  - **Files/routes involved**: `src/app/(main)/shareholder/page.tsx`, `src/app/api/shareholder/today/route.ts`, `status/route.ts`, `coupons/route.ts`, `coupons/redeem/route.ts`, `src/app/api/cron/daily-shareholder/route.ts`
  - **Acceptance criteria**: Resets daily at 00:00; earliest 5 consumers and 5 lottery seats are correctly determined; dividends are distributed according to the calculation rules; shareholder free coupons are valid for 120 hours, usable only by new users with cart >=2; cron job (23:59) triggers settlement and grants stored balance and free coupons.
  - **Dependencies**: Tasks 14 (order payment), 17 (wallet)

- [ ] **20. Notification system**
  - **Files/routes involved**: `src/app/(main)/notifications/page.tsx`, `src/app/api/notifications/route.ts`, `notifications/[id]/read/route.ts`, bell component in `MainNavbar`
  - **Acceptance criteria**: All business events (verification, review, purchase, dividend, etc.) automatically generate in-app notifications; notification centre shows a list with support for marking single/all as read; navbar bell shows unread count badge; notifications older than 90 days are auto-cleaned by cron job.
  - **Dependencies**: Tasks 14, 17, 18, 19

### Phase 9: Risk Control & Basic Administration

- [ ] **21. Reporting and blacklist**
  - **Files/routes involved**: `src/app/api/reports/route.ts`, `src/app/admin/reports/page.tsx`, `src/app/api/admin/reports/route.ts`, `reports/[id]/resolve/route.ts`
  - **Acceptance criteria**: Buyers can report a note (once per order); admins can view the report list in the backend, take action, and notify the user; sellers with two warnings are permanently banned.
  - **Dependencies**: Tasks 12, 15

- [ ] **22. Admin note/grade review functions**
  - **Files/routes involved**: `src/app/admin/notes/page.tsx`, `grades/page.tsx`, `src/app/api/admin/notes/pending/route.ts`, `notes/[id]/review/route.ts`, `grades/pending/route.ts`, `grades/[id]/review/route.ts`
  - **Acceptance criteria**: Admin login grants access to pending notes and grades lists; preview first three pages and download full PDF; approve/reject with a reason; status changes and notifications are sent to the seller.
  - **Dependencies**: Tasks 10, 9

### Phase 10: Launch Stability

- [ ] **23. Global error handling and 404/500 pages**
  - **Files/routes involved**: `src/app/not-found.tsx`, `src/app/error.tsx`, unified error response middleware for `src/app/api`
  - **Acceptance criteria**: Non-existent routes show a friendly 404 page; API errors show a unified frontend error message; no uncaught exceptions in the console.
  - **Dependencies**: Task 2

- [ ] **24. Cron job deployment**
  - **Files/routes involved**: `vercel.json`, `src/app/api/cron/daily-shareholder/route.ts`, `coupon-expiry-notify/route.ts`, `overdraft-remind/route.ts`, `topup-bonus-release/route.ts`, `clean-notifications/route.ts`, `monthly-settlement/route.ts`
  - **Acceptance criteria**: After Vercel deployment, each cron job runs on schedule and endpoints are protected by `CRON_SECRET`; manually calling endpoints triggers the correct business logic.
  - **Dependencies**: Tasks 19, 20, 17

- [ ] **25. Mobile responsiveness across all pages**
  - **Files/routes involved**: global CSS, all page components
  - **Acceptance criteria**: In Chrome DevTools mobile simulator, the complete flow from registration to download has no UI breakage; buttons on critical pages like cart, checkout, wallet are clickable and modals are fully visible.
  - **Dependencies**: Tasks 2-20

- [ ] **26. Basic SEO and performance targets**
  - **Files/routes involved**: `metadata` exports on all pages, `public/sitemap.xml`, `robots.txt`, image optimisation config in `next.config.ts`
  - **Acceptance criteria**: Lighthouse report: Performance >=90, all SEO metrics green; `sitemap.xml` is accessible and includes all static pages.
  - **Dependencies**: Tasks 11, 12, 25

### Phase 11: Testing & Data Foundation

- [ ] **27. End-to-end test for the core trading flow**
  - **Files/routes involved**: `__tests__/e2e/full-purchase.spec.ts`
  - **Acceptance criteria**: Playwright executes the full flow: register -> upload grades -> review -> upload notes -> review -> browse and add to cart -> checkout (simulate payment) -> download; asserts key steps (free-item calculation, discount selection, order status, download link) and all pass.
  - **Dependencies**: Tasks 1-26

- [ ] **28. Basic data analytics instrumentation**
  - **Files/routes involved**: `src/lib/analytics.ts`, calling `track()` on key pages/events
  - **Acceptance criteria**: After browsing the homepage, `analytics_events` table has a `page_view` record; add-to-cart, payment complete, and download events are also recorded.
  - **Dependencies**: Task 1 (database ready)

---

## P1: Pre-Launch Enhancements

- [ ] **29. Complete all admin backend pages**
  - **Files/routes involved**: `src/app/admin/config/page.tsx`, `risk/page.tsx`, `settlement/page.tsx`, corresponding API endpoints
  - **Acceptance criteria**: Config page can modify parameters with history logging; risk dashboard shows real-time events and severity distribution; settlement page can aggregate and export seller earnings list.
  - **Dependencies**: Task 22

- [ ] **30. Motion and interaction polish**
  - **Files/routes involved**: introduce `Framer Motion`, `src/components/features/shared/SuccessAnimation.tsx`, page transition logic
  - **Acceptance criteria**: Upload success triggers a sprout animation; purchase complete shows a bouncing cart and twinkling stars; shareholder election shows a crown animation; all animations are non-blocking (<300ms).
  - **Dependencies**: Task 2

- [ ] **31. Multimedia sensory feedback**
  - **Files/routes involved**: vibration logic on pay/download buttons, haptic toggle in settings, optional white-noise component
  - **Acceptance criteria**: Short vibration on mobile for payment/download; toggle in settings to disable vibration; focus mode optionally plays natural white noise.
  - **Dependencies**: Task 25

- [ ] **32. Advanced filter UI optimisation**
  - **Files/routes involved**: `FilterBar.tsx`, homepage components
  - **Acceptance criteria**: Filters are displayed as removable tags; when no results, show recommended popular notes.
  - **Dependencies**: Task 11

- [ ] **33. Seller and buyer onboarding tasks**
  - **Files/routes involved**: `src/components/features/onboarding/SellerGuide.tsx`, `BuyerGuide.tsx`, `src/lib/user-onboarding.ts`
  - **Acceptance criteria**: New sellers see step-by-step guidance that updates with progress; new buyers see lightweight first-purchase prompts while browsing.
  - **Dependencies**: Tasks 7, 9, 13

- [ ] **34. Admin audit logs**
  - **Files/routes involved**: `audit_logs` table, API middleware logging, `src/app/admin/audit/page.tsx`
  - **Acceptance criteria**: All sensitive admin actions are logged; audit page allows querying by time and operator.
  - **Dependencies**: Task 29

---

## P2: Post-Launch Iterations

- [ ] **35. Analytics dashboard**
  - **Files/routes involved**: `src/app/admin/analytics/page.tsx`, chart library integration
  - **Acceptance criteria**: Displays interactive charts for GMV, order volume, conversion rate, etc., with day/week/month switching and CSV export.
  - **Dependencies**: Task 28 (analytics data)

- [ ] **36. A/B testing framework**
  - **Files/routes involved**: feature-flag configuration, `@vercel/flags` or custom
  - **Acceptance criteria**: Can expose different UI variants to segments of users and collect comparative data.
  - **Dependencies**: Tasks 28, 35

- [ ] **37. Automated operations scripts**
  - **Files/routes involved**: `scripts/send-settlement-emails.ts`, `scripts/anomaly-detection.ts`
  - **Acceptance criteria**: Seller settlement emails are sent automatically on the 1st of each month; anomalous transactions are reported to admins in real time.
  - **Dependencies**: Task 29

- [ ] **38. Performance deep optimisation**
  - **Files/routes involved**: virtual scrolling for note lists, PDF caching strategy
  - **Acceptance criteria**: Scrolling through 100+ notes is smooth; Lighthouse scores remain 90+ across all metrics.
  - **Dependencies**: Task 26

- [ ] **39. Security hardening and penetration testing**
  - **Files/routes involved**: CSP headers, WAF rules, full-site scanning
  - **Acceptance criteria**: No high-severity vulnerabilities; passes basic penetration tests.
  - **Dependencies**: Task 24

---

## Appendix: How GitHub Student Pack Enables This Solution

| Step | What You Get | How It Works |
| :--- | :--- | :--- |
| **1. Apply** | GitHub Student Developer Pack approval | Verify with `.edu` email or academic documents |
| **2. Claim Domain** | Free 1-year domain registration | Name.com (`.dev`, `.app`, `.live`) or Namecheap (`.me`) |
| **3. Add to Resend** | Verified custom domain | Add DNS records in Resend Dashboard |
| **4. Send Emails** | Send from `noreply@yourdomain.dev` | Use Resend API with `RESEND_API_KEY` |
| **5. Full Control** | Custom email verification logic | Supabase tokens + Resend email delivery |

### GitHub Student Pack Benefits Used

- ✅ **Free domain** (Name.com or Namecheap) - 1-year registration
- ✅ **GitHub Pro** - while you remain a student
- ✅ **Azure credits** - $100 for cloud services
- ✅ **DigitalOcean credits** - $200 for 1 year

### Domain Options Available

| Extension | Provider | TLD Options |
| :--- | :--- | :--- |
| `.dev`, `.app`, `.live`, `.page` | Name.com | 1-year free, renews at standard price |
| `.me` | Namecheap | 1-year free, renews at standard price |
| `.tech` | Name.com | 1-year free + 2 email accounts |

---

## Summary

This roadmap uses **Resend** with a **free custom domain from the GitHub Student Developer Pack**. Key benefits:

- ✅ **Free custom domain** - 1 year via GitHub Student Pack (Name.com/Namecheap)
- ✅ **No Microsoft Entra required** - we keep full control with Resend + Supabase
- ✅ **Professional email sending** - Send from `noreply@yourdomain.dev`
- ✅ **Simple email verification** - Custom flow with Resend API
- ✅ **No credit card needed** - GitHub Student Pack provides the domain without payment info
- ✅ **Full control** - You own the email verification logic

The GitHub Student Pack is completely free as long as you remain a student, giving you a professional `.dev` or `.app` domain for your platform without any out-of-pocket cost.
