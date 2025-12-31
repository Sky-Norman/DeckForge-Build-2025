import React, { useState } from 'react';
import { GameCard } from '../types';
import { Shield, Diamond, Scroll, Sparkles } from 'lucide-react';

interface CardProps {
  card: GameCard;
  onClick?: () => void;
  className?: string;
  inInkwell?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, onClick, className = '', inInkwell = false }) => {
  const [imageError, setImageError] = useState(false);
  const isExerted = card.isExerted;

  // --- Render: Inkwell / Face Down ---
  if (card.isFaceDown || inInkwell) {
    return (
      <div 
        onClick={onClick}
        className={`relative group w-24 h-36 rounded-lg border-2 border-slate-700 bg-slate-800 cursor-pointer shadow-lg transition-all duration-300 ${isExerted ? 'rotate-90' : ''} ${className}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-24 rounded border border-slate-600 bg-slate-900 opacity-50 flex items-center justify-center flex-col gap-1">
                <Sparkles size={16} className="text-amber-600/50" />
                <span className="text-slate-500 font-cinzel text-[10px] tracking-widest">INK</span>
            </div>
        </div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-30"></div>
        {/* Hover Info for Ink */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700">
            {card.Name}
        </div>
      </div>
    );
  }

  // --- Render: Card Front ---
  return (
    <div 
      onClick={onClick}
      className={`
        relative w-40 h-56 rounded-xl cursor-pointer transition-all duration-300 transform 
        ${isExerted ? 'rotate-6 translate-y-2 grayscale-[0.2]' : 'hover:-translate-y-4 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]'}
        shadow-xl overflow-hidden select-none bg-slate-900 border border-slate-800
        ${className}
      `}
    >
        {/* --- 1. Image Layer (Attempt) --- */}
        {!imageError && (
            <img 
                src={card.Image} 
                alt={card.Name}
                className="absolute inset-0 w-full h-full object-cover z-0"
                onError={() => setImageError(true)}
                loading="lazy"
            />
        )}

        {/* --- 2. CSS Fallback Layer (High Fidelity) --- */}
        {/* We render this if imageError is true, OR as an overlay if needed. 
            Here we replace the image entirely to look like a styled digital card. */}
        {imageError && (
            <div className={`absolute inset-0 flex flex-col z-10 p-2 ${getInkColorBg(card.Inkable)}`}>
                
                {/* Header: Cost & Name */}
                <div className="flex justify-between items-start mb-1">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-500 flex items-center justify-center text-amber-400 font-bold font-cinzel text-lg shadow-lg z-20 relative">
                            {card.Cost}
                        </div>
                        {card.Inkable && (
                            <div className="absolute -inset-1 rounded-full border border-amber-500/50 animate-pulse"></div>
                        )}
                    </div>
                    <div className="flex-1 ml-2 mt-1">
                        <div className="text-[10px] leading-tight font-bold text-slate-900 bg-white/90 px-2 py-1 rounded-r-lg border-l-4 border-slate-800 shadow-sm font-cinzel truncate">
                            {card.Name}
                        </div>
                    </div>
                </div>

                {/* Art Placeholder */}
                <div className="flex-1 bg-slate-800/80 rounded border border-slate-600/50 m-1 flex items-center justify-center overflow-hidden relative group">
                     <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                     <span className="text-slate-500 text-xs font-cinzel text-center px-2 opacity-50">
                        {card.Type}<br/>
                        <span className="text-[9px] italic">{card.Class}</span>
                     </span>
                </div>

                {/* Body Text Area */}
                <div className="bg-slate-100/95 rounded p-2 min-h-[70px] flex flex-col justify-center border-2 border-slate-300 relative shadow-inner">
                    {card.Abilities && card.Abilities.length > 0 ? (
                        <div className="text-[9px] text-slate-900 font-serif leading-tight">
                            {card.Abilities.map((ability, i) => (
                                <p key={i} className="mb-1 last:mb-0">{ability}</p>
                            ))}
                        </div>
                    ) : (
                        <div className="text-[9px] text-slate-500 italic text-center font-serif">
                            "{card.Flavor_Text || 'A mysterious glimmer...'}"
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="mt-2 flex items-center justify-between px-1">
                    {/* Strength */}
                    <div className="flex flex-col items-center">
                         <div className="bg-slate-800 rounded-full w-6 h-6 flex items-center justify-center border border-slate-600">
                            <span className="text-white font-bold text-xs">{card.Strength || '-'}</span>
                         </div>
                    </div>

                    {/* Lore Pips */}
                    <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(card.Lore || 0, 5) }).map((_, i) => (
                            <Diamond key={i} size={8} className="fill-purple-600 text-purple-800" />
                        ))}
                    </div>

                    {/* Willpower */}
                    <div className="flex flex-col items-center">
                         <div className="bg-slate-800 rounded-full w-6 h-6 flex items-center justify-center border border-slate-600">
                            <span className="text-white font-bold text-xs">{card.Willpower || '-'}</span>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- 3. Gloss/Rarity Overlay (Always on top) --- */}
        <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/10"></div>
        {card.Rarity === 'Legendary' || card.Rarity === 'Enchanted' ? (
             <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-amber-500/10 via-transparent to-purple-500/10 mix-blend-overlay"></div>
        ) : null}
    </div>
  );
};

// Helper to tint card background based on inkable status (simulating ink color vaguely)
const getInkColorBg = (inkable: boolean) => {
    // In a real app we'd map 'Ink Color' (Ruby, Sapphire, etc) from the JSON.
    // Since we don't have Color in the interface yet, we use a generic mystic slate.
    return inkable ? "bg-gradient-to-b from-slate-700 to-slate-600" : "bg-gradient-to-b from-slate-800 to-slate-900";
};