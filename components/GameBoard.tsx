import React, { useEffect, useState } from 'react';
import { CardData, GamePhase, PlayerState } from '../types';
import { getStarterDeck, fetchFullLibrary } from '../services/cardService';
import { addToInkwell, createDeck, drawCard, playCard, readyPhase, shuffleDeck } from '../utils/gameEngine';
import { Hand } from './Hand';
import { Inkwell } from './Inkwell';
import { Card } from './Card';
import { Sword, RefreshCw, AlertCircle } from 'lucide-react';

const INITIAL_HAND_SIZE = 7;

export const GameBoard: React.FC = () => {
  const [playerState, setPlayerState] = useState<PlayerState>({
    deck: [],
    hand: [],
    inkwell: [],
    field: [],
    discard: [],
    lore: 0,
    inkCommitted: false,
  });
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.READY);

  // Initialize Game with Starter Deck immediately
  useEffect(() => {
    // 1. Load Starter Deck (Synchronous, instant)
    const starterCards = getStarterDeck();
    const deck = shuffleDeck(createDeck(starterCards));
    
    let initialPlayerState: PlayerState = {
      deck,
      hand: [],
      inkwell: [],
      field: [],
      discard: [],
      lore: 0,
      inkCommitted: false
    };
    
    initialPlayerState = drawCard(initialPlayerState, INITIAL_HAND_SIZE);
    setPlayerState(initialPlayerState);

    // 2. Optional: Fetch full library in background for future use
    fetchFullLibrary().then(() => console.log("Full library cached in background"));
  }, []);

  const handlePlayCard = (id: string) => {
    setPlayerState(prev => playCard(prev, id));
  };

  const handleInkCard = (id: string) => {
    setPlayerState(prev => addToInkwell(prev, id));
  };

  const handleEndTurn = () => {
    setTurn(t => t + 1);
    const readyState = readyPhase(playerState);
    const drawState = drawCard(readyState, 1);
    setPlayerState(drawState);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden relative">
      
      {/* --- Top Bar: Game Stats / Opponent (Mock) --- */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-md z-30">
        <div className="text-slate-400 font-cinzel text-lg flex items-center gap-2">
            <span className="text-amber-600 font-bold">DeckForge</span> Simulator
            <span className="ml-2 text-[10px] bg-amber-900/30 text-amber-500 border border-amber-900/50 px-2 py-0.5 rounded font-sans font-bold tracking-wider">
              ALPHA v0.1.0
            </span>
        </div>
        
        <div className="flex gap-8">
             <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500 uppercase">Opponent Lore</span>
                <span className="text-xl font-bold text-red-500 font-cinzel">0 / 20</span>
            </div>
            <div className="flex flex-col items-center">
                 <span className="text-xs text-slate-500 uppercase">Turn</span>
                 <span className="text-xl font-bold text-slate-200 font-cinzel">{turn}</span>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500 uppercase">Your Lore</span>
                <span className="text-xl font-bold text-emerald-500 font-cinzel">{playerState.lore} / 20</span>
            </div>
        </div>

        <button 
            onClick={handleEndTurn}
            className="bg-amber-700 hover:bg-amber-600 text-amber-50 px-4 py-2 rounded-lg font-cinzel font-bold flex items-center gap-2 transition-colors border border-amber-500/30"
        >
            <RefreshCw size={18} /> End Turn
        </button>
      </div>

      {/* --- Main Battlefield --- */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-8">
        {/* Background Decorative Element */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Sword size={400} />
        </div>

        {/* Player Field Area */}
        <div className="w-full h-full border-2 border-slate-800/50 rounded-2xl p-4 flex flex-wrap content-start gap-4 overflow-y-auto">
            {playerState.field.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-slate-700 font-cinzel text-2xl tracking-widest uppercase opacity-30">
                    Battlefield Empty
                </div>
            )}
            {playerState.field.map(card => (
                <Card 
                    key={card.instanceId} 
                    card={card} 
                    onClick={() => {
                        setPlayerState(prev => ({
                            ...prev,
                            field: prev.field.map(c => c.instanceId === card.instanceId ? { ...c, isExerted: !c.isExerted } : c)
                        }));
                    }}
                />
            ))}
        </div>
      </div>

      {/* --- Player Zone (Bottom) --- */}
      <div className="h-[35vh] bg-slate-900 border-t-4 border-slate-800 flex relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        
        {/* Left: Inkwell */}
        <div className="w-1/6 min-w-[150px] p-4 border-r border-slate-800 bg-slate-900/50">
            <Inkwell cards={playerState.inkwell} />
        </div>

        {/* Center: Hand */}
        <div className="flex-1 p-2 pb-0 overflow-visible flex items-end">
            <Hand 
                cards={playerState.hand} 
                onPlayCard={handlePlayCard}
                onInkCard={handleInkCard}
            />
        </div>

        {/* Right: Deck & Discard */}
        <div className="w-1/6 min-w-[150px] p-4 border-l border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center gap-4">
             {/* Deck */}
            <div className="relative w-20 h-28 bg-slate-700 rounded border border-slate-600 shadow-xl group cursor-pointer">
                 {/* Stack Effect */}
                 <div className="absolute -top-1 -right-1 w-full h-full bg-slate-700 rounded border border-slate-600 z-0"></div>
                 <div className="absolute -top-2 -right-2 w-full h-full bg-slate-700 rounded border border-slate-600 z-0"></div>
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 z-10"></div>
                 <div className="absolute inset-0 flex items-center justify-center z-20">
                    <span className="font-bold text-slate-400 text-lg">{playerState.deck.length}</span>
                 </div>
                 <div className="absolute -bottom-6 w-full text-center text-xs text-slate-500 font-cinzel">DECK</div>
            </div>

            {/* Discard */}
            <div className="w-20 h-28 border-2 border-dashed border-slate-700 rounded flex items-center justify-center">
                 <span className="text-xs text-slate-600 font-cinzel">DISCARD</span>
            </div>
        </div>

      </div>
    </div>
  );
};