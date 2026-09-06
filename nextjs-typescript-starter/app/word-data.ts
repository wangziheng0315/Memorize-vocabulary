type JsonRecord = Record<string, unknown>;

export type WordSource = {
  id: bigint | number | string;
  headWord: string | null;
  content: unknown;
};

export type WordCardData = {
  id: string;
  headWord: string;
  usPhone?: string;
  ukPhone?: string;
  meaning?: string;
  example?: { en: string; zh?: string };
};

export type WordDetailData = WordCardData & {
  translations: Array<{ zh?: string; en?: string }>;
  examples: Array<{ en: string; zh?: string }>;
  phrases: Array<{ text: string; zh?: string }>;
  synonyms: Array<{ partOfSpeech?: string; meaning?: string; words: string[] }>;
  relatedWords: Array<{
    partOfSpeech?: string;
    words: Array<{ word: string; meaning?: string }>;
  }>;
  memoryTip?: string;
};

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? (value.map(record).filter(Boolean) as JsonRecord[])
    : [];
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function toWordDetail(source: WordSource): WordDetailData {
  const root = record(source.content);
  const word = record(root?.word);
  const detail = record(word?.content);
  const sentence = record(detail?.sentence);
  const phrase = record(detail?.phrase);
  const synonym = record(detail?.syno);
  const related = record(detail?.relWord);
  const memory = record(detail?.remMethod);

  const translations = records(detail?.trans)
    .map((item) => ({ zh: text(item.tranCn), en: text(item.tranOther) }))
    .filter((item) => item.zh || item.en);

  const examples = records(sentence?.sentences).flatMap((item) => {
    const en = text(item.sContent);
    return en ? [{ en, zh: text(item.sCn) }] : [];
  });

  const phrases = records(phrase?.phrases).flatMap((item) => {
    const phraseText = text(item.pContent);
    return phraseText ? [{ text: phraseText, zh: text(item.pCn) }] : [];
  });

  const synonyms = records(synonym?.synos).map((item) => ({
    partOfSpeech: text(item.pos),
    meaning: text(item.tran),
    words: records(item.hwds).flatMap((entry) => text(entry.w) ?? []),
  }));

  const relatedWords = records(related?.rels).map((item) => ({
    partOfSpeech: text(item.pos),
    words: records(item.words).flatMap((entry) => {
      const relatedWord = text(entry.hwd);
      return relatedWord
        ? [{ word: relatedWord, meaning: text(entry.tran) }]
        : [];
    }),
  }));

  return {
    id: source.id.toString(),
    headWord: text(source.headWord) ?? text(word?.wordHead) ?? '未知单词',
    usPhone: text(detail?.usphone),
    ukPhone: text(detail?.ukphone),
    meaning: translations[0]?.zh,
    example: examples[0],
    translations,
    examples,
    phrases,
    synonyms,
    relatedWords,
    memoryTip: text(memory?.val),
  };
}

export function toWordCard(source: WordSource): WordCardData {
  const { id, headWord, usPhone, ukPhone, meaning, example } = toWordDetail(source);
  return { id, headWord, usPhone, ukPhone, meaning, example };
}
