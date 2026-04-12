# 📱 Social Media Links Added!

## ✅ What I Added

1. **Facebook field** in site settings
2. **Instagram field** in site settings
3. **Social media icons** in footer
4. **"Follow Us" section** in footer (shows only if URLs are provided)

## 🎯 How to Add Your Social Media Links

### Step 1: Go to Admin Settings

1. Visit: https://orthocarehub.in/admin
2. Click **Settings** tab
3. Scroll to the contact section

### Step 2: Add Your URLs

You'll see two new fields:

**Facebook URL:**
```
https://facebook.com/yourpage
```

**Instagram URL:**
```
https://instagram.com/yourprofile
```

### Step 3: Save

Click **Save Configuration** button

### Step 4: Check Footer

- Refresh your homepage
- Scroll to footer
- You'll see "Follow Us" section with Facebook and Instagram icons

---

## 📋 How to Get Your Social Media URLs

### Facebook:

1. **Go to your Facebook page**
2. **Copy the URL** from the address bar
3. **Example formats:**
   - `https://facebook.com/DrSrivanthOrtho`
   - `https://www.facebook.com/profile.php?id=123456789`
   - `https://fb.me/yourpage`

### Instagram:

1. **Go to your Instagram profile**
2. **Copy the URL** from the address bar
3. **Example formats:**
   - `https://instagram.com/drsrivanthortho`
   - `https://www.instagram.com/yourprofile`

---

## 🎨 What It Looks Like

### Footer "Follow Us" Section:

```
Get In Touch
📍 Your address
📞 Your phone
✉️ Your email

Follow Us
[Facebook Icon] [Instagram Icon]
```

### Icon Design:
- Circular buttons
- Teal background (matches your theme)
- Hover effect (lighter on hover)
- Opens in new tab when clicked

---

## 🔄 Deploy the Changes

### Step 1: Commit and Push
```bash
git add .
git commit -m "Add Facebook and Instagram social media links"
git push
```

### Step 2: Wait for Deployment
- Vercel will auto-deploy in 2-3 minutes

### Step 3: Add Your URLs
1. Go to Admin → Settings
2. Add Facebook URL
3. Add Instagram URL
4. Click Save

### Step 4: Verify
- Refresh homepage
- Scroll to footer
- Click icons to test they work

---

## 🎯 Features

### Smart Display:
- ✅ Icons only show if URLs are provided
- ✅ If no social media URLs, section is hidden
- ✅ Can add just Facebook, just Instagram, or both

### Accessibility:
- ✅ Proper aria-labels for screen readers
- ✅ Opens in new tab (target="_blank")
- ✅ Secure links (rel="noopener noreferrer")

### Design:
- ✅ Matches your site theme (teal)
- ✅ Responsive on mobile
- ✅ Hover effects
- ✅ Professional appearance

---

## 📝 Example URLs

### Your Clinic:

**Facebook:**
```
https://facebook.com/DrSrivanthDasariOrthoClinic
```

**Instagram:**
```
https://instagram.com/drsrivanthortho
```

### Test Links:

Before adding your real URLs, you can test with:
- Facebook: `https://facebook.com`
- Instagram: `https://instagram.com`

Then update with your actual profile URLs.

---

## 🔍 Troubleshooting

### Icons not showing:
- Make sure you added the URLs in Admin Settings
- Make sure URLs start with `https://`
- Click Save after adding URLs
- Refresh the page

### Links not working:
- Check URLs are correct
- Make sure they start with `https://`
- Test the URLs in a browser first

### Wrong page opens:
- Double-check the URL you entered
- Copy the URL directly from your Facebook/Instagram page

---

## 🎨 Customize Icon Style (Optional)

If you want to change the icon appearance, edit `src/components/Layout.tsx`:

**Current style:**
```tsx
className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20"
```

**Larger icons:**
```tsx
className="w-12 h-12 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20"
```

**Square icons:**
```tsx
className="w-10 h-10 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20"
```

**Different color:**
```tsx
className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30"
```

---

## ✅ Verification Checklist

- [ ] Code deployed to production
- [ ] Facebook URL added in Admin Settings
- [ ] Instagram URL added in Admin Settings
- [ ] Settings saved
- [ ] Homepage refreshed
- [ ] Footer shows "Follow Us" section
- [ ] Facebook icon visible and clickable
- [ ] Instagram icon visible and clickable
- [ ] Links open correct pages in new tab

---

## 🚀 Next Steps

1. **Deploy the code** (commit and push)
2. **Add your social media URLs** in Admin Settings
3. **Save and refresh** to see the icons
4. **Share your social media** to grow your following!

---

## 📱 Social Media Best Practices

### For Your Clinic:

**Facebook Page:**
- Post patient testimonials (with permission)
- Share health tips
- Announce clinic hours/holidays
- Post before/after success stories
- Engage with patient questions

**Instagram Profile:**
- Share educational content
- Post clinic photos
- Share patient success stories
- Use relevant hashtags (#orthopedic #hyderabad)
- Stories for daily updates

---

**Social media links are now ready - just deploy and add your URLs!** 📱
