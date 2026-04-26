# Majestique Euriska Dashboard

Residential / housing society operations dashboard built with React and Firebase.

## Included modules

- Member Management
- Maintenance / Dues Tracking
- Events & Announcements
- Complaints & Requests
- Financial Overview
- Visitor / Gate Log
- Housekeeping Staff Tracker

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your Firebase web app credentials.

3. Start the app:

   ```bash
   npm run dev
   ```

If Firebase credentials are not configured, the dashboard automatically renders with mock society data so the UI stays previewable.

## GitHub push prep

This workspace is ready to be pushed once Git is initialized and a remote repository is attached.

1. Initialize Git:

   ```bash
   git init -b main
   ```

2. Add the files:

   ```bash
   git add .
   ```

3. Create the first commit:

   ```bash
   git commit -m "Initial dashboard setup"
   ```

4. Connect your GitHub repository:

   ```bash
   git remote add origin <your-github-repo-url>
   ```

5. Push the `main` branch:

   ```bash
   git push -u origin main
   ```

Make sure your Git identity is configured first:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## Firebase setup

1. Create a Firebase project in the Firebase console.
2. Add a Web App to that project.
3. Enable Firestore Database.
4. Enable Anonymous Authentication in `Authentication > Sign-in method`.
5. Copy `.env.example` to `.env` and paste the Firebase web config values.
6. Review [firestore.rules](/Users/sweta/Amit_Development/Majestique_Euriska_Dashboard/firestore.rules:1) before deployment.
7. Enable Firebase Hosting in the same project.

The current Firestore rules require authenticated users. The dashboard now attempts Firebase Anonymous Auth automatically, so once Anonymous Authentication is enabled in Firebase, the app can read and write Firestore without exposing open public rules.

If you use the Firebase CLI, you can deploy the Firestore config with:

```bash
npx firebase-tools login
npx firebase-tools use <your-firebase-project-id>
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

To deploy the React app to Firebase Hosting:

```bash
npx firebase-tools use <your-firebase-project-id>
npm run deploy:hosting
```

To deploy Hosting plus Firestore rules/indexes together:

```bash
npx firebase-tools use <your-firebase-project-id>
npm run deploy:firebase
```

## Suggested Firestore collections

- `members`
- `dues`
- `announcements`
- `events`
- `complaints`
- `finance`
- `visitors`
- `staff`
- `housekeepingAttendanceRegisters`

## Housekeeping manager entry

The housekeeping tracker includes a monthly attendance register where the manager can:

- Pick any month
- Enter daily values in a register-style table by date
- Fill `A`, `B`, `C`, `Supervisor`, `Common`, and `Tractor Trip`
- See row totals and monthly totals calculated automatically
- Save monthly register entries to Firebase or local browser storage when Firebase is not configured

## Current live-write scope

The housekeeping monthly register already writes to Firestore when Firebase is configured.

Collection used:

- `housekeepingAttendanceRegisters`

Document pattern:

- `register_YYYY-MM`
