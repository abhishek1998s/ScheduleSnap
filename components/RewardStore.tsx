
import React, { useState, useEffect } from 'react';
import { RewardItem, ChildProfile } from '../types';
import { generateRewards } from '../services/geminiService';
import { t } from '../utils/translations';

interface RewardStoreProps {
  tokens: number;
  profile: ChildProfile;
  onRedeem: (cost: number) => void;
  onExit: () => void;
}

export const RewardStore: React.FC<RewardStoreProps> = ({ tokens, profile, onRedeem, onExit }) => {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasedItem, setPurchasedItem] = useState<RewardItem | null>(null);
  const [confirmingReward, setConfirmingReward] = useState<RewardItem | null>(null);
  const lang = profile.language;

  useEffect(() => {
    const loadRewards = async () => {
        setIsLoading(true);
        try {
            const data = await generateRewards(profile, tokens);
            setRewards(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    loadRewards();
  }, [profile]);

  const handleBuyClick = (reward: RewardItem) => {
      setConfirmingReward(reward);
  };

  const confirmPurchase = () => {
      if (confirmingReward) {
          onRedeem(confirmingReward.cost);
          setPurchasedItem(confirmingReward);
          setConfirmingReward(null);
      }
  };

  const handleEnjoy = () => {
      setPurchasedItem(null);
      onExit();
  };

  return (
    <div className="h-full bg-purple-50 flex flex-col relative">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10 shrink-0">
            <button onClick={onExit} aria-label="Back"><i className="fa-solid fa-arrow-left text-xl"></i></button>
            <h1 className="text-xl font-bold text-purple-700">{t(lang, 'rewardStore')}</h1>
            <div className="bg-yellow-100 px-3 py-1 rounded-full flex items-center gap-1">
                <i className="fa-solid fa-star text-yellow-500"></i>
                <span className="font-bold text-yellow-700">{tokens}</span>
            </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
            {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-purple-400">
                    <i className="fa-solid fa-gift text-5xl fa-bounce mb-4"></i>
                    <p className="font-bold">{t(lang, 'findingRewards')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-6">
                    {rewards.map(reward => {
                        const canAfford = tokens >= reward.cost;
                        return (
                            <button 
                                key={reward.id}
                                disabled={!canAfford}
                                onClick={() => handleBuyClick(reward)}
                                className={`bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 border-b-4 transition-all
                                    ${canAfford ? 'border-purple-200 active:border-purple-100 active:translate-y-1 hover:scale-105' : 'border-gray-200 opacity-50 grayscale cursor-not-allowed'}
                                `}
                            >
                                <span className="text-5xl mb-2 filter drop-shadow-sm">{reward.emoji}</span>
                                <span className="font-bold text-gray-800 text-sm leading-tight">{reward.name}</span>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold mt-2 ${canAfford ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
                                    {reward.cost} {t(lang, 'tokens')}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
            
            {!isLoading && rewards.length === 0 && (
                <div className="text-center text-gray-400 mt-10">
                    <p>{t(lang, 'noRewards')}</p>
                </div>
            )}
        </div>

        {/* Confirmation Modal */}
        {confirmingReward && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-6 animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100 animate-slideUp">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">{t(lang, 'buyRewardPrompt')}</h2>
                    <div className="flex flex-col items-center mb-6">
                        <span className="text-6xl mb-2">{confirmingReward.emoji}</span>
                        <span className="font-bold text-lg">{confirmingReward.name}</span>
                        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold text-sm mt-2">
                            {confirmingReward.cost} {t(lang, 'tokens')}
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setConfirmingReward(null)}
                            className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 active:bg-gray-200"
                        >
                            {t(lang, 'no')}
                        </button>
                        <button 
                            onClick={confirmPurchase}
                            className="flex-1 py-3 rounded-xl font-bold bg-purple-600 text-white shadow-md active:bg-purple-700"
                        >
                            {t(lang, 'yes')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Purchase Success Modal */}
        {purchasedItem && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-fadeIn">
                <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm relative overflow-hidden animate-slideUp">
                    <div className="absolute inset-0 bg-yellow-100 opacity-20 animate-pulse pointer-events-none"></div>
                    <i className="fa-solid fa-gift text-6xl text-purple-500 mb-4 animate-bounce relative z-10"></i>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2 relative z-10">{t(lang, 'youBoughtIt')}</h2>
                    <div className="text-8xl my-4 relative z-10">{purchasedItem.emoji}</div>
                    <p className="text-xl font-bold text-purple-700 mb-6 relative z-10">{purchasedItem.name}</p>
                    <button 
                        onClick={handleEnjoy}
                        className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold shadow-lg text-lg relative z-10"
                    >
                        {t(lang, 'enjoy')}
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
