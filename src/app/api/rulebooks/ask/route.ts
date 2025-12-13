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

const SYSTEM_PROMPT = `You must answer only by extracting exact, verbatim quotes from the provided files. Do not paraphrase, interpret, summarize, or explain.

If no exact quote answers the question, respond exactly with:
"I couldn’t find this in the rulebook."

If a quote is found, return it in the following format and do not deviate:

"<Exact quote>" – see the '[Section Name]' section

The quoted text must match the document character-for-character.`;

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

    // Extract file IDs from annotations in the output
    const fileIds = new Set<string>();
    for (const item of response.output) {
      if (item.type === "message") {
        for (const content of item.content) {
          if (content.type === "output_text" && content.annotations) {
            for (const annotation of content.annotations) {
              if (annotation.type === "file_citation" && annotation.file_id) {
                fileIds.add(annotation.file_id);
              }
            }
          }
        }
      }
    }

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
