/**
 * Firebase client config (Storage only for now).
 *
 * 1. Copy this file to: src/config/firebase.ts
 * 2. Fill in values from Firebase Console → Project settings → Your apps → Web app
 * 3. firebase.ts is gitignored — keep real values only there.
 *
 * Rules: firebase/storage.rules
 * Migration notes: firebase/MIGRATION_NOTES.md
 *
 * Final object path: Koshal/cookstovecare/{type}/{id}.{ext}
 */

export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

export const firebaseStoragePath = {
  receivedProduct: 'Koshal/cookstovecare/received_product',
  distribution: 'Koshal/cookstovecare/distribution',
  afterRepair: 'Koshal/cookstovecare/after_repair',
  oldCookstove: 'Koshal/cookstovecare/old_cookstove',
  newCookstove: 'Koshal/cookstovecare/new_cookstove',
  signature: 'Koshal/cookstovecare/signature',
  profile: 'Koshal/cookstovecare/profile',
};
