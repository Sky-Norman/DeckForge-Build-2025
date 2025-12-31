import { GameCard, PlayerState, Zone, GamePhase, CardData } from '../types';

export const createDeck = (cardPool: CardData[], size: number = 60): GameCard[] => {
  const deck: GameCard[] = [];
  // Randomly select cards to fill the deck
  for (let i = 0; i < size; i++) {
    const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)];
    deck.push({
      ...randomCard,
      instanceId: `card-${i}-${Date.now()}`,
      isExerted: false,
      isDried: true,
      isFaceDown: false
    });
  }
  return deck;
};

export const shuffleDeck = (deck: GameCard[]): GameCard[] => {
  return [...deck].sort(() => Math.random() - 0.5);
};

export const drawCard = (state: PlayerState, count: number = 1): PlayerState => {
  if (state.deck.length === 0) return state; // Loose via mill? Ignored for now.

  const newDeck = [...state.deck];
  const drawnCards = newDeck.splice(0, count);
  
  return {
    ...state,
    deck: newDeck,
    hand: [...state.hand, ...drawnCards]
  };
};

export const addToInkwell = (state: PlayerState, cardInstanceId: string): PlayerState => {
  if (state.inkCommitted) return state; // Only 1 ink per turn

  const cardIndex = state.hand.findIndex(c => c.instanceId === cardInstanceId);
  if (cardIndex === -1) return state;

  const card = state.hand[cardIndex];
  if (!card.Inkable) return state; // Must be inkable

  const newHand = [...state.hand];
  newHand.splice(cardIndex, 1);

  const inkedCard: GameCard = {
    ...card,
    isFaceDown: true,
    isExerted: false
  };

  return {
    ...state,
    hand: newHand,
    inkwell: [...state.inkwell, inkedCard],
    inkCommitted: true
  };
};

export const playCard = (state: PlayerState, cardInstanceId: string): PlayerState => {
  const cardIndex = state.hand.findIndex(c => c.instanceId === cardInstanceId);
  if (cardIndex === -1) return state;

  const card = state.hand[cardIndex];
  
  // Logic to check ink cost vs available ink would go here
  // For now, we assume valid play for simulation purposes

  const newHand = [...state.hand];
  newHand.splice(cardIndex, 1);

  const playedCard: GameCard = {
    ...card,
    isDried: true, // Summoning sickness
    isExerted: false
  };

  return {
    ...state,
    hand: newHand,
    field: [...state.field, playedCard]
  };
};

export const readyPhase = (state: PlayerState): PlayerState => {
  return {
    ...state,
    inkCommitted: false,
    field: state.field.map(c => ({ ...c, isExerted: false, isDried: false })),
    inkwell: state.inkwell.map(c => ({ ...c, isExerted: false }))
  };
};