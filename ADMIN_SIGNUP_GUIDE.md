# 🔐 Admin Account Creation Guide

## The Issue

You're trying to **log in** or **reset password** but you don't have an account yet!

You need to **SIGN UP** first to create your admin account.

---

## ✅ Step-by-Step: Create Your Admin Account

### Step 1: Verify Signups Are Enabled ✅

I've already enabled signups for you in the database.

### Step 2: Go to Admin Login Page

Open: http://localhost:8080/admin/login

### Step 3: Look for "Sign Up" Button

At the bottom of the login form, you should see:

**"Need an account? Sign Up"**

If you don't see this button:
1. Hard refresh the page (Ctrl + Shift + R or Cmd + Shift + R)
2. Or try in an incognito/private window

### Step 4: Click "Sign Up"

This will change the form to signup mode.

### Step 5: Fill in Signup Form

- **Email:** `itsrajivv@gmail.com` (MUST be this exact email!)
- **Password:** Choose a strong password (minimum 6 characters)
  - Example: `MySecurePass123!`
  - **SAVE THIS PASSWORD!** You'll need it to log in

### Step 6: Click "Sign Up" Button

The system will:
1. Create your account
2. Automatically assign admin role (via edge function)
3. Send a confirmation email

### Step 7: Check Your Email

1. Open your email inbox for `itsrajivv@gmail.com`
2. Look for email from Supabase
3. Subject will be like "Confirm your signup" or "Confirm your email"
4. **Check spam/junk folder** if you don't see it in inbox
5. Click the confirmation link in the email

### Step 8: Log In

After confirming your email:
1. Go back to: http://localhost:8080/admin/login
2. Enter:
   - Email: `itsrajivv@gmail.com`
   - Password: (the password you chose in Step 5)
3. Click "Sign In"
4. You should be redirected to the Admin Dashboard!

### Step 9: Disable Signups (Important!)

Once you're logged in to the Admin Dashboard:
1. Go to **Settings** tab
2. Scroll to **Feature Toggles** section
3. Toggle **"Allow New Sign Ups"** to OFF
4. This prevents unauthorized people from creating accounts

---

## 🆘 Troubleshooting

### I don't see the "Sign Up" button

**Solution:**
1. Hard refresh: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
2. Clear browser cache
3. Try incognito/private window
4. Make sure you're at: http://localhost:8080/admin/login

### Email confirmation not arriving

**Check these:**
1. **Spam/Junk folder** - it often goes there
2. **Promotions tab** (if using Gmail)
3. **Wait 2-3 minutes** - sometimes it's delayed

**If still no email after 5 minutes:**

Let me know and I can:
1. Manually confirm your user in the database
2. Check Supabase email settings
3. Verify the edge function ran correctly

### "Invalid credentials" error when logging in

This means:
1. You haven't confirmed your email yet (check inbox)
2. Wrong password (try password reset)
3. Account doesn't exist (sign up first)

### Admin page still loading forever

This means:
1. You're not logged in (sign up and log in first)
2. Admin role wasn't assigned (I can fix this manually)
3. Browser cache issue (try incognito window)

---

## 🔍 Verify Your Account Was Created

After signing up, I can check if your account exists:

Run this command:
```bash
npx supabase db query "SELECT id, email, email_confirmed_at, created_at FROM auth.users WHERE email = 'itsrajivv@gmail.com';" --linked
```

This will show if your account was created and if email is confirmed.

---

## 🔑 Manual Admin Role Assignment (If Needed)

If you signed up but admin role wasn't assigned automatically, I can fix it manually:

```bash
# First, get your user ID
npx supabase db query "SELECT id FROM auth.users WHERE email = 'itsrajivv@gmail.com';" --linked

# Then assign admin role (replace USER_ID with actual ID from above)
npx supabase db query "INSERT INTO user_roles (user_id, role) VALUES ('USER_ID', 'admin') ON CONFLICT DO NOTHING;" --linked
```

---

## 📝 Summary

**What you need to do:**

1. Go to http://localhost:8080/admin/login
2. Click "Need an account? Sign Up"
3. Email: `itsrajivv@gmail.com`
4. Password: (choose and save it!)
5. Click "Sign Up"
6. Check email and confirm
7. Log in with your credentials
8. Disable signups in Settings

**That's it!** You'll have full admin access.

---

## 🎯 Current Status

- ✅ Supabase project set up
- ✅ Database migrations complete
- ✅ Edge function deployed
- ✅ Signups enabled
- ✅ Local dev server running
- ⏳ **Next:** Create your admin account (follow steps above)

---

**Need help?** Let me know which step you're stuck on!
