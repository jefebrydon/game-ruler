"use client";

import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

// Set worker source - unpkg mirrors npm directly, ensuring version match
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export type SinglePagePDF = {
  pageNumber: number; // 1-based index
  pdfBlob: Blob; // Single-page PDF as blob
  pdfBase64: string; // Base64 for Gemini API
};

export type ParsedPDF = {
  pageCount: number;
  singlePages: SinglePagePDF[];
  thumbnailBlob: Blob;
};

/**
 * Parse a PDF file: split into single-page PDFs and generate a thumbnail.
 */
export async function parsePDF(file: File): Promise<ParsedPDF> {
  const arrayBuffer = await file.arrayBuffer();

  // Split PDF into single pages using pdf-lib
  const singlePages = await splitPDFIntoPages(arrayBuffer);

  // Generate thumbnail from first page using pdfjs (for rendering)
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const firstPage = await pdf.getPage(1);
  const thumbnailBlob = await renderPageToBlob(firstPage, 0.5);

  return {
    pageCount: singlePages.length,
    singlePages,
    thumbnailBlob,
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

/**
 * Render a PDF page to a PNG blob.
 */
async function renderPageToBlob(
  page: pdfjsLib.PDFPageProxy,
  scale: number
): Promise<Blob> {
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to get canvas context");
  }

  await page.render({
    canvasContext: context,
    viewport,
    canvas,
  }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      "image/png",
      0.9
    );
  });
}
