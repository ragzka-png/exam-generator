
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
        AI Exam Question Generator
      </h1>
      <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
        Buat soal ujian pilihan ganda dan esai secara otomatis dari materi pelajaran Anda menggunakan kekuatan AI.
      </p>
    </header>
  );
};
