# Email Notification Setup Guide

## Overview
Email notifications are now implemented for the Book Appointment system using **Resend** (modern email API) and **Supabase Edge Functions**.

## What Happens When Someone Books an Appointment?

1. **Appointment saved to database** (Supabase `appointments` table)
2. **Email sent to admin** (itsrajivv@gmail.com) with all appointment details
3. **Email sent to patient** (if they provided email) with confirmation and next steps
4. **Success message shown** to patient on website

---

## Setup Instructions

### Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### Step 2: Get Resend API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it: `OrthoCarehub Production`
4. Copy the API key (starts with `re_...`)

### Step 3: Configure Domain (Optional but Recommended)

**Option A: Use Resend's Test Domain (Quick Start)**
- You can send emails immediately using `onboarding@resend.dev`
- Emails will work but may go to spam
- Good for testing

**Option B: Use Your Own Domain (Production)**
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter: `orthocarehub.in`
4. Add the DNS records shown to your domain provider:
   - **MX Record**: `feedback-smtp.us-east-1.amazonses.com` (Priority: 10)
   - **TXT Record**: `v=spf1 include:amazonses.com ~all`
   - **CNAME Records**: For DKIM verification (3 records provided by Resend)
5. Wait for verification (usually 5-30 minutes)
6. Once verified, you can send from `appointments@orthocarehub.in`

### Step 4: Deploy Edge Function to Supabase

1. Install Supabase CLI (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref lbcnvyrzzhwcstlomlbs
   ```

4. Set the Resend API key as a secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
   ```

5. Deploy the function:
   ```bash
   supabase functions deploy send-appointment-email
   ```

### Step 5: Test the System

1. Go to https://orthocarehub.in/book
2. Fill out the appointment form
3. Submit the form
4. Check:
   - ✅ Appointment appears in Supabase `appointments` table
   - ✅ Email received at itsrajivv@gmail.com
   - ✅ If patient email provided, they receive confirmation email

---

## Email Templates

### Admin Email (to itsrajivv@gmail.com)
**Subject:** New Appointment: [Patient Name] - [Date]

**Content:**
- Patient name, phone, email
- Appointment type and service
- Preferred date and time
- Symptoms description
- Insurance and EMI interest
- Reminder to confirm via WhatsApp within 2 hours

### Patient Email (if email provided)
**Subject:** Appointment Request Received - Dr. Srivanth's Orthopedic Clinic

**Content:**
- Thank you message
- Appointment details summary
- Next steps (WhatsApp confirmation within 2 hours)
- Contact information

---

## Troubleshooting

### Emails Not Sending?

1. **Check Supabase Function Logs:**
   ```bash
   supabase functions logs send-appointment-email
   ```

2. **Verify API Key:**
   ```bash
   supabase secrets list
   ```
   Should show `RESEND_API_KEY` (value hidden)

3. **Check Resend Dashboard:**
   - Go to resend.com → Logs
   - See if emails are being sent
   - Check for errors

4. **Test the Function Directly:**
   ```bash
   curl -X POST \
     https://lbcnvyrzzhwcstlomlbs.supabase.co/functions/v1/send-appointment-email \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Test",
       "lastName": "Patient",
       "phone": "+91 98765 43210",
       "email": "test@example.com",
       "appointmentType": "new",
       "preferredDate": "2026-04-20",
       "preferredTime": "10:00 AM",
       "symptoms": "Test symptoms"
     }'
   ```

### Emails Going to Spam?

1. **Verify your domain** (see Step 3, Option B above)
2. **Add SPF, DKIM, DMARC records** (provided by Resend)
3. **Use a professional "from" address** like `appointments@orthocarehub.in`
4. **Avoid spam trigger words** in email content

---

## Cost

**Resend Pricing:**
- **Free Tier**: 100 emails/day, 3,000 emails/month
- **Pro Tier**: $20/month for 50,000 emails/month
- For a clinic, free tier should be sufficient

---

## Alternative: Using Gmail SMTP (Not Recommended)

If you prefer to use Gmail instead of Resend:

1. Enable 2-factor authentication on Gmail
2. Generate an App Password
3. Update the edge function to use Nodemailer with Gmail SMTP
4. Note: Gmail has daily sending limits (500 emails/day)

---

## Files Modified

1. **supabase/functions/send-appointment-email/index.ts** - Edge function for sending emails
2. **src/pages/BookAppointment.tsx** - Updated to call email function after saving appointment
3. **EMAIL_SETUP_GUIDE.md** - This guide

---

## Next Steps

1. ✅ Create Resend account
2. ✅ Get API key
3. ✅ Deploy edge function with API key
4. ✅ Test appointment booking
5. ⏳ (Optional) Configure custom domain for professional emails
6. ⏳ Monitor email delivery in Resend dashboard

---

## Support

If you need help:
- Resend Docs: https://resend.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Contact: support@resend.com
