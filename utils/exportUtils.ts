import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import saveAs from 'file-saver';
import type { ExamData } from '../types';

export const exportToPdf = (examData: ExamData, fileName: string) => {
    try {
        const doc = new jsPDF();
        const { mcqs, essays } = examData;

        let y = 20; // Y position tracker

        // Header
        doc.setFont("times", "normal");
        doc.setFontSize(14);
        doc.text("Nama: ................................................", 15, y);
        y += 10;
        doc.text("Kelas: ................................................", 15, y);
        y += 10;
        doc.text("Tanggal: .............................................", 15, y);
        y += 15;

        const checkY = (increment = 10) => {
            if (y + increment > 280) {
                doc.addPage();
                y = 20;
            }
        };

        if (mcqs.length > 0) {
            doc.setFont("times", "bold");
            doc.setFontSize(16);
            doc.text("SOAL PILIHAN GANDA", 15, y);
            y += 10;
            doc.setFont("times", "normal");
            doc.setFontSize(14);

            mcqs.forEach((mcq, index) => {
                checkY(40); // Estimate space needed for a question
                const questionText = doc.splitTextToSize(`${index + 1}. ${mcq.question}`, 180);
                doc.text(questionText, 15, y);
                y += questionText.length * 6;

                mcq.options.forEach((option, optIndex) => {
                    const optionLetter = String.fromCharCode(65 + optIndex);
                    const optionText = doc.splitTextToSize(`${optionLetter}. ${option}`, 170);
                    checkY(optionText.length * 6);
                    doc.text(optionText, 20, y);
                    y += optionText.length * 6;
                });
                y += 5; // Spacer
            });
        }

        if (essays.length > 0) {
            checkY(20);
            y += 10;
            doc.setFont("times", "bold");
            doc.setFontSize(16);
            doc.text("SOAL ESSAY", 15, y);
            y += 10;
            doc.setFont("times", "normal");
            doc.setFontSize(14);

            essays.forEach((essay, index) => {
                checkY(25);
                const questionText = doc.splitTextToSize(`${index + 1 + mcqs.length}. ${essay.question}`, 180);
                doc.text(questionText, 15, y);
                y += questionText.length * 6 + 10;
            });
        }

        // Answer Key
        doc.addPage();
        y = 20;
        doc.setFont("times", "bold");
        doc.setFontSize(18);
        doc.text("KUNCI JAWABAN", 105, y, { align: 'center' });
        y += 15;

        if (mcqs.length > 0) {
            doc.setFont("times", "bold");
            doc.setFontSize(16);
            doc.text("Pilihan Ganda", 15, y);
            y += 5;

            autoTable(doc, {
                startY: y,
                head: [['No.', 'Jawaban']],
                body: mcqs.map((mcq, index) => [index + 1, mcq.answer]),
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], font: 'times', fontStyle: 'bold', fontSize: 14 },
                styles: { font: 'times', fontSize: 14 }
            });
            y = (doc as any).lastAutoTable.finalY + 15;
        }

        if (essays.length > 0) {
            checkY(20);
            doc.setFont("times", "bold");
            doc.setFontSize(16);
            doc.text("Essay", 15, y);
            y += 10;
            doc.setFont("times", "normal");
            doc.setFontSize(14);

            essays.forEach((essay, index) => {
                checkY(25);
                const answerText = doc.splitTextToSize(`${index + 1 + mcqs.length}. ${essay.answer}`, 180);
                doc.text(answerText, 15, y);
                y += answerText.length * 6 + 5; // Spacer
            });
        }

        saveAs(new Blob([doc.output("blob")], { type: "application/pdf" }), `${fileName}.pdf`);
    } catch (error) {
        console.error("Failed to export to PDF:", error);
        alert("Gagal mengekspor ke PDF. Silakan periksa konsol untuk detailnya.");
    }
};