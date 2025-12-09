
import React from 'react';

interface RewardStoreProps {
  tokens: number;
  onRedeem: (cost: number) => void;
  onExit: () => void;
}

const REWARDS = [
    { id: 1, name: "Extra TV Time", emoji: "📺", cost: 2 },
    { id: 2, name: "Tablet Time", emoji: "📱", cost: 5 },
    { id: 3, name: "Special Snack", emoji: "🍪", cost: 8 },
    { id: 4, name: "New Toy", emoji: "🧸", cost: 15 },
];

export const RewardStore: React.FC<RewardStoreProps> = ({ tokens, onRedeem, onExit }) => {
  return (
    <div className="h-full bg-purple-50 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10 shrink-0">
            <button onClick={onExit}><i className="fa-solid fa-arrow-left text-xl"></i></button>
            <h1 className="text-xl font-bold text-purple-700">Reward Store</h1>
            <div className="bg-yellow-100 px-3 py-1 rounded-full flex items-center gap-1">
                <i className="fa-solid fa-star text-yellow-500"></i>
                <span className="font-bold text-yellow-700">{tokens}</span>
            </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 pb-6">
                {REWARDS.map(reward => {
                    const canAfford = tokens >= reward.cost;
                    return (
                        <button 
                            key={reward.id}
                            disabled={!canAfford}
                            onClick={() => {
                                if(confirm(`Buy ${reward.name} for ${reward.cost} tokens?`)) {
                                    onRedeem(reward.cost);
                                }
                            }}
                            className={`bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 border-b-4 transition-all
                                ${canAfford ? 'border-purple-200 active:border-purple-100 active:translate-y-1' : 'border-gray-200 opacity-50 grayscale cursor-not-allowed'}
                            `}
                        >
                            <span className="text-5xl mb-2">{reward.emoji}</span>
                            <span className="font-bold text-gray-800 text-sm">{reward.name}</span>
                            <div className="bg-yellow-100 px-3 py-1 rounded-full text-yellow-700 font-bold text-xs">
                                {reward.cost} Tokens
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
  );
};
