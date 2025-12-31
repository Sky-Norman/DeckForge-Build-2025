import React from 'react';
import { GameCard } from '../types';
import { Card } from './Card';

interface HandProps {
  cards: GameCard[];
  onPlayCard: (id: string) => void;
  onInkCard: (id: string) => void;
}

export const Hand: React.FC<HandProps> = ({ cards, onPlayCard, onInkCard }) => {
  return (
    <div className="relative flex items-end justify-center h-full w-full px-4 perspective-1000">
      <div className="flex -space-x-12 hover:-space-x-4 transition-all duration-300 pb-4">
        {cards.map((card, index) => (
          <div 
            key={card.instanceId} 
            className="group relative transition-all duration-300 hover:-translate-y-8 hover:z-20"
            style={{ zIndex: index }}
          >
            <Card card={card} />
            
            {/* Action Buttons on Hover */}
            <div className="absolute -top-10 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => onPlayCard(card.instanceId)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2 py-1 rounded shadow-lg font-bold"
                >
                    PLAY
                </button>
                {card.Inkable && (
                    <button 
                        onClick={() => onInkCard(card.instanceId)}
                        className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-2 py-1 rounded shadow-lg font-bold"
                    >
                        INK
                    </button>
                )}
            </div>
          </div>
        ))}
      </div>
       {cards.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full w-full text-slate-600">
                <span className="text-sm font-cinzel">No Cards in Hand</span>
            </div>
        )}
    </div>
  );
};