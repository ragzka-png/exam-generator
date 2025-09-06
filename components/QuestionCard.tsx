import React, { useState, useEffect } from 'react';
import type { Question, MCQ, Essay } from '../types';
import { PencilIcon, RegenerateIcon, SaveIcon, CancelIcon, SpinnerIcon, MagicWandIcon } from './icons';

interface QuestionCardProps {
    question: Question;
    index: number;
    onUpdate: (question: Question) => void;
    onRegenerate: (question: Question, index: number) => Promise<void>;
}

const actionButtonClass = "p-1.5 rounded-full text-gray-400 hover:bg-slate-600 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500";

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, index, onUpdate, onRegenerate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [editedQuestion, setEditedQuestion] = useState<Question>(question);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setEditedQuestion(question);
    }, [question]);

    const handleRegenerateClick = async () => {
        setIsRegenerating(true);
        setError(null);
        try {
            await onRegenerate(question, index);
        } catch(err) {
            setError('Gagal meregenerasi soal. Coba lagi.');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleSave = () => {
        onUpdate(editedQuestion);
        setIsEditing(false);
    };
    
    const handleCancel = () => {
        setEditedQuestion(question);
        setIsEditing(false);
    };

    const handleQuestionTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedQuestion(prev => ({ ...prev, question: e.target.value }));
    };
    
    const handleAnswerTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (editedQuestion.type === 'essay') {
            setEditedQuestion(prev => ({ ...prev, answer: e.target.value }));
        }
    };

    const handleOptionChange = (optionIndex: number, value: string) => {
        if (editedQuestion.type === 'mcq') {
            const newOptions = [...editedQuestion.options];
            newOptions[optionIndex] = value;
            setEditedQuestion(prev => ({ ...prev, options: newOptions }) as MCQ);
        }
    };

    const handleCorrectAnswerChange = (newAnswer: string) => {
         if (editedQuestion.type === 'mcq') {
            setEditedQuestion(prev => ({ ...prev, answer: newAnswer }) as MCQ);
        }
    };

    const renderMCQDisplay = (q: MCQ) => (
        <ol className="list-[upper-alpha] list-outside ml-6 space-y-1 text-gray-300">
            {q.options.map((opt, i) => <li key={i}>{opt}</li>)}
        </ol>
    );

    const renderMCQEdit = (q: MCQ) => (
        <div className="space-y-3 mt-4">
            {q.options.map((opt, i) => {
                const optionLetter = String.fromCharCode(65 + i);
                return (
                    <div key={i} className="flex items-center gap-2">
                        <input
                            type="radio"
                            name={`correct-answer-${q.id}`}
                            id={`option-${q.id}-${i}`}
                            checked={q.answer === optionLetter}
                            onChange={() => handleCorrectAnswerChange(optionLetter)}
                            className="form-radio h-4 w-4 text-blue-500 bg-gray-600 border-gray-500 focus:ring-blue-500"
                        />
                         <label htmlFor={`option-${q.id}-${i}`} className="text-gray-200 font-semibold">{optionLetter}.</label>
                        <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(i, e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                );
            })}
        </div>
    );

    if (isEditing) {
        return (
            <div className="bg-slate-900/50 p-4 rounded-lg border border-blue-500 shadow-lg">
                <div className="flex items-start">
                    <span className="text-gray-200 font-bold mr-2">{index + 1}.</span>
                    <textarea 
                        value={editedQuestion.question}
                        onChange={handleQuestionTextChange}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-y"
                        rows={3}
                    />
                </div>
                {editedQuestion.type === 'mcq' && renderMCQEdit(editedQuestion)}
                {editedQuestion.type === 'essay' && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Panduan Jawaban</label>
                        <textarea
                            value={editedQuestion.answer}
                            onChange={handleAnswerTextChange}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-y"
                            rows={4}
                        />
                    </div>
                )}
                <div className="flex justify-end items-center gap-2 mt-4">
                    <button onClick={handleCancel} className={`${actionButtonClass} bg-slate-700`} aria-label="Batal"><CancelIcon /></button>
                    <button onClick={handleSave} className={`${actionButtonClass} bg-blue-600 text-white`} aria-label="Simpan"><SaveIcon /></button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 relative group">
            {isRegenerating && (
                <div className="absolute inset-0 bg-slate-800/80 flex flex-col items-center justify-center rounded-lg z-10 transition-opacity">
                    <SpinnerIcon />
                    <span className="mt-2 text-sm text-gray-300">Meregenerasi...</span>
                </div>
            )}
            <div className={`transition-opacity ${isRegenerating ? 'opacity-20' : 'opacity-100'}`}>
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow">
                        <div className="flex items-start">
                            <span className="text-gray-200 font-bold mr-2">{index + 1}.</span>
                            <p className="text-gray-200">{question.question}</p>
                        </div>
                        {question.type === 'mcq' && <div className="mt-2">{renderMCQDisplay(question)}</div>}
                    </div>
                    <div className="flex-shrink-0 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsEditing(true)} className={actionButtonClass} aria-label="Edit Manual"><PencilIcon /></button>
                        <button onClick={handleRegenerateClick} className={actionButtonClass} aria-label="Generate Ulang Soal"><MagicWandIcon /></button>
                    </div>
                </div>
                 {error && <p className="text-xs text-red-400 text-right mt-2">{error}</p>}
            </div>
        </div>
    );
};
