import { GoogleGenAI, Type } from "@google/genai";
import type { FormState, ExamData, Question, MCQ, Essay } from '../types';

const getDifficultyInstruction = (difficulty: 'mudah' | 'sedang' | 'sulit'): string => {
  switch (difficulty) {
    case 'mudah': return 'Fokus pada pertanyaan yang menguji ingatan akan fakta-fakta yang secara eksplisit disebutkan dalam teks.';
    case 'sedang': return 'Buat pertanyaan yang membutuhkan pemahaman dan kemampuan untuk menyimpulkan informasi dari teks.';
    case 'sulit': return 'Buat pertanyaan yang membutuhkan analisis, sintesis, atau evaluasi. Jawaban mungkin tidak ditemukan secara langsung dalam teks dan memerlukan pemikiran kritis yang mendalam.';
    default: return '';
  }
};

const buildPrompt = (formState: FormState): { prompt: string, schema: any } => {
  const { subject, topic, sourceMaterial, mcqCount, essayCount, difficultyRanges } = formState;
  const totalQuestions = mcqCount + essayCount;

  const difficultyDistribution = difficultyRanges.map((range, index) => {
    const from = index === 0 ? 1 : difficultyRanges[index - 1].to + 1;
    const capitalizedDifficulty = range.difficulty.charAt(0).toUpperCase() + range.difficulty.slice(1);
    return `- Soal nomor ${from} sampai ${range.to}: Tingkat Kesulitan **${capitalizedDifficulty}**. (${getDifficultyInstruction(range.difficulty)})`;
  }).join('\n');

  const hasSourceMaterial = sourceMaterial && sourceMaterial.trim() !== '';
  const hasSubject = subject && subject.trim() !== '';
  const hasTopic = topic && topic.trim() !== '';

  let promptCore = '';
  let mainInstruction = '';

  if (hasSubject && hasTopic && hasSourceMaterial) {
    promptCore = `Anda adalah seorang ahli pembuat soal ujian yang sangat kreatif dan teliti. Tugas Anda adalah membuat soal ujian yang menggabungkan tiga elemen: Mata Pelajaran, Topik Pelajaran, dan Konteks/Tema dari Sumber Materi, lalu mengembalikan hasilnya dalam format JSON yang valid.`;
    mainInstruction = `
**Mata Pelajaran:** ${subject}
**Topik Pelajaran:** ${topic}
**Konteks/Tema dari Sumber Materi:**
---
${sourceMaterial}
---

**Instruksi Penting:**
Buatlah total ${totalQuestions} soal (${mcqCount} soal pilihan ganda dan ${essayCount} soal essay).
Soal-soal ini harus menguji pemahaman tentang **"${topic}"** dalam mata pelajaran **"${subject}"**.
Gunakan informasi, karakter, atau skenario dari **Sumber Materi** sebagai latar belakang cerita atau konteks untuk setiap soal.
**JANGAN** hanya menanyakan fakta dari Sumber Materi. Gunakan Sumber Materi sebagai **INSPIRASI** untuk membuat soal yang relevan dengan Mata Pelajaran dan Topik.
`;
  } else {
    promptCore = `Anda adalah seorang ahli pembuat soal ujian yang sangat teliti. Tugas Anda adalah membuat soal ujian berdasarkan informasi yang diberikan dan mengembalikan hasilnya dalam format JSON yang valid.`;
    mainInstruction = `
**Mata Pelajaran:** ${subject}
**Topik Pelajaran:** ${topic}
`;
    if (hasSourceMaterial) {
      mainInstruction += `
**Sumber Materi:**
---
${sourceMaterial}
---

Buatlah total ${totalQuestions} soal (${mcqCount} soal pilihan ganda dan ${essayCount} soal essay) berdasarkan materi di atas.
`;
    } else {
      mainInstruction += `
Buatlah total ${totalQuestions} soal (${mcqCount} soal pilihan ganda dan ${essayCount} soal essay) tentang topik ini secara umum. Karena tidak ada materi sumber yang disediakan, hasilkan pertanyaan berdasarkan pengetahuan umum Anda tentang topik tersebut.
`;
    }
  }

  const prompt = `
${promptCore}

${mainInstruction}

**Distribusi Tingkat Kesulitan:**
${difficultyDistribution}

Urutan soal harus ${mcqCount} soal pilihan ganda terlebih dahulu, baru kemudian ${essayCount} soal essay.

**Aturan Output:**
- Kembalikan sebuah objek JSON tunggal yang valid dan sesuai dengan skema yang diberikan.
- Jangan sertakan teks atau format markdown lain di luar objek JSON.
- Untuk soal pilihan ganda, sediakan 5 opsi dan jawaban yang benar harus berupa huruf (A, B, C, D, atau E).
`;

  const mcqSchema = {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING, description: "Teks pertanyaan pilihan ganda." },
      options: {
        type: Type.ARRAY,
        description: "Sebuah array berisi 5 string opsi jawaban.",
        items: { type: Type.STRING }
      },
      answer: {
        type: Type.STRING,
        description: "Huruf jawaban yang benar (A, B, C, D, atau E)."
      }
    },
    required: ["question", "options", "answer"]
  };

  const essaySchema = {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING, description: "Teks pertanyaan essay." },
      answer: { type: Type.STRING, description: "Panduan atau poin-poin kunci untuk jawaban yang diharapkan." }
    },
    required: ["question", "answer"]
  };

  const schema = {
    type: Type.OBJECT,
    properties: {
      mcqs: {
        type: Type.ARRAY,
        description: `Array berisi ${mcqCount} soal pilihan ganda. Jika mcqCount adalah 0, ini harus menjadi array kosong.`,
        items: mcqSchema
      },
      essays: {
        type: Type.ARRAY,
        description: `Array berisi ${essayCount} soal essay. Jika essayCount adalah 0, ini harus menjadi array kosong.`,
        items: essaySchema
      }
    },
     required: ["mcqs", "essays"]
  };

  return { prompt, schema };
};


export const generateExamQuestions = async (formState: FormState): Promise<ExamData> => {
  if (!process.env.API_KEY) {
    throw new Error("API key is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { prompt, schema } = buildPrompt(formState);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });
    
    if (response && response.text) {
        const jsonResponse = JSON.parse(response.text);
        const examData: ExamData = {
            mcqs: (jsonResponse.mcqs || []).map((q: Omit<MCQ, 'id' | 'type'>) => ({ ...q, id: crypto.randomUUID(), type: 'mcq' })),
            essays: (jsonResponse.essays || []).map((q: Omit<Essay, 'id' | 'type'>) => ({ ...q, id: crypto.randomUUID(), type: 'essay' })),
        };
        return examData;
    } else {
        throw new Error("Menerima respons kosong dari API.");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Gagal mem-parsing respons JSON dari AI. Coba kurangi kompleksitas materi.");
    }
    throw new Error("Gagal berkomunikasi dengan layanan AI. Silakan coba lagi nanti.");
  }
};


export const regenerateSingleQuestion = async (
  formState: FormState,
  questionToReplace: Question,
  questionNumber: number
): Promise<Question> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { subject, topic, sourceMaterial, difficultyRanges } = formState;
    
    let questionDifficulty: 'mudah' | 'sedang' | 'sulit' = 'sedang';
    let currentFrom = 1;
    for (const range of difficultyRanges) {
        if (questionNumber >= currentFrom && questionNumber <= range.to) {
            questionDifficulty = range.difficulty;
            break;
        }
        currentFrom = range.to + 1;
    }


    const isMCQ = questionToReplace.type === 'mcq';
    
    const hasSourceMaterial = sourceMaterial && sourceMaterial.trim() !== '';
    const hasSubject = subject && subject.trim() !== '';
    const hasTopic = topic && topic.trim() !== '';

    let mainInstruction = '';

    if (hasSubject && hasTopic && hasSourceMaterial) {
        mainInstruction = `
Berdasarkan informasi berikut:
- **Mata Pelajaran:** "${subject}"
- **Topik Pelajaran:** "${topic}"
- **Konteks/Tema dari Sumber Materi:** ${sourceMaterial}

Buatlah satu soal ${isMCQ ? 'pilihan ganda' : 'essay'} yang baru dan kreatif. Soal ini harus menguji pemahaman tentang topik dalam mata pelajaran yang diberikan, tetapi gunakan konteks dari sumber materi sebagai tema.`;
    } else {
        mainInstruction = `
Berdasarkan materi sumber yang diberikan tentang "${topic}" dalam mata pelajaran "${subject}", buatlah satu soal ${isMCQ ? 'pilihan ganda' : 'essay'} yang baru.

**Materi Sumber:**
${sourceMaterial || 'Tidak ada materi sumber spesifik, gunakan pengetahuan umum tentang topik.'}`;
    }


    const mcqSchema = {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "Teks pertanyaan pilihan ganda." },
          options: { type: Type.ARRAY, description: "Array berisi 5 string opsi jawaban.", items: { type: Type.STRING } },
          answer: { type: Type.STRING, description: "Huruf jawaban yang benar (A, B, C, D, atau E)." }
        },
        required: ["question", "options", "answer"]
      };
    
    const essaySchema = {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "Teks pertanyaan essay." },
          answer: { type: Type.STRING, description: "Panduan jawaban." }
        },
        required: ["question", "answer"]
    };

    const schema = isMCQ ? mcqSchema : essaySchema;

    const prompt = `
Anda adalah seorang ahli pembuat soal ujian.
${mainInstruction}

**Tingkat Kesulitan:** ${questionDifficulty} (${getDifficultyInstruction(questionDifficulty)})

**PENTING:** Soal yang baru HARUS BERBEDA dari soal yang sudah ada ini:
"${questionToReplace.question}"

**Aturan Output:**
- Kembalikan sebuah objek JSON tunggal yang valid dan sesuai dengan skema yang diberikan.
- Jangan sertakan teks atau format markdown lain di luar objek JSON.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
    });

    if (response && response.text) {
        const newQuestionData = JSON.parse(response.text);
        const newQuestion: Question = {
            ...newQuestionData,
            id: questionToReplace.id, // Keep ID for easy replacement
            type: questionToReplace.type,
        };
        return newQuestion;
    } else {
         throw new Error("Menerima respons kosong dari API saat regenerasi.");
    }
  } catch (error) {
     console.error("Error regenerating question:", error);
     throw new Error("Gagal meregenerasi soal.");
  }
};