import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShoppingBag, Shield, Clock, Award, Sparkles, 
  Coins, Box, UserCheck, CheckCircle2, AlertCircle 
} from 'lucide-react';
import ChestUnboxingModal from './ChestUnboxingModal';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export default function RewardsShop() {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Unboxing Modal state
  const [isUnboxingOpen, setIsUnboxingOpen] = useState(false);
  const [unboxedReward, setUnboxedReward] = useState(null);

  // Countdown timer for 2x XP booster
  const [boosterSecondsLeft, setBoosterSecondsLeft] = useState(0);

  const fetchInventory = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/api/gamification/inventory');
      setInventory(res.data.data);
      
      // Calculate booster time remaining
      if (res.data.data.activeXpBoosterUntil) {
        const diffMs = new Date(res.data.data.activeXpBoosterUntil) - new Date();
        setBoosterSecondsLeft(Math.max(0, Math.floor(diffMs / 1000)));
      } else {
        setBoosterSecondsLeft(0);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (boosterSecondsLeft <= 0) return;
    const int = setInterval(() => {
      setBoosterSecondsLeft((sec) => Math.max(0, sec - 1));
    }, 1000);
    return () => clearInterval(int);
  }, [boosterSecondsLeft]);

  const handleBuyItem = async (itemId) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post('/api/gamification/shop/buy', { itemId });
      setSuccessMsg(`Successfully purchased ${itemId.replace('_', ' ')}!`);
      fetchInventory();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to buy item');
    }
  };

  const handleEquipFrame = async (cosmeticId) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.post('/api/gamification/avatar/equip', { cosmeticId });
      setSuccessMsg(cosmeticId ? `Equipped ${cosmeticId.replace('_', ' ')} frame` : 'Unequipped avatar frame');
      fetchInventory();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to equip cosmetic');
    }
  };

  const handleOpenChest = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post('/api/gamification/chest/open');
      setUnboxedReward(res.data);
      setIsUnboxingOpen(true);
      fetchInventory();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to open chest');
    }
  };

  const formatBoosterTime = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  if (!inventory) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-450 italic">
        <Coins className="w-10 h-10 animate-pulse text-yellow-500 mb-3" />
        <span>Loading prep items...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 p-4 md:p-6 text-slate-100 text-left">
      
      {/* Header Row: Balance / Coins */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-2xl">
            <Coins className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-500">
              PrepCoins Rewards Shop
            </h1>
            <p className="text-xs text-slate-450 mt-0.5">
              Spend PrepCoins earned from quizzes, flashcards, and goals to purchase consistency boosters and cosmetics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-6 py-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Your Balance:</span>
          <span className="text-xl font-extrabold text-yellow-400 flex items-center gap-1.5 font-mono">
            {inventory.prepCoins} <Coins className="w-5 h-5 fill-current" />
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Booster / Consistency Shop */}
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-sm font-black text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingBag className="w-4.5 h-4.5 text-indigo-400" />
            Consistency Boosters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Streak Freeze Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between h-[230px] shadow-lg hover:border-slate-700 transition-all">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-100 text-sm">Streak Freeze</h4>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Holds your daily streak active for 24h if you miss studying. Auto-consumes on inactive days.
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-850 pt-3 mt-4">
                <span className="text-xs font-bold text-slate-400">Inventory: {inventory.streakFreezes}</span>
                <button
                  onClick={() => handleBuyItem('streak_freeze')}
                  disabled={inventory.prepCoins < 150}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Buy for 150
                </button>
              </div>
            </div>

            {/* 2X XP Booster Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between h-[230px] shadow-lg hover:border-slate-700 transition-all">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-100 text-sm">2x XP Booster</h4>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Doubles all study, quiz, and flashcard XP earned for 1 hour.
                </p>
                {boosterSecondsLeft > 0 && (
                  <span className="inline-block text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-extrabold">
                    Active: {formatBoosterTime(boosterSecondsLeft)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-850 pt-3 mt-4">
                <span className="text-[10px] text-purple-400 font-extrabold uppercase animate-pulse">2x active</span>
                <button
                  onClick={() => handleBuyItem('xp_booster')}
                  disabled={inventory.prepCoins < 250}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-550 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Buy for 250
                </button>
              </div>
            </div>
          </div>

          {/* Unboxing Chest section */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-2xl animate-bounce">
                <Box className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-100 text-sm">Mystery Reward Chest</h4>
                <p className="text-xs text-slate-450 max-w-sm mt-0.5 leading-relaxed">
                  Open a mystery loot chest to win randomized XP rewards (50-250 XP) or unlock ultra-rare cosmetics!
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenChest}
              disabled={inventory.prepCoins < 100}
              className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
            >
              Open Chest (100 Coins)
            </button>
          </div>
        </div>

        {/* Right Column: Custom Avatar Cosmetics Frames */}
        <div className="md:col-span-1 space-y-6">
          <h3 className="text-sm font-black text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4.5 h-4.5 text-yellow-500" />
            Avatar Frame Cosmetics
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            
            {[
              { id: 'golden_sparkle_frame', label: 'Golden Sparkle Frame', price: 500, style: 'border-yellow-400 shadow-yellow-500/10' },
              { id: 'neon_blue_frame', label: 'Neon Blue Flame Frame', price: 500, style: 'border-blue-400 shadow-blue-500/10' },
            ].map((item) => {
              const isOwned = inventory.ownedCosmetics?.includes(item.id);
              const isEquipped = inventory.equippedAvatarFrame === item.id;

              return (
                <div key={item.id} className="border border-slate-800 p-4 rounded-2xl bg-slate-950 flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Frame Preview demo */}
                    <div className={`w-12 h-12 rounded-full border-4 ${item.style} bg-slate-800 flex items-center justify-center font-extrabold text-[10px] text-slate-300 relative shadow-lg`}>
                      User
                      {isEquipped && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-slate-950 flex items-center justify-center text-[8px] text-white font-black">✓</span>}
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-100">{item.label}</h5>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {isOwned ? 'Cosmetic owned' : `Price: ${item.price} PrepCoins`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-slate-850 pt-2.5">
                    {isOwned ? (
                      isEquipped ? (
                        <button
                          onClick={() => handleEquipFrame(null)}
                          className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 font-bold text-[10px] rounded-lg transition cursor-pointer"
                        >
                          Unequip Frame
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEquipFrame(item.id)}
                          className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-[10px] rounded-lg transition cursor-pointer"
                        >
                          Equip Frame
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleBuyItem(item.id)}
                        disabled={inventory.prepCoins < item.price}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-yellow-400 font-bold text-[10px] rounded-lg transition cursor-pointer"
                      >
                        Buy Frame
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unboxing animation overlay modal */}
      {isUnboxingOpen && unboxedReward && (
        <ChestUnboxingModal
          reward={unboxedReward}
          onClose={() => setIsUnboxingOpen(false)}
        />
      )}
    </div>
  );
}
