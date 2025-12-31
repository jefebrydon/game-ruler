import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini/client";
import { buildPromptForPage } from "@/lib/gemini/prompt";
import type { ApiResponse } from "@/types";

type ProcessPageRequest = {
  pageNumber: number; // 1-based page index
  pdfBase64: string; // Single-page PDF as base64
};

type ProcessPageResponse = {
  pageNumber: number;
  processedText: string;
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ProcessPageResponse>>> {
  try {
    const body: ProcessPageRequest = await request.json();
    const { pageNumber, pdfBase64 } = body;

    if (!pageNumber || !pdfBase64) {
      return NextResponse.json(
        { error: "pageNumber and pdfBase64 are required" },
        { status: 400 }
      );
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = buildPromptForPage(pageNumber);

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const processedText = response.text();

    // Log Gemini output for debugging
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📄 PAGE ${pageNumber} - Gemini Processed Output`);
    console.log(`${"=".repeat(80)}`);
    console.log(processedText);
    console.log(`${"=".repeat(80)}\n`);

    return NextResponse.json({
      data: {
        pageNumber,
        processedText,
      },
    });
  } catch (err) {
    console.error("Process page error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process page" },
      { status: 500 }
    );
  }
}



