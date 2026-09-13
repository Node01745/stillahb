import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { levels, type Level, type Flashcard } from "../lib/swedish-flashcards";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stilla — calm Swedish flashcards" },
      { name: "description", content: "A gentle daily ritual for learning Swedish: one small deck of 20 flashcards at a time." },
      { property: "og:title", content: "Stilla — calm Swedish flashcards" },
      { property: "og:description", content: "A gentle daily ritual for learning Swedish: one small deck of 20 flashcards at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SESSION_SIZE = 20;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

type SessionState = "idle" | "running" | "finished";

function Index() {
  const [selectedLevelId, setSelectedLevelId] = useState<string>(levels[1]?.id ?? levels[0]!.id);
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const knownIdsRef = useRef<Set<string>>(new Set());
  // Cards already dealt this level, so "go again" can deal unseen words.
  const usedIdsRef = useRef<Map<string, Set<string>>>(new Map());

  const level = useMemo(
    () => (levels.find((l) => l.id === selectedLevelId) ?? levels[0]) as Level,
    [selectedLevelId]
  );

  const currentCard = queue[0];
  const progress = (knownCount / SESSION_SIZE) * 100;

  const startSession = (excludeSeen = true) => {
    const used = usedIdsRef.current;
    let seen = excludeSeen ? (used.get(level.id) ?? new Set<string>()) : new Set<string>();
    let fresh = level.cards.filter((c) => !seen.has(c.id));
    if (fresh.length < SESSION_SIZE) {
      // Every word in this level has been seen — refill the pool and start over.
      seen = new Set<string>();
      fresh = level.cards;
    }
    used.set(level.id, seen);
    knownIdsRef.current = new Set();
    const round = shuffle(fresh).slice(0, SESSION_SIZE);
    const seenForLevel = used.get(level.id)!;
    for (const card of round) seenForLevel.add(card.id);
    setQueue(round);
    setKnownCount(0);
    setReviewedCount(0);
    setIsFlipped(false);
    setSessionState("running");
  };

  const handleLevelChange = (levelId: string) => {
    if (levelId === selectedLevelId) return;
    setSelectedLevelId(levelId);
    setSessionState("idle");
    setQueue([]);
    setIsFlipped(false);
  };

  const handleFlip = () => setIsFlipped((prev) => !prev);

  const handleNext = (known: boolean) => {
    if (!currentCard || sessionState !== "running") return;
    setReviewedCount((c) => c + 1);

    if (known) {
      if (!knownIdsRef.current.has(currentCard.id)) {
        knownIdsRef.current.add(currentCard.id);
        setKnownCount(knownIdsRef.current.size);
      }
      setQueue((prev) => prev.slice(1));
      if (queue.length <= 1) {
        setSessionState("finished");
        setIsFlipped(false);
      }
    } else {
      // "Still learning" cards go to the back until they're known.
      setQueue((prev) => [...prev.slice(1), currentCard]);
    }
    setIsFlipped(false);
  };

  // Keyboard shortcuts: space to flip, left = still learning, right = I know it.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (sessionState !== "running") return;
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
  }, [sessionState, currentCard, level]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-frost font-body text-ink antialiased">
      <Header progress={progress} running={sessionState === "running"} />

      <main className="relative mx-auto max-w-5xl px-6 pb-24">
        <section className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-center">
          <div className="md:col-span-7">
            <p className="text-base font-medium text-rose">
              {level.name} · Dagens kort
            </p>
            <h1 className="mt-1 max-w-[30ch] font-display text-3xl font-semibold leading-tight tracking-tight text-ink">
              One small deck at a time.
            </h1>

            {sessionState === "finished" ? (
              <CompletionCard
                level={level}
                reviewedCount={reviewedCount}
                onRestart={startSession}
              />
            ) : sessionState === "running" && currentCard ? (
              <StudyCard
                card={currentCard}
                knownCount={knownCount}
                totalCards={SESSION_SIZE}
                isFlipped={isFlipped}
                onFlip={handleFlip}
                onNext={handleNext}
              />
            ) : (
              <StartCard level={level} onStart={startSession} />
            )}
          </div>

          <LevelSelector
            levels={levels}
            selectedLevelId={selectedLevelId}
            onSelect={handleLevelChange}
          />
        </section>

        <WordOfTheDay />

        <section className="mt-16 flex flex-col items-center gap-3 text-center">
          <span className="text-sm text-mist">
            A short, unhurried practice. Come back tomorrow.
          </span>
          <span className="text-xs text-mist/70">
            Stilla · a small Swedish ritual
          </span>
        </section>
      </main>
    </div>
  );
}

// Deterministic word of the day: same word for everyone all day, new one tomorrow.
function getWordOfTheDay(): Flashcard {
  const pool = levels.flatMap((l) => l.cards);
  const now = new Date();
  const dayIndex = now.getFullYear() * 372 + now.getMonth() * 31 + now.getDate();
  return pool[dayIndex % pool.length]!;
}

function WordOfTheDay() {
  const word = useMemo(getWordOfTheDay, []);
  return (
    <div className="relative mx-auto mt-16 max-w-md">
      <div className="animate-float-soft rounded-3xl bg-white ring-1 ring-black/5 p-7 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky">
          Dagens ord
        </p>
        <p className="mt-3 font-display text-3xl font-medium text-ink">{word.swedish}</p>
        {word.pronunciation && (
          <p className="mt-1.5 text-sm italic text-mist">
            {word.pronunciation}
            {word.partOfSpeech ? ` · ${word.partOfSpeech}` : ""}
          </p>
        )}
        <p className="mt-3 font-body text-base text-ink/80">{word.english}</p>
        {word.example && (
          <p className="mt-3 max-w-[30ch] mx-auto text-sm italic text-mist">"{word.example}"</p>
        )}
      </div>
    </div>
  );
}

function Header({ progress, running }: { progress: number; running: boolean }) {
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (progress / 100) * circumference;

  const todaysDate = useMemo(() => {
    const raw = new Date().toLocaleDateString("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  return (
    <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-7">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            Stilla
          </span>
          <span className="text-sm text-mist">· calmly, in Swedish</span>
        </div>
        <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.18em] text-mist">
          {todaysDate}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-mist sm:inline">
          {running ? "In progress" : "Today"}
        </span>
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
          <span className="absolute text-xs font-medium text-ink">{Math.round(progress)}%</span>
        </div>
      </div>
    </header>
  );
}

function StartCard({ level, onStart }: { level: Level; onStart: () => void }) {
  return (
    <div className="mx-auto mt-9 w-full max-w-sm">
      <div className="relative">
        {/* Tilted card stacked behind, like a deck waiting to be used */}
        <div
          className="absolute inset-0 rotate-3 scale-[1.02] translate-y-2 rounded-3xl bg-white/50"
          aria-hidden="true"
        />
        {/* Small floating pastel shapes */}
        <div
          className="animate-breathe absolute -top-5 -right-5 size-12 rounded-2xl bg-sky/25 blur-[1px]"
          aria-hidden="true"
        />
        <div
          className="animate-float-slow absolute bottom-10 -left-6 size-8 rounded-full bg-blush/60 blur-[1px]"
          aria-hidden="true"
        />
        <div className="animate-float-soft relative rounded-3xl bg-white ring-1 ring-black/5 p-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose">Twenty cards</p>
          <p className="mt-3 font-display text-3xl font-medium text-ink">Redo när du är redo.</p>
          <p className="mt-4 text-sm text-ink/70">
            20 cards, shuffled from {level.cards.length} {level.name.toLowerCase()} words and
            phrases. Cards you don't know keep coming back until you know them.
          </p>
          <button
            type="button"
            onClick={onStart}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-rose px-6 py-2.5 text-sm font-medium text-white ring-2 ring-rose/30 transition hover:bg-rose/90 hover:-translate-y-0.5"
          >
            Start the deck
          </button>
        </div>
      </div>
    </div>
  );
}

function StudyCard({
  card,
  knownCount,
  totalCards,
  isFlipped,
  onFlip,
  onNext,
}: {
  card: Flashcard;
  knownCount: number;
  totalCards: number;
  isFlipped: boolean;
  onFlip: () => void;
  onNext: (known: boolean) => void;
}) {
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
        {knownCount} of {totalCards} known
      </p>
    </div>
  );
}

function CompletionCard({
  level,
  reviewedCount,
  onRestart,
}: {
  level: Level;
  reviewedCount: number;
  onRestart: () => void;
}) {
  const practiceCount = Math.max(0, reviewedCount - SESSION_SIZE);
  return (
    <div className="mx-auto mt-9 w-full max-w-sm">
      <div className="rounded-3xl bg-white ring-1 ring-black/5 p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose">Deck done</p>
        <p className="mt-3 font-display text-3xl font-medium text-ink">Bra jobbat.</p>
        <p className="mt-4 text-sm text-ink/70">
          All twenty {level.name.toLowerCase()} cards, known and done.
        </p>
        <div className="mt-6 flex justify-center gap-8">
          <div className="text-center">
            <p className="font-display text-2xl font-semibold text-ink">{SESSION_SIZE}</p>
            <p className="text-xs text-mist">Known</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-semibold text-ink">{practiceCount}</p>
            <p className="text-xs text-mist">Needed practice</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-rose px-6 py-2.5 text-sm font-medium text-white ring-2 ring-rose/30 transition hover:bg-rose/90"
        >
          Go again
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
                    <span className="size-1.5 rounded-full bg-sky"></span> Selected
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
