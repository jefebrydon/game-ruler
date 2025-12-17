import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";
import type { ApiResponse } from "@/types";

type AskRequest = {
  rulebookId: string;
  question: string;
};

type Citation = {
  pageNumber: number;
  fileId: string;
};

type AskResponse = {
  answer: string;
  citations: Citation[];
};

const SYSTEM_PROMPT = `You are a board game rules assistant. Answer using ONLY the provided rulebook files.

Instructions:
- Always use exact quotes as your main answer. 
- When it makes sense, you may include a brief summary (1 sentence max), and/or a yes/no answer, before the quoted passage.
- Keep quotes as short as possible while fully answering the question.
- After each quoted passage, add: — from the section "SECTION NAME".
- Use the section name exactly as it appears in the file.
- Every answer MUST include at least one file citation.
- If the answer cannot be found, say: "I couldn't find this in the rulebook."

Cite the source file for every quoted passage.`;

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AskResponse>>> {
  try {
    const body: AskRequest = await request.json();
    const { rulebookId, question } = body;

    // Validate input
    if (!rulebookId || !question?.trim()) {
      return NextResponse.json(
        { error: "rulebookId and question are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const openai = getOpenAIClient();

    // Fetch rulebook to get vector store ID
    const { data: rulebook, error: fetchError } = await supabase
      .from("rulebooks")
      .select("id, title, openai_vector_store_id, status")
      .eq("id", rulebookId)
      .single();

    if (fetchError || !rulebook) {
      return NextResponse.json(
        { error: "Rulebook not found" },
        { status: 404 }
      );
    }

    if (rulebook.status !== "ready") {
      return NextResponse.json(
        { error: "Rulebook is not ready for queries" },
        { status: 400 }
      );
    }

    if (!rulebook.openai_vector_store_id) {
      return NextResponse.json(
        { error: "Rulebook has no vector store" },
        { status: 400 }
      );
    }

    // Call OpenAI Responses API with file_search
    const response = await openai.responses.create({
      model: "gpt-5.1",
      input: question,
      instructions: SYSTEM_PROMPT,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [rulebook.openai_vector_store_id],
        },
      ],
    });

    // Extract the text output
    const answerText = response.output_text;
    if (!answerText) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Debug: Log full response structure
    console.log("[Ask API] response.output:", JSON.stringify(response.output, null, 2));

    // Extract file IDs from annotations only (NOT from file_search_call.results)
    const fileIds = new Set<string>();
    
    for (const item of response.output) {
      // Extract from message annotations - this is where file_citation entries appear
      if (item.type === "message") {
        for (const content of item.content) {
          if (content.type === "output_text" && content.annotations) {
            console.log("[Ask API] Found annotations:", content.annotations.length);
            for (const annotation of content.annotations) {
              if (annotation.type === "file_citation" && annotation.file_id) {
                fileIds.add(annotation.file_id);
              }
            }
          }
        }
      }
    }
    
    console.log("[Ask API] Extracted fileIds from annotations:", Array.from(fileIds));

    // Resolve file IDs to page numbers
    const citations: Citation[] = [];
    if (fileIds.size > 0) {
      const { data: pages } = await supabase
        .from("rulebook_pages")
        .select("page_number, openai_file_id")
        .eq("rulebook_id", rulebookId)
        .in("openai_file_id", Array.from(fileIds));

      if (pages) {
        for (const page of pages) {
          citations.push({
            pageNumber: page.page_number,
            fileId: page.openai_file_id,
          });
        }
      }
    }

    // Sort citations by page number
    citations.sort((a, b) => a.pageNumber - b.pageNumber);

    return NextResponse.json({
      data: {
        answer: answerText,
        citations,
      },
    });
  } catch (err) {
    console.error("Ask error:", err);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
