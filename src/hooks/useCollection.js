import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../firebase.js';

const MOCK_DELAY_MS = 320;

export function useCollection(collectionName, fallbackItems) {
  const [items, setItems] = useState(fallbackItems);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(isFirebaseConfigured ? 'firebase' : 'mock');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      const timer = window.setTimeout(() => {
        setItems(fallbackItems);
        setLoading(false);
        setSource('mock');
      }, MOCK_DELAY_MS);

      return () => window.clearTimeout(timer);
    }

    let unsubscribe = null;
    let isCancelled = false;

    async function subscribeToCollection() {
      try {
        await ensureFirebaseSession();

        if (isCancelled) {
          return;
        }

        unsubscribe = onSnapshot(
          collection(db, collectionName),
          (snapshot) => {
            setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
            setSource('firebase');
            setError('');
          },
          (snapshotError) => {
            console.error(`Unable to sync collection "${collectionName}"`, snapshotError);
            setItems(fallbackItems);
            setLoading(false);
            setSource('mock');
            setError('Live Firestore sync is unavailable, so mock society data is being shown.');
          }
        );
      } catch (sessionError) {
        console.error(`Unable to start Firebase session for "${collectionName}"`, sessionError);
        setItems(fallbackItems);
        setLoading(false);
        setSource('mock');
        setError(
          'Firebase is configured, but authentication is not ready. Enable Anonymous Auth or review the Firebase setup.'
        );
      }
    }

    subscribeToCollection();

    return () => {
      isCancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [collectionName, fallbackItems]);

  return {
    items,
    loading,
    source,
    error
  };
}
