/**
 * @fileoverview Main dashboard for viewing Study Coin balance, active rewards, and the redemption store.
 */
import React, { useState, useEffect } from 'react';
import RewardStore from '../components/Gamification/RewardStore';
import axios from 'axios';

const GamificationHub = () => {
    const [storeData, setStoreData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActivatingFreeze, setIsActivatingFreeze] = useState(false);

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchStoreData();
    }, []);

    const fetchStoreData = async () => {
        try {
            const response = await axios.get(`${API_URL}/rewards/store`);
            if (response.data.success) {
                setStoreData(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch store data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async (itemId) => {
        try {
            const response = await axios.post(`${API_URL}/rewards/purchase`, { itemId });
            if (response.data.success) {
                // Update local state with new balance and inventory
                setStoreData(prev => ({
                    ...prev,
                    user: {
                        ...prev.user,
                        coinBalance: response.data.data.newBalance,
                        inventory: response.data.data.inventory
                    }
                }));
            }
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Purchase failed');
        }
    };

    const handleActivateFreeze = async () => {
        setIsActivatingFreeze(true);
        try {
            const response = await axios.post(`${API_URL}/rewards/activate-streak-freeze`);
            if (response.data.success) {
                setStoreData(prev => ({
                    ...prev,
                    user: {
                        ...prev.user,
                        inventory: {
                            ...prev.user.inventory,
                            streakFreezes: response.data.data.streakFreezesRemaining
                        },
                        activeStreakFreeze: response.data.data.activeStreakFreeze
                    }
                }));
                alert(response.data.message);
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to activate freeze.');
        } finally {
            setIsActivatingFreeze(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
        );
    }

    const { catalog, user } = storeData;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reward Redemption Store</h1>
                    <p className="text-gray-600 dark:text-gray-400">Spend your hard-earned Study Coins on practical rewards and cosmetic upgrades.</p>
                </div>

                {/* User Stats Banner */}
                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl p-6 mb-10 text-white shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-yellow-100" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                            </div>
                            <div>
                                <p className="text-yellow-100 text-sm font-medium uppercase tracking-wider">Current Balance</p>
                                <p className="text-4xl font-extrabold">{user.coinBalance} <span className="text-xl font-normal">Study Coins</span></p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold">{user.inventory.streakFreezes}</p>
                                <p className="text-xs text-yellow-100">Streak Freezes</p>
                            </div>
                            <div className="w-px h-10 bg-white/20"></div>
                            <div className="text-center">
                                <p className="text-2xl font-bold">{user.inventory.aiBoosts}</p>
                                <p className="text-xs text-yellow-100">AI Boosts</p>
                            </div>
                            <div className="w-px h-10 bg-white/20"></div>
                            <div>
                                {user.activeStreakFreeze ? (
                                    <span className="inline-block px-3 py-1 bg-green-400 text-green-900 text-xs font-bold rounded-full">Freeze Active 🧊</span>
                                ) : (
                                    <button
                                        onClick={handleActivateFreeze}
                                        disabled={user.inventory.streakFreezes === 0 || isActivatingFreeze}
                                        className="px-4 py-2 bg-white text-orange-600 text-sm font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isActivatingFreeze ? 'Activating...' : 'Activate Freeze'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Store Grid */}
                <RewardStore
                    catalog={catalog}
                    userBalance={user.coinBalance}
                    onPurchase={handlePurchase}
                />
            </div>
        </div>
    );
};

export default GamificationHub;
