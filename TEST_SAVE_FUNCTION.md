# 🧪 Test & Fix: Save Settings Function

## ✅ What I Fixed

1. **Added error handling** to `updateConfig` function
2. **Added error display** in AdminDashboard save handler
3. **Verified database permissions** work correctly

## 🚀 Apply the Fix & Test

### Step 1: Restart Dev Server
```bash
# Press Ctrl + C
npm run dev
```

### Step 2: Hard Refresh Browser
- Press **Ctrl + Shift + R** (or Cmd + Shift + R)

### Step 3: Log In
- Go to: http://localhost:8080/admin/login
- Email: `itsrajivv@gmail.com`
- Password: (your password)

### Step 4: Test Save Function

1. Go to **Settings** tab
2. Change **Doctor Name** to something else (e.g., "Dr. Test")
3. Click **Save** button
4. Watch for:
   - ✅ Success: "✓ Settings saved successfully!" message
   - ❌ Error: Alert popup with error message

---

## 🔍 If Save Fails

### Check Browser Console

1. Open DevTools (F12)
2. Go to **Console** tab
3. Try saving again
4. Look for error messages

### Common Errors & Solutions

#### Error: "No config row ID"
**Cause:** configRowId not loaded
**Solution:**
```javascript
// In browser console, check:
const { data } = await supabase.from('site_config').select('id').limit(1).single()
console.log('Config ID:', data?.id)
```

#### Error: "permission denied for table site_config"
**Cause:** RLS policy issue
**Solution:**
```bash
# Verify admin role
npx supabase db query "SELECT has_role('4f4e84da-43dd-4994-b28d-816967fdedb8'::uuid, 'admin'::app_role);" --linked
```

#### Error: "Failed to fetch"
**Cause:** Supabase connection issue
**Solution:**
- Check .env file
- Verify Supabase project not paused

---

## 🧪 Manual Test via Console

### Test 1: Check Auth

Open browser console (F12) and run:
```javascript
// Check if logged in and admin
const { data: { user } } = await supabase.auth.getUser()
console.log('User ID:', user?.id)
console.log('Email:', user?.email)

const { data: isAdmin } = await supabase.rpc('has_role', {
  _user_id: user?.id,
  _role: 'admin'
})
console.log('Is Admin:', isAdmin)
```

**Expected:**
- User ID: 4f4e84da-43dd-4994-b28d-816967fdedb8
- Email: itsrajivv@gmail.com
- Is Admin: true

### Test 2: Check Config Loading

```javascript
// Check if config loads
const { data: config, error } = await supabase
  .from('site_config')
  .select('*')
  .limit(1)
  .single()

console.log('Config ID:', config?.id)
console.log('Doctor Name:', config?.config?.doctorName)
console.log('Error:', error)
```

**Expected:**
- Config ID: d394024d-550e-42a8-b7a7-6eb3b176851f
- Doctor Name: Dr. Ortho
- Error: null

### Test 3: Test Update Permission

```javascript
// Try to update config
const { data, error } = await supabase
  .from('site_config')
  .update({ 
    config: { 
      doctorName: 'Test Update',
      clinicName: 'Test Clinic'
    },
    updated_at: new Date().toISOString()
  })
  .eq('id', 'd394024d-550e-42a8-b7a7-6eb3b176851f')
  .select()

console.log('Update Result:', data)
console.log('Update Error:', error)
```

**Expected:**
- Update Result: [{ id: '...', config: {...} }]
- Update Error: null

If this works, the issue is in the React component, not permissions.

---

## 🔧 Alternative: Direct Database Update

If the UI save doesn't work, you can update settings directly via database:

```bash
# Update doctor name
npx supabase db query "UPDATE site_config SET config = jsonb_set(config, '{doctorName}', '\"Dr. Your Name\"') WHERE id = 'd394024d-550e-42a8-b7a7-6eb3b176851f';" --linked

# Update clinic name
npx supabase db query "UPDATE site_config SET config = jsonb_set(config, '{clinicName}', '\"Your Clinic Name\"') WHERE id = 'd394024d-550e-42a8-b7a7-6eb3b176851f';" --linked

# Update phone
npx supabase db query "UPDATE site_config SET config = jsonb_set(config, '{phone}', '\"+91XXXXXXXXXX\"') WHERE id = 'd394024d-550e-42a8-b7a7-6eb3b176851f';" --linked

# Update email
npx supabase db query "UPDATE site_config SET config = jsonb_set(config, '{email}', '\"your@email.com\"') WHERE id = 'd394024d-550e-42a8-b7a7-6eb3b176851f';" --linked
```

---

## 📊 Debug Checklist

Before reporting the issue, verify:

- [ ] Dev server restarted
- [ ] Browser cache cleared (Ctrl + Shift + R)
- [ ] Logged in as admin
- [ ] Browser console open (F12)
- [ ] Tried saving settings
- [ ] Checked console for errors
- [ ] Ran manual tests above

---

## 🎯 What Should Happen

### Successful Save Flow:

1. **User clicks Save** → handleSaveConfig called
2. **updateConfig called** → Updates local state
3. **Supabase update** → Persists to database
4. **Success message** → "✓ Settings saved successfully!"
5. **Message disappears** → After 2 seconds

### Failed Save Flow:

1. **User clicks Save** → handleSaveConfig called
2. **updateConfig called** → Updates local state
3. **Supabase update fails** → Error thrown
4. **Error caught** → Console error logged
5. **Alert shown** → "Failed to save settings: [error message]"

---

## 🆘 Still Not Working?

### Get Complete Debug Info

Run this comprehensive debug script in browser console:

```javascript
const fullDebug = async () => {
  console.log('=== FULL DEBUG INFO ===')
  
  // 1. Auth Status
  const { data: { user } } = await supabase.auth.getUser()
  console.log('1. USER:', {
    id: user?.id,
    email: user?.email,
    confirmed: user?.email_confirmed_at
  })
  
  // 2. Admin Status
  const { data: isAdmin } = await supabase.rpc('has_role', {
    _user_id: user?.id,
    _role: 'admin'
  })
  console.log('2. IS ADMIN:', isAdmin)
  
  // 3. Config Loading
  const { data: config, error: configError } = await supabase
    .from('site_config')
    .select('*')
    .limit(1)
    .single()
  console.log('3. CONFIG:', {
    id: config?.id,
    doctorName: config?.config?.doctorName,
    error: configError
  })
  
  // 4. Update Test
  const testConfig = { ...config.config, doctorName: 'Debug Test ' + Date.now() }
  const { data: updateData, error: updateError } = await supabase
    .from('site_config')
    .update({ 
      config: testConfig,
      updated_at: new Date().toISOString()
    })
    .eq('id', config.id)
    .select()
  console.log('4. UPDATE TEST:', {
    success: !updateError,
    error: updateError,
    data: updateData
  })
  
  // 5. RLS Policies
  const { data: policies } = await supabase
    .rpc('pg_policies' as any)
    .eq('tablename', 'site_config')
  console.log('5. RLS POLICIES:', policies)
  
  console.log('=== END DEBUG ===')
}

fullDebug()
```

**Share the complete output with me and I can diagnose the exact issue!**

---

## ✅ Expected Result

After the fix:
- Click Save button
- See "✓ Settings saved successfully!" message
- Refresh page
- Settings are persisted

**Try it now and let me know what happens!** 🚀
