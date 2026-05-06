# Setting Up Your Computer for FieldNotes

Welcome! This guide will walk you through everything you need to install and set up on your Mac before you can work on the FieldNotes mobile app. Don't worry if this feels like a lot -- every developer goes through this once, and after it's done, you won't need to do most of it again.

We'll go step by step, and for each thing we install, we'll explain **what it is** and **why you need it**. If something doesn't work, don't panic -- that's normal in software development. Just re-read the step, and if you're still stuck, ask for help.

**What you'll need before you start:**

- A Mac computer (macOS)
- An internet connection (some downloads are large)
- About 2-3 hours (most of that is waiting for things to download)
- Patience!

---

## Step 1: Install Xcode

### What is Xcode?

Xcode is a program made by Apple that lets you build apps for iPhones and iPads. It also comes with a **Simulator** -- a fake iPhone that runs on your computer screen. This is how we'll test our app without needing a real phone plugged in.

Xcode is big (about 25 GB), so this step takes the longest. It's a good idea to start this download and then take a break while it finishes.

### How to install it

1. Open the **App Store** on your Mac (you can find it in the dock at the bottom of your screen, or search for "App Store" using Spotlight by pressing `Cmd + Space`).
2. Search for **Xcode**.
3. Click **Get**, then **Install**.
4. Wait for the download and installation to finish. This can take a while depending on your internet speed.
5. Once it's installed, **open Xcode once**. It will ask you to agree to a license and install some additional components. Say yes to everything and let it finish.

### Install the Command Line Tools

Xcode comes with something called **Command Line Tools**. These are small programs that run in the Terminal (we'll explain what Terminal is in a moment) and are needed to build apps.

They usually install automatically when you first open Xcode, but let's make sure. Open the **Terminal** app (search for "Terminal" using Spotlight: `Cmd + Space`, then type "Terminal") and type this command, then press Enter:

```bash
xcode-select --install
```

If it says "already installed" -- great, you're good! If a window pops up asking you to install, click **Install** and wait for it to finish.

### What is Terminal?

You just used it! Terminal is a program where you type commands to tell your computer what to do. Instead of clicking buttons, you type instructions. It might feel unfamiliar at first, but you'll get used to it quickly. Developers use Terminal all the time.

Throughout this guide, when you see a grey box with text like this:

```bash
some command here
```

That means: open Terminal, type (or copy-paste) that text, and press Enter.

---

## Step 2: Install Homebrew

### What is Homebrew?

When you want to install a regular app (like Spotify or Chrome), you go to the App Store or a website. But many developer tools aren't in the App Store. **Homebrew** is like an App Store for developer tools -- it lets you install programs by typing a simple command in Terminal.

We need Homebrew to install Node.js (which we'll do in the next step).

### How to install it

Open Terminal and paste this command, then press Enter:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

It will ask for your Mac's password (the one you use to log in). When you type your password, **you won't see any characters appear on screen** -- that's normal and a security feature. Just type it and press Enter.

The installation will take a few minutes. When it's done, it might show you a message saying you need to run a couple of extra commands to add Homebrew to your "path". If it does, **copy and paste those commands exactly as shown and run them**. They usually look something like this (but use whatever YOUR Terminal shows you):

```bash
echo >> ~/.zprofile
echo 'eval "$(/opt/homebrew/bin/brew shellcheck)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellcheck)"
```

To verify Homebrew is installed, type:

```bash
brew --version
```

You should see a version number. If you do, Homebrew is ready!

---

## Step 3: Install Node.js

### What is Node.js?

Our mobile app is built using a technology called **React Native**, and the code is written in a language called **TypeScript**. Node.js is the engine that runs all the tools we need to build and test our app. Think of it like the electricity that powers the whole workshop -- you don't interact with it directly, but nothing works without it.

Node.js also comes with a tool called **npm** (Node Package Manager). npm lets you download and install **packages** -- small building blocks of code that other developers have created and shared. Our app uses many of these packages (for example, one package handles audio recording, another handles navigation between screens).

### How to install it

In Terminal, type:

```bash
brew install node
```

Wait for it to finish, then verify it worked:

```bash
node --version
```

You should see a version number (like `v22.x.x` or similar). Then check npm:

```bash
npm --version
```

You should see another version number. If both commands show version numbers, you're all set!

---

## Step 4: Set Up Git and GitHub

### What is Git?

When you write an essay, you might save different versions: "essay_draft1.doc", "essay_draft2.doc", "essay_final.doc". Git does the same thing for code, but much smarter. It keeps track of every change you make, lets you go back to any previous version, and helps multiple people work on the same project without overwriting each other's work.

Every change you save in Git is called a **commit** -- think of it like a checkpoint in a video game. You can always go back to any checkpoint.

### What is GitHub?

**GitHub** is a website where you store your Git projects online. It's like Google Drive, but specifically designed for code. Our FieldNotes project lives on GitHub, and you'll download it from there.

### Install Git

Git usually comes pre-installed with the Xcode Command Line Tools you installed in Step 1. Let's check:

```bash
git --version
```

If you see a version number, Git is already installed. If not, install it with Homebrew:

```bash
brew install git
```

### Create a GitHub account

If you don't already have a GitHub account:

1. Go to [github.com](https://github.com) in your web browser.
2. Click **Sign up**.
3. Follow the steps to create a free account.
4. Remember your username and password!

### Tell Git who you are

Git needs to know your name and email so it can label your changes. In Terminal, run these two commands (replace the name and email with **your own**):

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Use the same email you used for your GitHub account.

---

## Step 5: Clone the FieldNotes Project

### What does "clone" mean?

Cloning means downloading a copy of the project from GitHub to your computer. It's not just downloading the files -- it also downloads the entire history of changes, so Git can track everything.

### How to clone it

First, let's decide where to put the project on your computer. We'll create a folder called `projects` in your home directory. In Terminal:

```bash
mkdir -p ~/projects
cd ~/projects
```

What did we just do?
- `mkdir -p ~/projects` creates a folder called "projects" in your home directory (the `~` symbol means "home directory").
- `cd ~/projects` moves you into that folder (`cd` stands for "change directory").

Now, clone the project:

```bash
git clone https://github.com/barysiuk/fieldnotes.git
```

You might be asked to enter your GitHub username and password, or to sign in through a browser window. Follow the prompts.

When it finishes, you should see a new folder called `fieldnotes`. Let's go inside it:

```bash
cd fieldnotes
```

You can check what's inside by typing:

```bash
ls
```

You should see folders like `mobile`, `server`, and `docs`. That's our project!

---

## Step 6: Install the App's Dependencies

### What are dependencies?

Remember how we mentioned packages -- small building blocks of code made by other developers? Our app needs quite a few of them: one for recording audio, one for storing data on the phone, one for navigation, and many others. These are called **dependencies** because our app *depends* on them to work.

All the dependencies our app needs are listed in a file called `package.json` inside the `mobile` folder. We just need to tell npm to download and install all of them.

### How to install them

First, move into the mobile app folder:

```bash
cd mobile
```

Then install all the dependencies:

```bash
npm install
```

This will download everything the app needs. You'll see a lot of text scrolling by -- that's normal. It might take a couple of minutes. When it finishes, you'll see a new folder called `node_modules` -- that's where all the downloaded packages live.

---

## Step 7: Create the Environment File

### What is an environment file?

Our mobile app needs to talk to a server called **Supabase** -- that's where user accounts and data are stored. But the app needs to know *where* that server is and have a special key to access it, kind of like knowing the address of a building and having the key to the front door.

This information is stored in a small file called `.env` (short for "environment"). The dot at the beginning of the name means it's a **hidden file** -- your computer won't show it in Finder by default, but Terminal can see it just fine.

We don't store this file in GitHub because it contains configuration that can be different for each person or project. Instead, we create it locally on your computer.

### How to create it

Make sure you're in the `mobile` folder, then create the file. You can do this all in one go:

```bash
cd ~/projects/fieldnotes/mobile
cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=supabase_project_key
EOF
```

That's it! You can verify the file was created by running:

```bash
cat .env
```

You should see the two lines with the URL and the key. If you do, the app will know how to connect to our server.

---

## Step 8: Set Up iOS (CocoaPods)

### What is CocoaPods?

Our app runs on iPhones, and iPhones use Apple's own system for managing code libraries. **CocoaPods** is a tool that downloads and sets up these Apple-specific libraries. Think of it like npm, but specifically for the iPhone/iPad side of things.

### Install CocoaPods and set up iOS

You don't need to install CocoaPods separately -- it comes bundled with the tools we already have. We just need to run a command to set up the iOS libraries.

From the `mobile` folder, run:

```bash
cd ios
pod install
cd ..
```

What did we just do?
- `cd ios` moved us into the iOS-specific folder.
- `pod install` downloaded and set up all the Apple-specific libraries our app needs.
- `cd ..` moved us back up to the `mobile` folder (the `..` means "go up one folder").

If `pod install` gives you an error, try this first:

```bash
sudo gem install cocoapods
```

It will ask for your Mac password. Then try `pod install` again.

---

## Step 9: Launch the App!

This is the exciting part -- let's see the app running on the iPhone Simulator!

Make sure you're in the `mobile` folder (if you're not sure, you can always run `cd ~/projects/fieldnotes/mobile`). Then run:

```bash
npx expo run:ios
```

### What happens next?

1. The app will **build** -- this means it's compiling all the code into a real iPhone app. The first time you do this, it takes several minutes. Be patient!
2. The **iPhone Simulator** will open automatically -- you'll see a virtual iPhone appear on your screen.
3. The FieldNotes app will install and launch inside the Simulator.

If everything worked, you should see the FieldNotes app running in the Simulator. You can tap around, interact with it, and explore!

### Troubleshooting

If you see errors, here are some common fixes:

- **"Command not found" errors**: Make sure you completed all the previous steps and that Terminal was restarted after installing Homebrew and Node.
- **Build errors about pods**: Go back to Step 7 and run `pod install` again.
- **Simulator doesn't open**: Make sure Xcode is installed and you opened it at least once (Step 1).
- **It's taking forever**: The first build is always the slowest. Subsequent builds will be much faster.

If you're stuck, take a screenshot of the error and share it -- someone will help you figure it out!

---

## Quick Reference

Once everything is installed, here's what you need to do each time you want to work on the app:

```bash
# Go to the project folder
cd ~/projects/fieldnotes/mobile

# Start the app in the iPhone Simulator
npx expo run:ios
```

That's it! The first two commands navigate to the right folder, and the third one launches the app.

---

## What You Installed (Summary)

Here's a quick recap of everything and why:

| Tool | What it does | Why we need it |
|------|-------------|----------------|
| **Xcode** | Apple's app-building program | Builds the iPhone app and provides the Simulator |
| **Homebrew** | Installs developer tools easily | Helps us install Node.js and other tools |
| **Node.js & npm** | Runs JavaScript tools and manages packages | Powers the build system and installs code libraries |
| **Git** | Tracks changes to code | Lets us download the project and save our work |
| **GitHub** | Stores code projects online | Where the FieldNotes project lives |
| **CocoaPods** | Manages Apple-specific code libraries | Sets up iPhone-specific parts of the app |

---

## You Did It!

If you made it through all the steps and see the FieldNotes app running in the Simulator -- congratulations! You just set up a real development environment, the same kind that professional software engineers use every day. That's a big deal.

Now you're ready to start building. See you in the next session!
