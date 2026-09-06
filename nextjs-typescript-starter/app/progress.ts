export type StoredProgress = {
  lastLearnedWordId: string | null;
  learnedCount: number;
  isCompleted: boolean;
};

export type ProgressDecision =
  | { kind: 'advance'; learnedCount: number; isCompleted: boolean; restarts: boolean }
  | { kind: 'duplicate' }
  | { kind: 'conflict' };

export function decideProgress(
  progress: StoredProgress,
  wordId: string,
  position: number,
  total: number,
): ProgressDecision {
  if (progress.isCompleted) {
    if (position !== 0) return { kind: 'conflict' };

    return {
      kind: 'advance',
      learnedCount: 1,
      isCompleted: total === 1,
      restarts: true,
    };
  }

  if (progress.lastLearnedWordId === wordId) return { kind: 'duplicate' };

  if (position !== progress.learnedCount) return { kind: 'conflict' };

  return {
    kind: 'advance',
    learnedCount: position + 1,
    isCompleted: position === total - 1,
    restarts: false,
  };
}

export function progressSelfCheck() {
  const empty: StoredProgress = {
    lastLearnedWordId: null,
    learnedCount: 0,
    isCompleted: false,
  };
  const first = decideProgress(empty, '1', 0, 2);
  const duplicate = decideProgress(
    { lastLearnedWordId: '1', learnedCount: 1, isCompleted: false },
    '1',
    0,
    2,
  );
  const skipped = decideProgress(empty, '2', 1, 2);
  const review = decideProgress(
    { lastLearnedWordId: '2', learnedCount: 2, isCompleted: true },
    '1',
    0,
    2,
  );
  const oneWordReview = decideProgress(
    { lastLearnedWordId: '1', learnedCount: 1, isCompleted: true },
    '1',
    0,
    1,
  );

  if (
    first.kind !== 'advance' ||
    duplicate.kind !== 'duplicate' ||
    skipped.kind !== 'conflict' ||
    review.kind !== 'advance' ||
    !review.restarts ||
    oneWordReview.kind !== 'advance' ||
    !oneWordReview.restarts
  ) {
    throw new Error('Progress decision self-check failed.');
  }
}
