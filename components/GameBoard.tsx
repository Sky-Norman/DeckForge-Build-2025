import React, { useEffect, useState } from 'react';
import { CardData, GamePhase, PlayerState, GameState, GameCard } from '../types';
import { getStarterDeck, fetchFullLibrary } from '../services/cardService';
import { addToInkwell, createDeck, drawCard, playCard, questCard, challengeCard, startTurn, shuffleDeck } from '../utils/gameEngine';
import { Hand } from './Hand';
import { Inkwell } from './Inkwell';
import { Card } from './Card';
import { Sword, RefreshCw, Sparkles, Scroll, RotateCcw, Zap, RotateCw, Trophy, Skull, Loader2 } from 'lucide-react';

const INITIAL_HAND_SIZE = 7;
const SANDBOX_STARTING_INK_COUNT = 5;
const WINNING_LORE = 20;

export const GameBoard: React.FC = () => {
  // --- APP STATE ---
  // Start as FALSE to ensure immediate rendering of the board
  const [isAppLoading, setIsAppLoading] = useState(false);

  // --- SETTINGS STATE ---
  const [jumpstartEnabled, setJumpstartEnabled] = useState(true);
  const [history, setHistory] = useState<GameState[]>([]);

  const [gameState, setGameState] = useState<GameState>({
    turn: 1,
    phase: GamePhase.READY,
    loading: false,
    selectedCardId: undefined,
    player: {
      deck: [],
      hand: [],
      inkwell: [],
      field: [],
      discard: [],
      lore: 0,
      inkCommitted: false,
    },
    opponent: {
      deck: [],
      hand: [],
      inkwell: [],
      field: [],
      discard: [],
      lore: 0,
      inkCommitted: false,
    }
  });

  // --- DRAG STATE ---
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [dragSourceType, setDragSourceType] = useState<'FIELD' | 'HAND' | null>(null);

  // --- WIN STATE CALCULATION ---
  const playerWon = gameState.player.lore >= WINNING_LORE;
  const opponentWon = gameState.opponent.lore >= WINNING_LORE;
  const isGameOver = playerWon || opponentWon;

  // --- INITIALIZATION & RESTART ---
  const initializeGame = () => {
    const starterCards = getStarterDeck();
    const deck = shuffleDeck(createDeck(starterCards));
    
    // Create Dummy Opponent
    const opponentDeck = shuffleDeck(createDeck(starterCards));
    
    // FIXED: Only put CHARACTERS on the field for the sandbox (No actions/songs)
    const validCharacters = opponentDeck.filter(c => c.Type === "Character");
    const opponentField = validCharacters.splice(0, 3).map(c => ({...c, isExerted: true})); 

    // SANDBOX: Jumpstart Logic
    let startingInk: GameCard[] = [];
    if (jumpstartEnabled) {
        startingInk = deck.splice(0, SANDBOX_STARTING_INK_COUNT).map(c => ({
            ...c,
            isFaceDown: true,
            isExerted: false,
            damage: 0
        }));
    }

    let initialPlayerState: PlayerState = {
      deck,
      hand: [],
      inkwell: startingInk,
      field: [],
      discard: [],
      lore: 0,
      inkCommitted: false
    };
    
    initialPlayerState = drawCard(initialPlayerState, INITIAL_HAND_SIZE);

    setGameState({
        turn: 1,
        phase: GamePhase.READY,
        loading: false,
        selectedCardId: undefined,
        player: initialPlayerState,
        opponent: {
            deck: opponentDeck,
            hand: [],
            inkwell: [],
            field: opponentField,
            discard: [],
            lore: 0,
            inkCommitted: false
        }
    });
    
    setHistory([]); // Clear history on restart
  };

  // Initial App Load Effect
  useEffect(() => {
    const bootstrapApp = async () => {
        // Fetch Logic (Non-blocking for immediate UI, runs in background)
        fetchFullLibrary().catch(err => console.error("Library fetch failed", err));
        
        // Initialize Game Logic immediately with local starter deck
        initializeGame();
    };

    bootstrapApp();
  }, []); 

  // --- HISTORY MANAGEMENT ---
  const saveHistory = () => {
      setHistory(prev => [...prev, gameState]);
  };

  const handleUndo = () => {
      if (history.length === 0) return;
      
      const previousState = history[history.length - 1];
      const newHistory = history.slice(0, history.length - 1);
      
      setGameState(previousState);
      setHistory(newHistory);
  };

  // --- INTERACTION HANDLERS ---

  const handlePlayCard = (id: string, targetId?: string) => {
    if (isGameOver) return;
    saveHistory();
    setGameState(prev => playCard(prev, id, targetId));
  };

  const handleInkCard = (id: string) => {
    if (isGameOver) return;
    saveHistory();
    setGameState(prev => ({
        ...prev,
        player: addToInkwell(prev.player, id)
    }));
  };

  const handleFieldCardClick = (cardId: string, isPlayerCard: boolean) => {
    if (isGameOver) return;
    if (isPlayerCard) {
      // Logic: Select / Deselect Player Card
      setGameState(prev => {
         if (prev.selectedCardId === cardId) {
             return { ...prev, selectedCardId: undefined };
         }
         return { ...prev, selectedCardId: cardId };
      });
    } else {
      // Fallback: Clicked Enemy Card (if not dragging)
      // If we have a friendly card selected via click, attempt to Challenge
      if (gameState.selectedCardId) {
          saveHistory(); // Challenge is a game action
          setGameState(prev => {
              const newState = challengeCard(prev, prev.selectedCardId!, cardId);
              return { ...newState, selectedCardId: undefined };
          });
      }
    }
  };

  // --- DRAG & DROP HANDLERS ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
      if (isGameOver) {
          e.preventDefault();
          return;
      }
      // 1. Check if it's a FIELD card (Challenge)
      const fieldCard = gameState.player.field.find(c => c.instanceId === id);
      if (fieldCard) {
          if (!fieldCard.isExerted && !fieldCard.isDried) {
            setDragSourceId(id);
            setDragSourceType('FIELD');
            setGameState(prev => ({ ...prev, selectedCardId: undefined }));
          } else {
              e.preventDefault();
          }
          return;
      }

      // 2. Check if it's a HAND card (Action)
      const handCard = gameState.player.hand.find(c => c.instanceId === id);
      if (handCard) {
          setDragSourceId(id);
          setDragSourceType('HAND');
      }
  };

  const handleDragEnterEnemy = (id: string) => {
      if (!dragSourceId) return;

      const enemy = gameState.opponent.field.find(c => c.instanceId === id);
      if (!enemy) return;

      // Interaction Logic:
      // If dragging from FIELD (Challenge): Target must be Exerted.
      // If dragging from HAND (Action/Smash): Target can be anything (usually).
      
      let isValidTarget = false;
      if (dragSourceType === 'FIELD') {
          isValidTarget = enemy.isExerted;
      } else if (dragSourceType === 'HAND') {
          isValidTarget = true; 
      }

      if (isValidTarget) {
          setDragTargetId(id);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
  };

  const handleDropOnEnemy = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      
      if (dragSourceId && targetId) {
          saveHistory(); // Save before action
          if (dragSourceType === 'FIELD') {
              // Execute Challenge
              setGameState(prev => challengeCard(prev, dragSourceId, targetId));
          } else if (dragSourceType === 'HAND') {
              // Execute Action (Play Card with Target)
              setGameState(prev => playCard(prev, dragSourceId, targetId));
          }
      }
      resetDrag();
  };

  // Handle dropping a card from Hand to Field (Playing a Character/Item without target)
  const handleDropOnFieldArea = (e: React.DragEvent) => {
    e.preventDefault();
    if (isGameOver) return;

    // Only allow dropping cards from Hand. 
    // Field cards dropped on field do nothing (cancels move).
    if (dragSourceType === 'HAND' && dragSourceId) {
        saveHistory();
        setGameState(prev => playCard(prev, dragSourceId)); // Play with no target
    }
    resetDrag();
  };

  // Handle dropping a card from Hand to Inkwell
  const handleDropOnInkwell = (e: React.DragEvent) => {
    e.preventDefault();
    if (isGameOver) return;
    if (dragSourceType === 'HAND' && dragSourceId) {
        saveHistory();
        setGameState(prev => ({
            ...prev,
            player: addToInkwell(prev.player, dragSourceId)
        }));
    }
    resetDrag();
  };

  const handleDragEnd = () => {
      resetDrag();
  };

  const resetDrag = () => {
      setDragSourceId(null);
      setDragTargetId(null);
      setDragSourceType(null);
  };

  // --- ACTIONS ---

  const handleQuest = () => {
      if (isGameOver) return;
      if (gameState.selectedCardId) {
          saveHistory();
          setGameState(prev => {
              const newState = questCard(prev, prev.selectedCardId!);
              return { ...newState, selectedCardId: undefined };
          });
      }
  };

  const handleEndTurn = () => {
    if (isGameOver) return;
    saveHistory();
    setGameState(prev => startTurn(prev));
  };

  // Helper: Get selected card object
  const selectedCard = gameState.player.field.find(c => c.instanceId === gameState.selectedCardId);
  const canQuest = selectedCard && !selectedCard.isExerted && !selectedCard.isDried;

  // --- RENDER: LOADING SCREEN ---
  if (isAppLoading) {
      return (
          <div className="flex flex-col h-screen w-screen bg-slate-950 items-center justify-center relative overflow-hidden z-[100]">
             {/* Background Pattern */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 animate-pulse"></div>
             <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-transparent to-slate-900 pointer-events-none"></div>
             
             {/* Content */}
             <div className="relative z-10 flex flex-col items-center">
                 <div className="relative mb-8">
                     <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 animate-pulse"></div>
                     <Sparkles size={64} className="text-amber-400 animate-spin-slow duration-[3000ms]" />
                 </div>
                 
                 <h1 className="text-3xl md:text-5xl font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 animate-pulse tracking-[0.2em] font-bold text-center px-4">
                    SUMMONING ILLUMINEERS
                 </h1>
                 
                 <div className="mt-8 flex items-center gap-3 text-slate-500 font-cinzel text-sm">
                     <Loader2 size={16} className="animate-spin" />
                     <span>Preparing Inkwell...</span>
                 </div>
             </div>
          </div>
      );
  }

  // --- RENDER: MAIN GAME ---
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden relative">
      
      {/* --- Top Bar: Game Stats --- */}
      {/* Increased Z-Index to 50 to sit ABOVE the game-over overlay (z-40) */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-md z-50">
        <div className="text-slate-400 font-cinzel text-lg flex items-center gap-2">
            <span className="text-amber-600 font-bold">DeckForge</span>
        </div>
        
        {/* CENTER STATS */}
        <div className="flex gap-12">
             <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Opponent Lore</span>
                <span className="text-2xl font-bold text-red-500 font-cinzel drop-shadow-lg">{gameState.opponent.lore} / 20</span>
            </div>
            <div className="flex flex-col items-center justify-center">
                 <div className="text-slate-600 font-cinzel text-xs">TURN</div>
                 <div className="text-2xl font-bold text-slate-200 font-cinzel leading-none">{gameState.turn}</div>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Your Lore</span>
                <span className="text-2xl font-bold text-emerald-500 font-cinzel drop-shadow-lg">{gameState.player.lore} / 20</span>
            </div>
        </div>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-4">
            
            {/* UNDO: Enabled even during Game Over so players can revert */}
            <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded border font-cinzel text-sm transition-all
                    ${history.length > 0
                        ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 shadow-[0_0_10px_rgba(255,255,255,0.1)]' 
                        : 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed'}
                `}
                title="Undo Last Action"
            >
                <RotateCcw size={14} /> UNDO
            </button>

            <div className="h-8 w-px bg-slate-800 mx-2"></div>

            {/* JUMPSTART TOGGLE */}
            <div className="group relative">
                <button
                    onClick={() => setJumpstartEnabled(!jumpstartEnabled)}
                    disabled={isGameOver}
                    className={`
                        p-2 rounded border transition-all relative
                        ${jumpstartEnabled 
                            ? 'bg-amber-900/30 border-amber-600 text-amber-500' 
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}
                    `}
                >
                    <Zap size={18} className={jumpstartEnabled ? 'fill-amber-500/20' : ''} />
                    {/* Tooltip */}
                    <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded p-2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                        <span className="font-bold text-amber-500 block mb-1">Jumpstart Mode</span>
                        Proactively ink the first 5 cards of your deck to skip early turns.
                    </div>
                </button>
            </div>

            {/* RESTART */}
             <button
                onClick={initializeGame}
                className="p-2 rounded border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-700 transition-all"
                title="Restart Game"
            >
                <RotateCw size={18} />
            </button>
            
            <div className="h-8 w-px bg-slate-800 mx-2"></div>

            {/* END TURN */}
            <button 
                onClick={handleEndTurn}
                disabled={isGameOver}
                className="bg-amber-800/80 hover:bg-amber-700 text-amber-100 px-6 py-2 rounded font-cinzel font-bold flex items-center gap-2 transition-colors border border-amber-600/50 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                End Turn <RefreshCw size={16} />
            </button>
        </div>
      </div>

      {/* --- Main Battlefield --- */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4 flex flex-col">
        {/* Background Decorative Element */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Sword size={400} />
        </div>

        {/* OPPONENT Field */}
         <div className="w-full h-1/2 border-b border-slate-800/30 p-4 flex flex-wrap content-end justify-center gap-4 transition-all">
            {gameState.opponent.field.map(card => (
                <Card 
                    key={card.instanceId} 
                    card={card} 
                    isEnemy={true}
                    
                    // Drag Interaction
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnterEnemy}
                    onDrop={handleDropOnEnemy}
                    
                    // Visuals
                    isTargetable={!!gameState.selectedCardId}
                    isUnderAttack={dragTargetId === card.instanceId}
                    
                    onClick={() => handleFieldCardClick(card.instanceId, false)}
                    className="scale-90 origin-bottom"
                />
            ))}
             {gameState.opponent.field.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-red-900/30 font-cinzel text-xl tracking-widest uppercase">
                    Opponent Field Empty
                </div>
            )}
        </div>

        {/* PLAYER Field */}
        <div 
            className="w-full h-1/2 p-4 flex flex-wrap content-start justify-center gap-4 overflow-y-auto relative z-10"
            onDragOver={handleDragOver}
            onDrop={handleDropOnFieldArea}
        >
            {gameState.player.field.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-slate-700 font-cinzel text-2xl tracking-widest uppercase opacity-30 pointer-events-none">
                    Battlefield Empty (Drag Cards Here)
                </div>
            )}
            {gameState.player.field.map(card => {
                const canAct = !card.isExerted && !card.isDried;
                return (
                    <Card 
                        key={card.instanceId} 
                        card={card} 
                        isSelected={gameState.selectedCardId === card.instanceId}
                        
                        // Drag Interaction
                        isDraggable={canAct && !isGameOver}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        
                        // Visuals
                        isChallenging={dragSourceId === card.instanceId}
                        
                        onClick={() => handleFieldCardClick(card.instanceId, true)}
                    />
                );
            })}

            {/* ACTION CONTEXT MENU (Floating near bottom center of field when card selected) */}
            {gameState.selectedCardId && !isGameOver && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-amber-500/50 rounded-full px-6 py-2 flex items-center gap-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-sm animate-in slide-in-from-bottom-4 fade-in duration-200 z-50">
                    <span className="text-slate-400 text-xs font-cinzel uppercase mr-2 border-r border-slate-700 pr-4">
                        {selectedCard?.Name}
                    </span>
                    
                    <button 
                        onClick={handleQuest}
                        disabled={!canQuest}
                        className={`
                            flex items-center gap-2 px-4 py-1.5 rounded-full font-bold font-cinzel text-sm transition-all
                            ${canQuest 
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                        `}
                    >
                        <Scroll size={16} /> QUEST
                    </button>
                    
                    <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider ml-2">
                        OR DRAG TO ENEMY
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- Player Zone (Bottom) --- */}
      <div className="h-[35vh] bg-slate-900 border-t-4 border-slate-800 flex relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        
        {/* Left: Inkwell */}
        <div className="w-1/6 min-w-[160px] p-4 border-r border-slate-800 bg-slate-900/50 flex flex-col">
            <Inkwell 
                cards={gameState.player.inkwell} 
                onDragOver={handleDragOver}
                onDrop={handleDropOnInkwell}
            />
            <div className="mt-2 text-center text-[10px] text-slate-500 font-cinzel">
                INK: {gameState.player.inkwell.filter(c => !c.isExerted).length} / {gameState.player.inkwell.length}
            </div>
        </div>

        {/* Center: Hand */}
        <div className="flex-1 p-2 pb-0 overflow-visible flex items-end justify-center bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
            <Hand 
                cards={gameState.player.hand} 
                onPlayCard={(id) => handlePlayCard(id)}
                onInkCard={handleInkCard}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            />
        </div>

        {/* Right: Deck & Discard */}
        <div className="w-1/6 min-w-[160px] p-4 border-l border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center gap-6">
             {/* Deck */}
            <div className="relative w-20 h-28 bg-slate-700 rounded border border-slate-600 shadow-xl group cursor-pointer hover:scale-105 transition-transform">
                 <div className="absolute -top-1 -right-1 w-full h-full bg-slate-700 rounded border border-slate-600 z-0"></div>
                 <div className="absolute -top-2 -right-2 w-full h-full bg-slate-700 rounded border border-slate-600 z-0"></div>
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 z-10"></div>
                 <div className="absolute inset-0 flex items-center justify-center z-20">
                    <span className="font-bold text-slate-300 text-xl font-cinzel">{gameState.player.deck.length}</span>
                 </div>
                 <div className="absolute -bottom-6 w-full text-center text-[10px] text-slate-500 font-cinzel tracking-widest">DECK</div>
            </div>

            {/* Discard */}
            <div className="w-28 h-20 border-2 border-dashed border-slate-700 rounded flex items-center justify-center relative group hover:border-slate-500 transition-colors">
                 {gameState.player.discard.length > 0 ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                         <Card 
                            card={gameState.player.discard[gameState.player.discard.length - 1]} 
                            className="w-20 h-28 rotate-90" 
                         />
                    </div>
                 ) : (
                    <span className="text-[10px] text-slate-600 font-cinzel">EMPTY</span>
                 )}
                 <div className="absolute -bottom-6 w-full text-center text-[10px] text-slate-500 font-cinzel tracking-widest">
                    DISCARD ({gameState.player.discard.length})
                 </div>
            </div>
        </div>

      </div>

      {/* --- GAME OVER OVERLAY (z-40) --- */}
      {isGameOver && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-1000">
            {/* Player Won */}
            {playerWon && (
                <>
                    <Trophy size={64} className="text-amber-400 mb-6 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-bounce" />
                    <div className="text-6xl md:text-8xl font-cinzel font-bold text-slate-200 drop-shadow-[0_0_35px_rgba(255,255,255,0.3)] tracking-widest uppercase mb-4 text-center">
                        PLAYER WINNER
                    </div>
                    <div className="text-xl font-cinzel text-slate-400 mb-10 tracking-wider">
                        The Illuminary is secure.
                    </div>
                </>
            )}

            {/* Opponent Won */}
            {opponentWon && (
                <>
                    <Skull size={64} className="text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                    <div className="text-6xl md:text-8xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-yellow-500 drop-shadow-[0_0_25px_rgba(220,38,38,0.5)] tracking-widest uppercase mb-4 text-center">
                        OPPONENT WINNER
                    </div>
                    <div className="text-xl font-cinzel text-red-900/50 mb-10 tracking-wider font-bold">
                        Your lore has been stolen.
                    </div>
                </>
            )}

            <button 
                onClick={initializeGame}
                className="px-8 py-3 bg-slate-800 border-2 border-slate-600 hover:bg-slate-700 hover:border-slate-400 hover:text-white text-slate-300 font-cinzel text-xl rounded shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all hover:scale-105 flex items-center gap-3"
            >
                <RotateCw size={20} /> Play Again
            </button>
        </div>
      )}
    </div>
  );
};