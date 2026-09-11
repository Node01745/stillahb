export type Flashcard = {
  id: string;
  swedish: string;
  english: string;
  pronunciation?: string;
  partOfSpeech?: string;
  example?: string;
};

export type Level = {
  id: string;
  name: string;
  description: string;
  duration: string;
  cards: Flashcard[];
};

/** Compact deck row: "swedish|english|partOfSpeech|example" */
export const rowsToCards = (prefix: string, rows: string[]): Flashcard[] =>
  rows.map((row, index) => {
    const [swedish, english, partOfSpeech, example] = row.split("|");
    return {
      id: `${prefix}${index + 1}`,
      swedish: swedish!.trim(),
      english: english!.trim(),
      partOfSpeech: partOfSpeech?.trim() || undefined,
      example: example?.trim() || undefined,
    };
  });
