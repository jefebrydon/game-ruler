"use client";

import { PDFDocument } from "pdf-lib";

export type SinglePagePDF = {
  pageNumber: number; // 1-based index
  pdfBlob: Blob; // Single-page PDF as blob
  pdfBase64: string; // Base64 for Gemini API
};

export type ParsedPDF = {
  pageCount: number;
  singlePages: SinglePagePDF[];
};

/**
 * Parse a PDF file: split into single-page PDFs.
 */
export async function parsePDF(file: File): Promise<ParsedPDF> {
  const arrayBuffer = await file.arrayBuffer();

  // Split PDF into single pages using pdf-lib
  const singlePages = await splitPDFIntoPages(arrayBuffer);

  return {
    pageCount: singlePages.length,
    singlePages,
  };
}

/**
 * Split a multi-page PDF into individual single-page PDFs.
 * Returns an array with each page as a separate PDF blob + base64.
 */
async function splitPDFIntoPages(
  arrayBuffer: ArrayBuffer
): Promise<SinglePagePDF[]> {
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();

  const singlePages: SinglePagePDF[] = [];

  for (let i = 0; i < pageCount; i++) {
    // Create a new PDF with just this page
    const singlePageDoc = await PDFDocument.create();
    const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
    singlePageDoc.addPage(copiedPage);

    const pdfBytes = await singlePageDoc.save();
    const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });

    // Convert to base64 for Gemini API
    const pdfBase64 = await blobToBase64(pdfBlob);

    singlePages.push({
      pageNumber: i + 1, // 1-based
      pdfBlob,
      pdfBase64,
    });
  }

  return singlePages;
}

/**
 * Convert a Blob to base64 string (without data URL prefix).
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove data URL prefix to get raw base64
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
