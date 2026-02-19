# Login Page Enhancement Changelog

Track of all changes made to the login page for the assignment.

---

## Session 1: Initial Enhancement (SCSS-focused)

### Changes Made

1. **Animated gradient background**
   - Replaced solid charcoal with animated mesh gradient (deep blues/purples: #0f0c29, #302b63, #24243e, #1a1a2e, #16213e)
   - Background animates over 15s via `gradientShift` keyframes

2. **Floating blur blobs**
   - Added `::before` and `::after` pseudo-elements to `.login-page-content`
   - Large blurred circles (400px, 300px) with gradient fills
   - `floatBlob` animation (20s) for gentle motion
   - Uses `filter: blur(80px)` for soft orbs

3. **Glassmorphism login card**
   - Semi-transparent dark background: `rgba(33, 33, 33, 0.65)`
   - `backdrop-filter: blur(20px)` for frosted glass effect
   - Subtle white border: `1px solid rgba(255, 255, 255, 0.12)`
   - Layered box-shadow for depth

4. **Card entrance animation**
   - `cardEnter` keyframes: fade in + slide up (0.8s, cubic-bezier bounce)
   - Staggered `fadeInUp` on input-container and button-group

5. **Button enhancements**
   - Hover: lift (`translateY(-2px)`) + blue glow
   - Primary button: gradient background, enhanced shadow
   - Border-radius: 12px, font-weight: 600

6. **Input field styling**
   - Rounded fields (12px), semi-transparent dark background
   - Hover/focus states with blue glow
   - Material outline overrides for dark theme

7. **Modal styling**
   - Glassmorphism modal content
   - Backdrop blur on overlay
   - `modalSlideIn` entrance animation

8. **Alert styling**
   - Danger alerts with backdrop blur
   - Hover scale effect

---

## Session 2: White Border Fix

### Problem
~1 inch white border around the login page caused by:
- `.app-main` in `app.component.scss` has `padding: 64px` (spacing.$spacing-large)
- `body` / `.app-container` use off-white background (#fafafa)
- Login sits inside that padded area, so padding shows as white frame

### Fix
- `.login-page-content` set to `position: fixed; inset: 0` so it covers the full viewport and ignores parent padding
- Ensures gradient background extends edge-to-edge with no white border

### Files Modified
- `login.component.scss`

---

## Session 3: Email/Password Text Lighter

### Changes Made
- Form field labels (Email, Password): changed from `rgba(255, 255, 255, 0.9)` to full white
- Added `.mat-mdc-floating-label` and `.mdc-floating-label` for Material's floating label states
- Input text: already white, kept `colors.$colors-white`
- Placeholder text: added `::placeholder` styling with `rgba(255, 255, 255, 0.7)` for visible but slightly dimmed placeholders

---

## Session 4: Nav Outside Card, Single Card Swaps Content

### Changes Made
- **Login / Forgot Password / Register** moved outside the card into a nav bar above the card (`.auth-nav`).
- **No more modals**: Forgot Password and Register open inside the same card; clicking a nav button switches the card content (view state: `'login' | 'forgot-password' | 'register'`).
- **TS**: Replaced `passwordResetDialog` and `registerDialog` signals with a single `view` signal. On successful forgot-password or register, view is set back to `'login'`. Removed `MatDialog` and `MatDialogModule`.
- **HTML**: One `<mat-card class="login-box">` with `@switch (view())` for the three forms; modals removed.
- **SCSS**: Added `.auth-wrapper` (flex column, nav + card), `.auth-nav` (row of buttons, white text, `.active` state). Card no longer uses full viewport width/height; it sits inside the wrapper.
