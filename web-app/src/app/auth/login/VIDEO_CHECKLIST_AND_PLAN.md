# Login Video: Requirements Checklist + Video Plan

## Part 1: Have We Done All the Requirements?

| # | Requirement | Status | Notes / Action |
|---|----------------|--------|----------------|
| 1 | **Raw SCSS: login-form box justify-center, flex, column** | ✅ Done | `.login-page-content`: `display: flex; justify-content: center; align-items: center`. `.auth-wrapper`: `flex-direction: column; align-items: center`. `.login-box`: `display: flex; flex-direction: column; align-items: center`. |
| 2 | **Show Username field, Password field, Login button, Forgot password** | ⚠️ Partial | You have **Email** (not "Username"), Password, Login button, and Forgot Password nav button. For the video: either say "we use email as the login identifier" or add/rename to "Username" in the UI. |
| 3 | **Show in code how they bind with SCSS + HTML** | ✅ Done | `formControlName="email"` / `formControlName="password"`, `.input-container` / `.login-box` / `.button-group` in SCSS. |
| 4 | **Left screenshot: validation rules** | ✅ Done | Required + email valid; password required + min 8 chars. `type="password"` for dots. `mat-error` bound to `invalid && touched`. |
| 5 | **Right screenshot: Login button disabled when form invalid** | ✅ Done | `[disabled]="!loginForm.valid \|\| isLoading()"`. When valid, button enables. |
| 6 | **Hardcoded login (no backend this week)** | ❌ Not done | Assignment says: *"hard code the below logic to demonstrate it manually"*. You currently call `authService.login()`. **Action:** Add hardcoded username + password; if match → success + loader + set auth true; else → red alert "Login Failed". You can keep backend call as fallback or switch to hardcoded-only for the demo. |
| 7 | **Error: no match → red, styled popover "Login Failed"** | ✅ Done | You have red `.alert-danger` and `errorMsg.set('Login Failed! Can not Authenticate')`. Assignment says "Login Failed" — you can use that exact phrase for the slide or keep current. |
| 8 | **Success: match → "success", loader, set auth true** | ✅ Done | SnackBar "Login successful!", loader via `isLoading()`, `authStore.login()`. If you add hardcoded path, do the same there. |
| 9 | **v-alert binding (Vuetify)** | ✅ Equivalent | You're in Angular; the *idea* is an alert bound to an error string. You have `@if (errorMsg())` and `{{ errorMsg() }}` in a styled alert — same binding concept. In the video say "this is our Angular equivalent of a v-alert: a conditional block bound to an error message string." |
| 10 | **Reset password button pops open a dialog** | ❌ Not done | You have **in-card view switch** (Forgot Password changes card content). Assignment asks for a **dialog**. **Action:** Add a MatDialog that opens when user clicks "Forgot Password"; put the reset form (or a simple message + email field) in the dialog. On submit, call existing `submitForgotPassword()` logic and close dialog. |
| 11 | **Show reset submission logic + whether email is sent** | ✅ Logic done | You have `submitForgotPassword()` and `authService.forgotPassword()`. For "if email is sent" you can show the success SnackBar and say ".env + Docker are configured so the backend can send the email." Dialog (above) would make the "pops open" part clear. |
| 12 | **Explain in code how it gets to the backend (login component)** | ✅ Done | You can show: form → `submitLogin()` → `authService.login(loginForm.value)` → subscribe → success/error handling, and same for forgot password. |
| 13 | **Loom: enhanced login page, look nice** | ✅ Done | Gradient, glassmorphism card, animations, etc. |
| 14 | **Verbal walkthrough: data flow between bindings** | ✅ Ready | Plan below gives you the flow to describe. |

---

## Part 2: What You Need to Change Before the Video

1. **Add hardcoded login demo (optional but requested)**  
   In `submitLogin()`, check against e.g. `username === 'demo' && password === 'password123'` (or your choice). If match: set loader, then success message, set auth true, navigate. If no match: set `errorMsg('Login Failed')`. You can do this *before* calling the real backend, or temporarily replace the backend call for the video.

2. **Reset password as a dialog**  
   Use `MatDialog` to open a dialog when "Forgot Password" is clicked. Dialog content can include the same email field and submit button; on submit call `AuthService.forgotPassword()` and close dialog. Keeps your existing submission logic; only the UI changes from in-card to dialog.

3. **Username vs Email**  
   If the rubric strictly says "Username", add a label "Username" (or change "Email" to "Username" for the demo). Otherwise, one sentence in the video: "We use email as the login identifier."

---

## Part 3: Video Plan (Order to Follow)

Do this in order so your Loom matches the assignment flow.

---

### 1. OPEN WITH “VIDEO START HERE”

- Say you’ll walk through the login page in code and on screen in this order.

---

### 2. RAW SCSS – FLEXBOX (LOGIN-FORM BOX)

- **Screen:** Open `login.component.scss`.
- **Point to:**
  - **`.login-page-content`**  
    - `display: flex` → flex container.  
    - `justify-content: center` and `align-items: center` → centers the child (the auth wrapper) in the viewport.
  - **`.auth-wrapper`**  
    - `display: flex; flex-direction: column; align-items: center` → column layout, content centered horizontally.
  - **`.login-box`**  
    - `display: flex; flex-direction: column; align-items: center` → the card itself is also a flex column, centered.
- **Say:** “The page is one big flex container that centers everything. The wrapper and the login card are flex columns so the form stacks vertically and stays centered.”

---

### 3. FIELDS + BINDINGS (HTML ↔ SCSS)

- **Screen:** Split or switch between `login.component.html` and `login.component.scss`.
- **Show:**
  - **Username/Email field:**  
    - HTML: `<input matInput ... formControlName="email" />` and `mat-label` "Email".  
    - SCSS: `.input-container` (flex column, spacing), `.full-width`, and any `.mat-form-field` overrides you have.
  - **Password field:**  
    - HTML: `formControlName="password"` and **`type="password"`** (mention: “this is what makes the dots”).  
    - Same SCSS: inside `.input-container`.
  - **Login button:**  
    - HTML: `mat-raised-button`, `(click)="submitLogin()"`, `type="submit"`.  
    - SCSS: `.button-group` and `button[color="primary"]` (layout and styling).
  - **Forgot password:**  
    - HTML: nav button `(click)="view.set('forgot-password')"` (or, after you add it, “opens the reset dialog”).  
    - SCSS: `.auth-nav` (flex row, spacing, `.active` state).
- **Say:** “Each field is bound with `formControlName` to the reactive form. The same class names in the HTML are styled in the SCSS file — e.g. `input-container` and `button-group` control layout and spacing.”

---

### 4. LEFT SIDE (SCREENSHOT / LIVE) – VALIDATION

- **Screen:** Show the login form on the page (or a left screenshot).
- **Do:**  
  - Leave email empty → show required/email error.  
  - Type short password → show “at least 8 characters”.  
  - Show password field with dots (from `type="password"`).
- **Code:** Open HTML and TS.
  - **HTML:** `loginForm.get('email')?.invalid && loginForm.get('email')?.touched` and `mat-error` for email; same for password and “at least 8 characters”.
  - **TS:** `Validators.required`, `Validators.email`, `Validators.minLength(8)` on the form group.
- **Say:** “Validation is driven by the reactive form. The template only shows errors when the control is invalid and touched; the rules live in the component.”

---

### 5. RIGHT SIDE (SCREENSHOT / LIVE) – BUTTON DISABLED BINDING

- **Screen:** Form on the right (or right screenshot).
- **Do:** With empty or invalid form, show Login disabled; fix the fields, show it enabled.
- **Code:** `[disabled]="!loginForm.valid || isLoading()"`.
- **Say:** “The Login button is disabled when the form is invalid or when we’re loading. As soon as validations pass, the form becomes valid and the button enables.”

---

### 6. AFTER CLICKING LOGIN – ERROR (HARDCODED)

- **Say:** “For this week we’re not using the backend; we use hardcoded credentials.”
- **Code:** Show the hardcoded check (e.g. if username/password don’t match → set error message).
- **Screen:** Enter wrong credentials, click Login, show red alert with “Login Failed”.
- **Code:** `errorMsg.set('...')` and in HTML `@if (errorMsg()) { ... alert-danger ... }`.
- **Say:** “When credentials don’t match, we set the error message; the template is bound to that signal so the red alert appears. This is the same idea as a v-alert in Vuetify — a conditional block bound to an error string.”

---

### 7. AFTER CLICKING LOGIN – SUCCESS (HARDCODED)

- **Screen:** Enter the hardcoded username and password, click Login.
- **Show:** Loader (“Loading...” or similar), then success message, then redirect (auth true).
- **Code:** Show where you set `isLoading.set(true)`, then on match: success message, `authStore.login(...)`, and navigation.
- **Say:** “When they match, we turn on the loader, show success, set authentication to true in the store, and navigate to home. So the flow is: form → submit → check credentials → update state and UI.”

---

### 8. RESET PASSWORD – DIALOG + SUBMISSION

- **Screen:** Click “Forgot Password” and show the dialog opening (after you add it).
- **Code:**  
  - How you open the dialog (e.g. `MatDialog.open(ResetPasswordDialogComponent)`).  
  - Dialog template: email field and Submit.  
  - Submit calls the same logic you have now (e.g. `AuthService.forgotPassword(email)`), then closes the dialog and shows SnackBar.
- **Say:** “Reset password is in a dialog. When the user submits, we call the same forgot-password endpoint with the email; we don’t cover the backend here, but from the login component we send the email to the service, and if .env and Docker are set up, the backend can send the actual email.”

---

### 9. HOW IT GETS TO THE BACKEND (LOGIN COMPONENT ONLY)

- **Code only:** No need to show backend code.
- **Say and point to:**  
  - User submits → `submitLogin()` (or submit in dialog for reset).  
  - We read `loginForm.value` (or dialog form value).  
  - We call `authService.login(...)` or `authService.forgotPassword(...)`.  
  - Those methods return observables; we subscribe and handle next/error.  
  - “So the component’s job is to collect the form data, call the service, and update the UI and auth state based on the response.”

---

### 10. LOOM – ENHANCED PAGE + VERBAL WALKTHROUGH

- **Screen:** Run the app and show the full login page (gradient, card, animations).
- **Say:** “Here’s the full flow in one go: the page uses flexbox to center the card; the form binds to the reactive form; validation drives the errors and the button state; submit either shows an error or success and sets auth; forgot password opens a dialog and uses the same backend call.”
- Keep it short and high-level; you’ve already shown the details in the code sections.

---

## Part 4: Quick Reference – Data Flow to Describe

- **Template → Component:** `formControlName` binds inputs to `loginForm` (and other forms).  
- **Component → Template:** `loginForm.valid` drives `[disabled]`; `errorMsg()` and `isLoading()` drive alerts and button text.  
- **User action:** Click Login → `submitLogin()` → read `loginForm.value` → (hardcoded check or) `authService.login()` → subscribe → `authStore.login()` / `errorMsg.set()` / `isLoading.set()`.  
- **Forgot password:** Dialog opens → user enters email → submit → `authService.forgotPassword(email)` → subscribe → SnackBar and close dialog.

Use this checklist to confirm everything is done and this plan to order your Loom and verbal explanation.
