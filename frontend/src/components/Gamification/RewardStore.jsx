/**
 * @fileoverview Interactive store grid for browsing and purchasing virtual rewards.
 */
import React, { useState } from 'react';

const RewardStore = ({ catalog, userBalance, onPurchase }) => {
    const [purchasingId, setPurchasingId] = useState(null);
    const [notification, setNotification] = useState(null);

    const handleBuy = async (item) => {
        if (userBalance < item.price) {
            setNotification({ type: 'error', message: 'Insufficient Study Coins!' });
            setTimeout(() => setNotification(null), 3000);
            return;
        }

        setPurchasingId(item.id);
        try {
            await onPurchase(item.id);
            setNotification({ type: 'success', message: `Successfully purchased ${item.name}!` });
            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            setNotification({ type: 'error', message: 'Purchase failed. Please try again.' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setPurchasingId(null);
        }
    };

    return (
        <div className="relative">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-fade-in ${notification.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/80 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-900/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                    }`}>
                    <span className="text-xl">{notification.type === 'success' ? '🎉' : '⚠️'}</span>
                    <span className="font-medium">{notification.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalog.map((item) => {
                    const canAfford = userBalance >= item.price;
                    const isPurchasing = purchasingId === item.id;

                    return (
                        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <span className="text-4xl">{item.icon}</span>
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-full uppercase tracking-wide">
                                    {item.category}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex-1 mb-6">{item.description}</p>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                                <span className={`text-lg font-bold flex items-center gap-1 ${canAfford ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                                    {item.price}
                                </span>

                                <button
                                    onClick={() => handleBuy(item)}
                                    disabled={!canAfford || isPurchasing}
                                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${canAfford
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    {isPurchasing ? (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : 'Purchase'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RewardStore;
