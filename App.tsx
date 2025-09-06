import React, { useState, useCallback } from 'react';
import { InputForm } from './components/InputForm';
import { ExamDisplay } from './components/ExamDisplay';
import { Header } from './components/Header';
import { generateExamQuestions, regenerateSingleQuestion } from './services/geminiService';
import type { FormState, ExamData, Question } from './types';
import { WelcomeModal } from './components/WelcomeModal';

const App: React.FC = () => {
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(true);
  const [formState, setFormState] = useState<FormState>({
    subject: 'Sejarah Indonesia',
    topic: 'Proklamasi Kemerdekaan',
    sourceMaterial: 'Proklamasi Kemerdekaan Indonesia dilaksanakan pada hari Jumat, 17 Agustus 1945 tahun Masehi, atau tanggal 17 Agustus 2605 menurut tahun Jepang, yang dibacakan oleh Soekarno dengan didampingi oleh Drs. Mohammad Hatta di sebuah rumah hibah dari Faradj bin Said bin Awadh Martak di Jalan Pegangsaan Timur No. 56, Jakarta Pusat.',
    mcqCount: 3,
    essayCount: 2,
    difficultyRanges: [
      { id: crypto.randomUUID(), to: 5, difficulty: 'sedang' }
    ],
  });

  const [generatedExam, setGeneratedExam] = useState<ExamData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateExam = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedExam(null);

    try {
      if (formState.mcqCount === 0 && formState.essayCount === 0) {
        throw new Error("Jumlah soal Pilihan Ganda dan Essay tidak boleh keduanya nol.");
      }
      const totalQuestions = formState.mcqCount + formState.essayCount;
      const lastRangeEnd = formState.difficultyRanges[formState.difficultyRanges.length - 1]?.to;
      if (totalQuestions !== lastRangeEnd) {
        throw new Error("Rentang soal pada tingkat kesulitan tidak cocok dengan jumlah total soal.");
      }


      const result = await generateExamQuestions(formState);
      setGeneratedExam(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Gagal membuat soal: ${err.message}`);
      } else {
        setError('Terjadi kesalahan yang tidak diketahui.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [formState]);

  const handleUpdateQuestion = (updatedQuestion: Question) => {
    setGeneratedExam(prev => {
        if (!prev) return null;
        if (updatedQuestion.type === 'mcq') {
            return {
                ...prev,
                mcqs: prev.mcqs.map(q => q.id === updatedQuestion.id ? updatedQuestion : q)
            };
        } else {
            return {
                ...prev,
                essays: prev.essays.map(q => q.id === updatedQuestion.id ? updatedQuestion : q)
            };
        }
    });
  };

  const handleRegenerateQuestion = async (question: Question, index: number) => {
      const questionNumber = question.type === 'mcq'
        ? index + 1
        : formState.mcqCount + index + 1;
      
      const newQuestion = await regenerateSingleQuestion(formState, question, questionNumber);
      handleUpdateQuestion(newQuestion);
  };


  return (
    <>
      <WelcomeModal 
        isOpen={isWelcomeModalOpen} 
        onClose={() => setIsWelcomeModalOpen(false)} 
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-gray-100 font-sans p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] md:min-h-[calc(100vh-4rem)]">
          <Header />
          <main className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow">
            <InputForm
              formState={formState}
              setFormState={setFormState}
              onSubmit={handleGenerateExam}
              isLoading={isLoading}
            />
            <ExamDisplay
              examData={generatedExam}
              isLoading={isLoading}
              error={error}
              onUpdateQuestion={handleUpdateQuestion}
              onRegenerateQuestion={handleRegenerateQuestion}
            />
          </main>
        </div>
      </div>
    </>
  );
};

export default App;