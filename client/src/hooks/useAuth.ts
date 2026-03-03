import { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, signOut } from '../lib/firebase';
import { User } from '../types';
import axios from 'axios';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const token = await firebaseUser.getIdToken();
                    const response = await axios.get('/api/auth/profile', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    setUser({
                        ...response.data,
                        emailVerified: firebaseUser.emailVerified,
                    });
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await signOut(auth);
        setUser(null);
    };

    const refreshUser = async () => {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            try {
                const token = await firebaseUser.getIdToken(true); // Force refresh token
                const response = await axios.get('/api/auth/profile', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setUser({
                    ...response.data,
                    emailVerified: firebaseUser.emailVerified,
                });
            } catch (error) {
                console.error('Error refreshing user profile:', error);
            }
        }
    };

    return { user, loading, logout, refreshUser };
};
