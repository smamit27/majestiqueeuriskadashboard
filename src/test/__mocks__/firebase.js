// Mock for ../firebase – prevents real SDK initialisation during tests
import { vi } from 'vitest';

export const auth = { currentUser: null };
export const googleProvider = {};

export const signInWithEmailAndPassword = vi.fn();
export const sendPasswordResetEmail = vi.fn();
export const signOut = vi.fn();
export const signInWithPopup = vi.fn();
