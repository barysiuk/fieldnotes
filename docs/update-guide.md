# Updating Your FieldNotes App

Welcome back! New features have been added to FieldNotes since you set it up. This guide will walk you through getting the latest code and running the updated app. It should only take a few minutes.

---

## Step 1: Update the Code from GitHub

First, let's get the latest version of the project. Open Terminal and run:

```bash
cd ~/projects/fieldnotes
git pull
```

This downloads all the new changes from GitHub to your computer. You should see a list of files that were updated.

---

## Step 2: Install New Dependencies

New packages have been added since the initial setup, so we need to install them:

```bash
cd ~/projects/fieldnotes/mobile
npm install
```

This will download any new packages that were added. It should be faster than the first time since most packages are already installed.

---

## Step 3: Update Your Environment File

The app now needs a few new configuration values that weren't there during the initial setup. Run these commands to add them:

```bash
cd ~/projects/fieldnotes/mobile
echo 'EXPO_PUBLIC_FIELDNOTES_NOTES_BUCKET=voice-notes' >> .env
echo 'EXPO_PUBLIC_SUPABASE_PROCESS_NOTE_FUNCTION=process-note' >> .env
echo 'EXPO_PUBLIC_SUPABASE_CREATE_CONTEXT_SHEET_FUNCTION=create-context-sheet' >> .env
```

You can verify it worked by running:

```bash
cat .env
```

You should see all five lines:

```
EXPO_PUBLIC_SUPABASE_URL=...(url here)
EXPO_PUBLIC_SUPABASE_ANON_KEY=...(key here)
EXPO_PUBLIC_FIELDNOTES_NOTES_BUCKET=voice-notes
EXPO_PUBLIC_SUPABASE_PROCESS_NOTE_FUNCTION=process-note
EXPO_PUBLIC_SUPABASE_CREATE_CONTEXT_SHEET_FUNCTION=create-context-sheet
```

---

## Step 4: Launch the App

Now let's run the updated app in the iPhone Simulator:

```bash
cd ~/projects/fieldnotes/mobile
npx expo run:ios
```

The app will rebuild with the new changes. Since most of the build is cached from before, it should be faster than the very first time.

---

## Quick Reference

Here are all the commands in one place:

```bash
# Update the code
cd ~/projects/fieldnotes
git pull

# Install new dependencies
cd mobile
npm install

# Add new environment variables
echo 'EXPO_PUBLIC_FIELDNOTES_NOTES_BUCKET=voice-notes' >> .env
echo 'EXPO_PUBLIC_SUPABASE_PROCESS_NOTE_FUNCTION=process-note' >> .env
echo 'EXPO_PUBLIC_SUPABASE_CREATE_CONTEXT_SHEET_FUNCTION=create-context-sheet' >> .env

# Launch the app
npx expo run:ios
```

---

That's it — you should see all the new features in the app!
