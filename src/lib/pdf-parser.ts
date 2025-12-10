"use client";

import * as pdfjsLib from "pdfjs-dist";
import type { TextItem as PdfTextItem } from "pdfjs-dist/types/src/display/api";
import type { RulebookTextCoords, PageTextCoords, TextItem } from "@/types";

// Set worker source - unpkg mirrors npm directly, ensuring version match
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export type ParsedPDF = {
  pageCount: number;
  textCoords: RulebookTextCoords;
  thumbnailBlob: Blob;
};

/**
 * Parse a PDF file to extract text content with coordinates and generate a thumbnail.
 */
export async function parsePDF(file: File): Promise<ParsedPDF> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: PageTextCoords[] = [];
  let thumbnailBlob: Blob | null = null;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    // Extract text items with positions
    const items: TextItem[] = [];
    let fullText = "";

    for (const item of textContent.items) {
      // Type guard for text items (not marked content)
      if (!("str" in item)) continue;
      const textItem = item as PdfTextItem;

      if (textItem.str) {
        // Transform coordinates from PDF space
        const [, , , , tx, ty] = textItem.transform;
        
        items.push({
          text: textItem.str,
          x: tx,
          y: viewport.height - ty, // Flip Y coordinate
          width: textItem.width,
          height: textItem.height,
        });
        
        fullText += textItem.str + " ";
      }
    }

    pages.push({
      pageNumber: pageNum,
      fullText: fullText.trim(),
      items,
    });

    // Generate thumbnail from first page
    if (pageNum === 1) {
      thumbnailBlob = await renderPageToBlob(page, 0.5); // 50% scale for thumbnail
    }
  }

  if (!thumbnailBlob) {
    throw new Error("Failed to generate thumbnail");
  }

  return {
    pageCount: pdf.numPages,
    textCoords: { pages },
    thumbnailBlob,
  };
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
