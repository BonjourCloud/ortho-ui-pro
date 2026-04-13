# Quick Deploy: Email Notifications

## Prerequisites
- Resend account with API key
- Supabase CLI installed

## Deploy in 5 Steps

### 1. Install Supabase CLI (if needed)
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link Your Project
```bash
supabase link --project-ref lbcnvyrzzhwcstlomlbs
```

### 4. Set Resend API Key
```bash
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```
Replace `re_your_actual_api_key_here` with your actual Resend API key.

### 5. Deploy the Function
```bash
supabase functions deploy send-appointment-email
```

## Test It
1. Go to https://orthocarehub.in/book
2. Fill and submit the form
3. Check email at itsrajivv@gmail.com

## View Logs
```bash
supabase functions logs send-appointment-email --follow
```

## Update Function (if you make changes)
```bash
supabase functions deploy send-appointment-email
```

---

## Get Resend API Key

1. Go to https://resend.com
2. Sign up (free - 100 emails/day)
3. Dashboard → API Keys → Create API Key
4. Copy the key (starts with `re_`)

---

## Troubleshooting

**Function not found?**
```bash
supabase functions list
```

**Check secrets:**
```bash
supabase secrets list
```

**Test function directly:**
```bash
curl -X POST \
  https://lbcnvyrzzhwcstlomlbs.supabase.co/functions/v1/send-appointment-email \
  -H "Authorization: Bearer sb_publishable_a35Y87i6hrmo8nCssgPnrg_5Z0Nx2bo" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phone": "+91 98765 43210",
    "email": "test@example.com",
    "appointmentType": "new",
    "preferredDate": "2026-04-20",
    "preferredTime": "10:00 AM",
    "symptoms": "Test booking"
  }'
```

---

## What Happens?

1. **Patient books appointment** → Saved to database
2. **Email to admin** (itsrajivv@gmail.com) with all details
3. **Email to patient** (if email provided) with confirmation
4. **Success message** shown on website

---

## Current Status

✅ Code implemented
✅ Edge function created
⏳ Needs: Resend API key + deployment
⏳ Optional: Custom domain setup for professional emails
