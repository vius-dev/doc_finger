import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportPDFOptions {
    fileName: string;
    scale?: number;
}

export function useExportPDF() {
    const [exporting, setExporting] = useState(false);

    const exportPDF = async (element: HTMLElement | null, options: ExportPDFOptions) => {
        if (!element) return;

        setExporting(true);
        try {
            const canvas = await html2canvas(element, {
                scale: options.scale || 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`);
        } catch (err) {
            console.error('PDF generation failed', err);
            throw err;
        } finally {
            setExporting(false);
        }
    };

    return {
        exportPDF,
        exporting
    };
}
