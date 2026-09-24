# Feature: hero-orbit-reload-fix-backtotop

## Objective
Implement 3 approved point changes on the El Colorado Resto Bar landing (Next.js 16):
1. CSS orbital animation for the 4 decorative dots in the Hero illustration.
2. Fix the reload bug: page appears scrolled to the bottom after refresh.
3. Add a discreet fixed "back to top" arrow button.

## Problem / Why
- Hero dots are static; user wants gentle continuous orbital motion.
- On reload the browser restores scroll offset (history.scrollRestoration default 'auto') and/or a hash fragment (#carta, #visitar, category ids) persists in the URL, so the page jumps to an anchor or bottom.
- No way to jump back to #inicio from deep scroll except the header (non-sticky) / footer.

## Scope / Authorized scope
- ONLY: Hero.tsx orbital wrappers, globals.css orbit keyframes, early scrollRestoration/strip-hash script in layout.tsx, anchor click interceptor (client component), BackToTop component + ArrowUp icon if needed, page.tsx mount point.
- MUST NOT touch: content copy, layout structure/sections, typography, colors/tokens, MenuNav scroll-spy logic (read-only), business data, prices/hours/photos (none exist by design).

## Constraints
- No new dependencies.
- CSS-only orbit (transform: rotate only; no layout thrash).
- prefers-reduced-motion: dots static at start angle; back-to-top instant scroll.
- Deep links `/#hash` intentionally do NOT auto-scroll after this fix (accepted side effect).
- Browser back/forward restore of scroll position MUST still work (only reload/navigate reset to top).
- Skip-link `#main` must keep keyboard focus behavior (tabIndex=-1 on main + focus, or equivalent).
- Back-to-top: hidden/inert/aria-hidden/tabIndex=-1 when hidden; fade after scrolling past hero; hide when footer enters viewport; >=44x44 hit area; aria-label="Volver al principio"; safe-area-inset-bottom.
- Conventional commit, no AI attribution. Push to origin/main after green verification.

## Actionable checklist
- [x] T1: Wrap each of the 4 Hero dots in an absolutely-positioned circular orbit container (inset in % of illustration); rotate container only; 4 distinct durations 18-40s, some reverse, negative delays for start angles, infinite linear; reduced-motion static.
- [x] T2a: Early inline script in layout head: if navigation type is not back_forward, set history.scrollRestoration='manual' and force scroll to 0 before paint; strip URL hash on load when not back_forward.
- [x] T2b: Client anchor interceptor: capture-phase click on internal `#...` links -> preventDefault + target.scrollIntoView({behavior}) without writing hash (replaceState to clean); special-case #main for focus; Next Link defaultPrevented already blocks router navigation.
- [x] T3: Create BackToTop.tsx + ArrowUpIcon (icons.tsx if missing); mount in page.tsx; scroll listener + footer IntersectionObserver; styles per constraint.
- [x] Verify: pnpm exec tsc --noEmit; pnpm lint; pnpm build.
- [x] Manual test steps documented for user.
- [x] Commit + push. → `a589c4c` on origin/main

## Acceptance criteria
- Dots orbit continuously without jump; layout untouched; reduced-motion respected.
- Reload always starts at top (except back/forward navigation restores prior position).
- Anchor nav still smooth-scrolls to #carta/#visitar/category ids and updates chip spy.
- Skip-link still focuses main content.
- Back-to-top appears after hero, hides near footer, is keyboard accessible when visible, does not cover sticky chip bar or footer CTAs.

## Checks
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`
- Structural HTML/CSS review (no headless browser available in env).

## Progress
- [x] Investigation and root-cause analysis complete (pre-compaction).
- [x] User approved approach via question tool ("Proceder e implementar").
- [x] T1 orbitals
- [x] T2 reload fix
- [x] T3 back-to-top
- [x] Verification green (tsc PASS, lint PASS, build PASS — parent spot-check re-ran all three; post-hardening tsc+lint re-run PASS)
- [x] Commit + push → `a589c4c feat: animate hero dots, reset scroll on reload, add back-to-top` (7 files, +215/-5)

## Route declaration
- T1: delegated (writer) — 2+ non-trivial files (Hero.tsx + globals.css).
- T2: delegated (same writer batch) — layout.tsx + new interceptor component.
- T3: delegated (same writer batch) — new BackToTop.tsx + icons + page.tsx.
- Triggers: writer trigger (2+ non-trivial files); mapping already done pre-compaction.

## Delivery strategy
- single-pr (default): one PR/commit set to main under 400-line heuristic (expected well under).

## Verification evidence
- `pnpm exec tsc --noEmit`: PASS (writer + parent spot-check + post-hardening re-run)
- `pnpm lint`: PASS (writer + parent spot-check + post-hardening re-run)
- `pnpm build`: PASS (writer + parent spot-check; Next 16.3.6 Turbopack, 4 static pages)
- RDD: off (default). Native review assess/status unavailable in this runtime (immutable_review_transport_unsupported); tier = unassessable → independent verifier.
- Independent verifier: **PASS** — all T1/T2/T3 spec bullets and global constraints met; Next Link defaultPrevented verified against installed Next 16.3.6 source; package.json unchanged; MenuNav untouched.
- Hardening applied from verifier suggestion: early `scrollTo` now uses `{behavior:"instant"}` so CSS `scroll-behavior:smooth` cannot animate the pre-paint reset.
- Verifier SUGGESTION (not applied, out of spec): sequential focus-start-point for non-#main anchors — noted only.
- Diff: 5 modified files (globals.css, layout.tsx, page.tsx, Hero.tsx, icons.tsx) + 2 new (AnchorNav.tsx, BackToTop.tsx); package.json unchanged.

## Next step
Done. Manual browser QA remains with the user (no headless browser in env).
