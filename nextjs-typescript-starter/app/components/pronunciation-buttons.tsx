'use client';

import { useRef } from 'react';

export function PronunciationButtons({ word }: { word: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);

  function play(type: 1 | 2) {
    audio.current?.pause();
    const player = new Audio(
      `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`,
    );
    audio.current = player;
    void player.play().catch(() => undefined);
  }

  return (
    <div className="flex items-center justify-center gap-2" aria-label="单词发音">
      <button
        type="button"
        onClick={() => play(1)}
        title="英式发音"
        aria-label={`${word} 英式发音`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-base transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span aria-hidden="true">🔊</span><span className="ml-0.5 text-[10px] font-bold">英</span>
      </button>
      <button
        type="button"
        onClick={() => play(2)}
        title="美式发音"
        aria-label={`${word} 美式发音`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-base transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span aria-hidden="true">🔊</span><span className="ml-0.5 text-[10px] font-bold">美</span>
      </button>
    </div>
  );
}
