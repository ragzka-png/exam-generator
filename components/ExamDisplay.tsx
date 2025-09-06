import React from 'react';
import { SpinnerIcon } from './icons';
import type { ExamData, Question } from '../types';
import { QuestionCard } from './QuestionCard';

interface ExamDisplayProps {
  examData: ExamData | null;
  isLoading: boolean;
  error: string | null;
  onUpdateQuestion: (question: Question) => void;
  onRegenerateQuestion: (question: Question, index: number) => Promise<void>;
}

export const ExamDisplay: React.FC<ExamDisplayProps> = ({ examData, isLoading, error, onUpdateQuestion, onRegenerateQuestion }) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <SpinnerIcon />
          <p className="text-lg text-gray-300 mt-4">AI sedang meracik soal untuk Anda...</p>
          <p className="text-sm text-gray-500">Mohon tunggu sebentar.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-center">
            <strong className="font-bold">Oops! Terjadi kesalahan.</strong>
            <span className="block sm:inline mt-2 sm:mt-0"> {error}</span>
          </div>
        </div>
      );
    }

    if (examData && (examData.mcqs.length > 0 || examData.essays.length > 0)) {
      const { mcqs, essays } = examData;
      return (
        <div>
          {mcqs.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4 text-blue-300 border-b-2 border-slate-600 pb-2">SOAL PILIHAN GANDA</h2>
              <div className="space-y-6">
                {mcqs.map((mcq, index) => (
                  <QuestionCard 
                    key={mcq.id} 
                    question={mcq} 
                    index={index}
                    onUpdate={onUpdateQuestion} 
                    onRegenerate={onRegenerateQuestion} 
                  />
                ))}
              </div>
            </section>
          )}

          {essays.length > 0 && (
            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-blue-300 border-b-2 border-slate-600 pb-2">SOAL ESSAY</h2>
               <div className="space-y-6">
                 {essays.map((essay, index) => (
                    <QuestionCard 
                      key={essay.id} 
                      question={essay} 
                      index={index}
                      onUpdate={onUpdateQuestion} 
                      onRegenerate={onRegenerateQuestion} 
                    />
                 ))}
               </div>
            </section>
          )}

          <hr className="my-8 border-gray-600" />
          
          <section>
            <h2 className="text-2xl font-bold mb-4 text-blue-300 border-b-2 border-slate-600 pb-2">KUNCI JAWABAN</h2>
            {mcqs.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mt-4 mb-2 text-teal-300">Pilihan Ganda</h3>
                <ol className="list-decimal list-inside text-gray-300 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {mcqs.map((mcq, index) => <li key={mcq.id}><strong>{index + 1}.</strong> {mcq.answer}</li>)}
                </ol>
              </div>
            )}
            {essays.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xl font-semibold mb-2 text-teal-300">Essay</h3>
                <ol className="list-decimal list-inside text-gray-300 space-y-3">
                  {essays.map((essay, index) => <li key={essay.id}><strong>{index + 1}.</strong> {essay.answer}</li>)}
                </ol>
              </div>
            )}
          </section>

        </div>
      );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className="text-xl font-semibold text-gray-400">Hasil Ujian Akan Tampil di Sini</h3>
            <p className="mt-2 max-w-sm">Isi formulir di sebelah kiri dan klik "Buat Soal Ujian" untuk memulai.</p>
        </div>
    );
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-2xl border border-slate-700 min-h-[600px] lg:h-full overflow-y-auto">
      {renderContent()}
    </div>
  );
};
