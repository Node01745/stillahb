import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { levels, type Level, type Flashcard } from "../lib/swedish-flashcards";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stilla — calm Swedish flashcards" },
      { name: "description", content: "A gentle ten-minute daily ritual for learning Swedish, one flashcard at a time." },
      { property: "og:title", content: "Stilla — calm Swedish flashcards" },
      { property: "og:description", content: "A gentle ten-minute daily ritual for learning Swedish, one flashcard at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const SESSION_SIZE = 20;

  const [selectedLevelId, setSelectedLevelId] = useState<string>(levels[1]?.id ?? levels[0]!.id);
  const [sessionSeed, setSessionSeed] = useState(0);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [learningIds, setLearningIds] = useState<Set<string>>(new Set());
  const [sessionComplete, setSessionComplete] = useState(false);

  const level = useMemo(
    () => (levels.find((l) => l.id === selectedLevelId) ?? levels[0]) as Level,
    [selectedLevelId]
  );

  // Build a fresh shuffled session of 20 cards whenever the level or session changes.
  useEffect(() => {
    const shuffled = [...level.cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    setQueue(shuffled.slice(0, SESSION_SIZE));
    setIsFlipped(false);
    setKnownIds(new Set());
    setLearningIds(new Set());
    setSessionComplete(false);
  }, [level, sessionSeed]);

  const totalCards = Math.min(SESSION_SIZE, level.cards.length);
  const currentCard = queue[0];
  const progress = Math.round((knownIds.size / totalCards) * 100);
  const knownCount = knownIds.size;
  const learningCount = learningIds.size;

  const resetSession = (levelId: string) => {
    setSelectedLevelId(levelId);
    setSessionSeed((prev) => prev + 1);
  };

  const handleLevelChange = (levelId: string) => {
    if (levelId === selectedLevelId) return;
    resetSession(levelId);
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleNext = (known: boolean) => {
    if (!currentCard) return;

    if (known) {
      const newKnown = new Set([...knownIds, currentCard.id]);
      setKnownIds(newKnown);
      setQueue((prev) => prev.slice(1));
      if (newKnown.size >= totalCards) {
        setSessionComplete(true);
      }
    } else {
      setLearningIds((prev) => new Set([...prev, currentCard.id]));
      // "Still learning" cards go back to the end of the deck until known.
      setQueue((prev) => [...prev.slice(1), currentCard]);
    }
    setIsFlipped(false);
  };

  const handleRestart = () => {
    resetSession(selectedLevelId);
  };

  // Keyboard shortcuts: space to flip, left arrow = still learning, right arrow = I know it.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (sessionComplete) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleNext(false);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sessionComplete, currentCard, knownIds, totalCards]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-frost font-body text-ink antialiased">
      <Header progress={progress} />

      <main className="relative mx-auto max-w-5xl px-6 pb-24">
        <section className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-center">
          <div className="md:col-span-7">
            <p className="text-base font-medium text-rose">
              {level.name} · Dagens kort
            </p>
            <h1 className="mt-1 max-w-[30ch] font-display text-3xl font-semibold leading-tight tracking-tight text-ink">
              Take a slow breath. One small deck at a time.
            </h1>

            {sessionComplete ? (
              <CompletionCard
                level={level}
                knownCount={knownCount}
                learningCount={learningCount}
                onRestart={handleRestart}
              />
            ) : currentCard ? (
              <StudyCard
                card={currentCard}
                currentIndex={knownCount}
                totalCards={totalCards}
                levelDuration={level.duration}
                isFlipped={isFlipped}
                onFlip={handleFlip}
                onNext={handleNext}
              />
            ) : null}
          </div>

          <LevelSelector
            levels={levels}
            selectedLevelId={selectedLevelId}
            onSelect={handleLevelChange}
          />
        </section>

        <section className="mt-16 flex flex-col items-center gap-3 text-center">
          <span className="text-sm text-mist">
            A short, unhurried practice. Come back tomorrow.
          </span>
          <span className="text-xs text-mist/70">
            Stilla · a ten-minute Swedish ritual
          </span>
        </section>
      </main>
    </div>
  );
}

function Header({ progress }: { progress: number }) {
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-7">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold tracking-tight text-ink">
          Stilla
        </span>
        <span className="text-sm text-mist">· calmly, in Swedish</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-mist sm:inline">Today</span>
        <div className="relative grid size-12 place-items-center">
          <svg viewBox="0 0 44 44" className="size-12 -rotate-90" aria-hidden="true">
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="oklch(0.76 0.09 250 / 25%)"
              strokeWidth="4"
            />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="oklch(0.726 0.1202 4.90)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute text-xs font-medium text-ink">{progress}%</span>
        </div>
      </div>
    </header>
  );
}

function StudyCard({
  card,
  currentIndex,
  totalCards,
  levelDuration,
  isFlipped,
  onFlip,
  onNext,
}: {
  card: Flashcard;
  currentIndex: number;
  totalCards: number;
  levelDuration: string;
  isFlipped: boolean;
  onFlip: () => void;
  onNext: (known: boolean) => void;
}) {
  const remaining = totalCards - currentIndex;
  const estimatedMinutes = Math.max(1, Math.round((remaining / totalCards) * parseInt(levelDuration)));

  return (
    <div className="mx-auto mt-9 w-full max-w-sm">
      <button
        type="button"
        onClick={onFlip}
        className="flip block h-72 w-full select-none outline-none focus-visible:ring-2 focus-visible:ring-sky/60 rounded-3xl"
        aria-label="Flip card"
      >
        <div className={`flip-inner ${isFlipped ? "flipped" : ""}`}>
          <div className="face rounded-3xl bg-white ring-1 ring-black/5 grid place-items-center p-8 text-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-mist">Word</p>
              <p className="mt-3 font-display text-4xl font-medium text-ink">{card.swedish}</p>
              {card.pronunciation && (
                <p className="mt-2 text-sm italic text-mist">{card.pronunciation} · {card.partOfSpeech}</p>
              )}
              <p className="mt-8 text-xs font-medium text-rose">Tap to reveal</p>
            </div>
          </div>
          <div className="face face-back rounded-3xl bg-blush ring-1 ring-black/5 grid place-items-center p-8 text-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose/70">Meaning</p>
              <p className="mt-3 font-display text-3xl font-medium text-ink">{card.english}</p>
              {card.example && (
                <p className="mt-4 max-w-[26ch] text-sm text-ink/70">"{card.example}"</p>
              )}
            </div>
          </div>
        </div>
      </button>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNext(false)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-black/5 transition hover:bg-white/80"
        >
          <span className="text-mist">←</span> Still learning
        </button>
        <button
          type="button"
          onClick={() => onNext(true)}
          className="inline-flex items-center gap-2 rounded-full bg-rose px-5 py-2.5 text-sm font-medium text-white ring-2 ring-rose/30 transition hover:bg-rose/90"
        >
          I know it <span className="text-white/80">→</span>
        </button>
      </div>
      <p className="mt-4 text-center text-sm text-mist">
        Card {currentIndex + 1} of {totalCards} · about {estimatedMinutes} min left
      </p>
    </div>
  );
}

function CompletionCard({
  level,
  knownCount,
  learningCount,
  onRestart,
}: {
  level: Level;
  knownCount: number;
  learningCount: number;
  onRestart: () => void;
}) {
  return (
    <div className="mx-auto mt-9 w-full max-w-sm">
      <div className="rounded-3xl bg-white ring-1 ring-black/5 p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose">Session complete</p>
        <p className="mt-3 font-display text-3xl font-medium text-ink">Bra jobbat.</p>
        <p className="mt-4 text-sm text-ink/70">
          You finished the {level.name.toLowerCase()} deck.
        </p>
        <div className="mt-6 flex justify-center gap-8">
          <div className="text-center">
            <p className="font-display text-2xl font-semibold text-ink">{knownCount}</p>
            <p className="text-xs text-mist">Known</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-semibold text-ink">{learningCount}</p>
            <p className="text-xs text-mist">Needed practice</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-rose px-6 py-2.5 text-sm font-medium text-white ring-2 ring-rose/30 transition hover:bg-rose/90"
        >
          Practice again
        </button>
      </div>
    </div>
  );
}

function LevelSelector({
  levels,
  selectedLevelId,
  onSelect,
}: {
  levels: Level[];
  selectedLevelId: string;
  onSelect: (levelId: string) => void;
}) {
  return (
    <div className="md:col-span-5">
      <p className="text-sm font-medium text-mist">Choose your level</p>
      <div className="mt-4 space-y-3">
        {levels.map((level) => {
          const isSelected = level.id === selectedLevelId;
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => onSelect(level.id)}
              className={`w-full rounded-2xl p-5 text-left transition ${
                isSelected
                  ? "bg-white ring-2 ring-sky/60"
                  : "bg-white/70 ring-1 ring-black/5 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-medium text-ink">{level.name}</span>
                {isSelected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-sky">
                    <span className="size-1.5 rounded-full bg-sky"></span> In session
                  </span>
                ) : (
                  <span className="text-xs text-mist">{level.duration}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink/70">{level.description}</p>
              <span
                className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isSelected ? "bg-sky/15 text-sky" : "bg-mist/15 text-mist"
                }`}
              >
                {level.cards.length} cards
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
