import React, { useState, useRef, useEffect } from 'react';
import type { FormState, DifficultyRange } from '../types';
import { MagicWandIcon, UploadIcon, FileTextIcon, TrashIcon, PlusIcon, SpinnerIcon } from './icons';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js to enable PDF text extraction in the browser.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs';

interface InputFormProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
  isLoading: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ formState, setFormState, onSubmit, isLoading }) => {
  const [inputMode, setInputMode] = useState<'manual' | 'upload'>('manual');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const totalQuestions = formState.mcqCount + formState.essayCount;
  
  useEffect(() => {
    // This effect ensures the ranges are consistent with the total number of questions.
    // It intelligently adjusts, adds, or removes ranges to match the total.
    const lastRange = formState.difficultyRanges[formState.difficultyRanges.length - 1];
    if (!lastRange || lastRange.to !== totalQuestions) {
        setFormState(prev => {
            const newRanges = [...prev.difficultyRanges];
            let currentEnd = 0;
            const validRanges = [];

            for (const range of newRanges) {
                const from = currentEnd + 1;
                if (range.to < from) continue; // Skip invalid ranges
                if (from > totalQuestions) break; // Stop if we've exceeded the total

                const newTo = Math.min(range.to, totalQuestions);
                validRanges.push({ ...range, to: newTo });
                currentEnd = newTo;

                if (currentEnd === totalQuestions) break;
            }

            if (currentEnd < totalQuestions) {
                const lastValidRange = validRanges[validRanges.length - 1];
                if (lastValidRange) {
                    lastValidRange.to = totalQuestions;
                } else {
                    // If no valid ranges exist, create a new one covering the total
                    validRanges.push({ id: crypto.randomUUID(), to: totalQuestions, difficulty: 'sedang' });
                }
            }

            return { ...prev, difficultyRanges: validRanges };
        });
    }
}, [totalQuestions, formState.difficultyRanges, setFormState]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name === 'sourceMaterial') {
        setFormState(prevState => ({
            ...prevState,
            sourceFile: null,
            [name]: value
        }));
        setFileName(null);
    } else {
        setFormState(prevState => ({
          ...prevState,
          [name]: type === 'number' ? Math.max(0, parseInt(value, 10) || 0) : value,
        }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileProcessing(true);
    setFileName(file.name);

    try {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const base64Data = dataUrl.split(',')[1];
                setFormState(prevState => ({
                    ...prevState,
                    sourceMaterial: '',
                    sourceFile: { data: base64Data, mimeType: file.type }
                }));
                setIsFileProcessing(false);
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                        fullText += pageText + '\n';
                    }
                    setFormState(prevState => ({ ...prevState, sourceMaterial: fullText.trim(), sourceFile: null }));
                } catch (pdfError) {
                    console.error("Error processing PDF:", pdfError);
                    alert('Gagal memproses file PDF.');
                    handleClearFile();
                } finally {
                    setIsFileProcessing(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (file.type.startsWith('text/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                setFormState(prevState => ({ ...prevState, sourceMaterial: text, sourceFile: null }));
                setIsFileProcessing(false);
            };
            reader.readAsText(file);
        } else {
            alert('Tipe file tidak didukung. Silakan unggah file .txt, .pdf, atau gambar.');
            handleClearFile();
            setIsFileProcessing(false);
        }
    } catch (error) {
        console.error("File handling error:", error);
        alert('Terjadi kesalahan saat menangani file.');
        handleClearFile();
        setIsFileProcessing(false);
    }
  };

  const handleClearFile = () => {
    setFileName(null);
    setFormState(prevState => ({
      ...prevState,
      sourceMaterial: '',
      sourceFile: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddRange = () => {
      setFormState(prev => {
          const newRanges = [...prev.difficultyRanges];
          const lastRange = newRanges[newRanges.length - 1];
          const from = newRanges.length > 1 ? newRanges[newRanges.length - 2].to + 1 : 1;
          
          if (lastRange.to <= from) return prev; // Cannot split a range of 1

          const splitPoint = Math.floor(from + (lastRange.to - from) / 2);
          lastRange.to = splitPoint;

          newRanges.push({
              id: crypto.randomUUID(),
              to: totalQuestions,
              difficulty: lastRange.difficulty
          });

          return { ...prev, difficultyRanges: newRanges };
      });
  };

  const handleRemoveRange = (idToRemove: string) => {
      setFormState(prev => {
          if (prev.difficultyRanges.length <= 1) return prev;
          const newRanges = prev.difficultyRanges.filter(r => r.id !== idToRemove);
          // Adjust the 'to' of the new last range to cover the total
          if (newRanges.length > 0) {
              newRanges[newRanges.length - 1].to = totalQuestions;
          }
          return { ...prev, difficultyRanges: newRanges };
      });
  };
  
  const handleRangeChange = (id: string, field: 'to' | 'difficulty', value: any) => {
      setFormState(prev => {
          const newRanges = prev.difficultyRanges.map(r => r.id === id ? { ...r, [field]: value } : r);
          return { ...prev, difficultyRanges: newRanges };
      });
  };

  const difficultyOptions = [
    { id: 'mudah', label: 'Mudah' },
    { id: 'sedang', label: 'Sedang' },
    { id: 'sulit', label: 'Sulit' },
  ] as const;

  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-2xl border border-slate-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-300">Parameter Soal Ujian</h2>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        {/* Subject, Topic, Source Material inputs remain unchanged */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-1">Mata Pelajaran</label>
          <input type="text" name="subject" id="subject" value={formState.subject} onChange={handleChange} className="w-full bg-gray-700/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Contoh: Sejarah, Matematika"/>
        </div>
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-1">Topik Pelajaran</label>
          <input type="text" name="topic" id="topic" value={formState.topic} onChange={handleChange} className="w-full bg-gray-700/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Contoh: Proklamasi Kemerdekaan"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Sumber Materi (Opsional)</label>
          <div className="rounded-lg bg-gray-700/50 p-1 border border-gray-600 flex space-x-1">
            <button type="button" onClick={() => setInputMode('manual')} className={`w-full py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${inputMode === 'manual' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:bg-slate-700'}`}>Tulis Manual</button>
            <button type="button" onClick={() => setInputMode('upload')} className={`w-full py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${inputMode === 'upload' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:bg-slate-700'}`}>Unggah File</button>
          </div>
          {inputMode === 'manual' ? (
            <textarea name="sourceMaterial" id="sourceMaterial" rows={8} value={formState.sourceMaterial} onChange={handleChange} className="mt-2 w-full bg-gray-700/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Salin dan tempel teks di sini, atau biarkan kosong untuk soal umum." />
          ) : (
            <div className="mt-2">{!fileName ? (
                <div className="relative flex flex-col items-center justify-center w-full border-2 border-gray-600 border-dashed rounded-lg p-8 text-center hover:border-gray-500 transition-colors">
                  <UploadIcon /><span className="mt-2 block text-sm font-semibold text-gray-300">Unggah File</span><span className="mt-1 block text-xs text-gray-500">Mendukung .txt, .pdf, .jpg, .png, dll.</span>
                  <input ref={fileInputRef} type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".txt,text/plain,application/pdf,image/*" aria-label="File upload" disabled={isFileProcessing} />
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-700/50 border border-gray-600 rounded-md px-4 py-3 text-white">
                  <div className="flex items-center gap-3">
                    {isFileProcessing ? <SpinnerIcon /> : <FileTextIcon />}
                    <span className="text-sm font-medium">{fileName}</span>
                  </div>
                  <button type="button" onClick={handleClearFile} className="p-1.5 rounded-full text-gray-400 hover:bg-slate-600 hover:text-red-400 transition-colors" aria-label="Hapus file" disabled={isFileProcessing}><TrashIcon /></button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Question Count inputs remain unchanged */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="mcqCount" className="block text-sm font-medium text-gray-300 mb-1">Jumlah Soal Pilihan Ganda</label>
            <input type="number" name="mcqCount" id="mcqCount" value={formState.mcqCount} onChange={handleChange} min="0" className="w-full bg-gray-700/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
          </div>
          <div>
            <label htmlFor="essayCount" className="block text-sm font-medium text-gray-300 mb-1">Jumlah Soal Essay</label>
            <input type="number" name="essayCount" id="essayCount" value={formState.essayCount} onChange={handleChange} min="0" className="w-full bg-gray-700/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
          </div>
        </div>

        {/* Revamped Difficulty Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-300">Tingkat Kesulitan</label>
            {totalQuestions > 0 && formState.difficultyRanges[formState.difficultyRanges.length - 1]?.to === totalQuestions && (
                <button type="button" onClick={handleAddRange} className="flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors" disabled={isLoading}>
                    <PlusIcon /> Tambah
                </button>
            )}
          </div>
          <div className="space-y-2">
            {totalQuestions > 0 ? formState.difficultyRanges.map((range, index) => {
                const from = index === 0 ? 1 : formState.difficultyRanges[index - 1].to + 1;
                const isLast = index === formState.difficultyRanges.length - 1;
                const prevTo = index === 0 ? 0 : formState.difficultyRanges[index-1].to;

                return (
                    <div key={range.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <label className="text-xs text-gray-400">Rentang Soal</label>
                          <div className="flex items-center gap-2">
                            <input type="number" value={from} readOnly className="w-1/2 bg-gray-800/60 border border-gray-600 rounded-md px-3 py-2 text-center text-gray-400"/>
                            <span className="text-gray-400">-</span>
                            <input 
                              type="number" 
                              value={range.to}
                              readOnly={isLast}
                              min={from}
                              max={totalQuestions}
                              onChange={(e) => handleRangeChange(range.id, 'to', Math.min(Number(e.target.value), totalQuestions))}
                              className={`w-1/2 bg-gray-700/50 border border-gray-600 rounded-md px-3 py-2 text-white text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${isLast ? 'bg-gray-800/60 text-gray-400' : ''}`}
                            />
                          </div>
                        </div>
                        <div className="col-span-6">
                            <label className="text-xs text-gray-400">Kesulitan Soal</label>
                            <select 
                              value={range.difficulty}
                              onChange={(e) => handleRangeChange(range.id, 'difficulty', e.target.value)}
                              className="w-full bg-gray-700/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            >
                                {difficultyOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1 pt-5">
                            {!isLast && (
                                <button type="button" onClick={() => handleRemoveRange(range.id)} className="p-1.5 rounded-full text-gray-400 hover:bg-slate-600 hover:text-red-400 transition-colors" aria-label="Hapus rentang">
                                    <TrashIcon />
                                </button>
                            )}
                        </div>
                    </div>
                )
            }) : <p className="text-sm text-center text-gray-500 bg-gray-700/30 py-4 rounded-md">Atur jumlah soal untuk menentukan tingkat kesulitan.</p>}
          </div>
        </div>
       
        <button
          type="submit"
          disabled={isLoading || isFileProcessing}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold py-3 px-4 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
        >
          {isLoading ? 'Membuat Soal...' : isFileProcessing ? 'Memproses File...' : <><MagicWandIcon /> Buat Soal Ujian</>}
        </button>
      </form>
    </div>
  );
};