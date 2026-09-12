import type { Level } from "./flashcard-types";
import { beginnerCards } from "./deck-beginner";
import { intermediateCards } from "./deck-intermediate";
import { advancedCards } from "./deck-advanced";

export type { Flashcard, Level } from "./flashcard-types";

export const levels: Level[] = [
  {
    id: "beginner",
    name: "Beginner",
    description: "Essential greetings & everyday words",
    duration: "20 cards",
    cards: beginnerCards,
  },
  {
    id: "intermediate",
    name: "Intermediate",
    description: "Everyday verbs, phrases & small talk",
    duration: "10 min",
    cards: intermediateCards,
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "Idioms, nuance & natural flow",
    duration: "10 min",
    cards: advancedCards,
  },
];
