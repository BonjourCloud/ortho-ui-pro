# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Analytics & Tracking

### GA4 Setup

- Measurement ID: `G-XM4W5D4RRL` (in `index.html` — do not change)
- Custom events tracked:
  - `phone_click` — fired on any tel: link click
  - `whatsapp_click` — fired on any wa.me link click
  - Both include `event_label` (location) and `page_location`

### How to check click data in GA4

1. Go to https://analytics.google.com
2. Reports → Engagement → Events
3. Look for `phone_click` and `whatsapp_click`

### Monthly trend check (Google Search Console)

1. Go to https://search.google.com/search-console
2. Performance → Search results
3. Date range: Custom, 3 months back
4. Click "Compare" → "Compare by month"
5. Check Clicks + Impressions for Aug / Sep / Oct

### Offline action items (NOT code changes)

- Old Yola site (srivanthsorthopedicclinics-site.yolasite.com) still live → must be deleted from Yola by Dr. Srivanth
- Directory inconsistency: update "15+ years experience" on Practo, JustDial, ClinicSpots, Google Business Profile
