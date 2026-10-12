import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './firebase';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const firebaseApp = app;
export const firebaseStorage = getStorage(app);
