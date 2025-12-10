import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

type UploadAssetsResponse = {
  thumbnailUrl: string;
  textCoordsUrl: string;
  pdfUrl: string;
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<UploadAssetsResponse>>> {
  try {
    const formData = await request.formData();
    const rulebookId = formData.get("rulebookId") as string;
    const thumbnail = formData.get("thumbnail") as File;
    const textCoordsJson = formData.get("textCoords") as string;

    if (!rulebookId || !thumbnail || !textCoordsJson) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Upload thumbnail
    const thumbnailPath = `thumbnails/${rulebookId}.png`;
    const thumbnailBuffer = await thumbnail.arrayBuffer();
    
    const { error: thumbnailError } = await supabase.storage
      .from("rulebooks")
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (thumbnailError) {
      console.error("Thumbnail upload error:", thumbnailError);
      return NextResponse.json(
        { error: "Failed to upload thumbnail" },
        { status: 500 }
      );
    }

    // Upload text_coords JSON
    const textCoordsPath = `text_coords/${rulebookId}.json`;
    const { error: textCoordsError } = await supabase.storage
      .from("rulebooks")
      .upload(textCoordsPath, textCoordsJson, {
        contentType: "application/json",
        upsert: true,
      });

    if (textCoordsError) {
      console.error("Text coords upload error:", textCoordsError);
      return NextResponse.json(
        { error: "Failed to upload text coordinates" },
        { status: 500 }
      );
    }

    // Get public URLs
    const { data: thumbnailUrlData } = supabase.storage
      .from("rulebooks")
      .getPublicUrl(thumbnailPath);

    const { data: textCoordsUrlData } = supabase.storage
      .from("rulebooks")
      .getPublicUrl(textCoordsPath);

    const { data: pdfUrlData } = supabase.storage
      .from("rulebooks")
      .getPublicUrl(`pdfs/${rulebookId}.pdf`);

    // Update rulebook record with URLs
    const { error: updateError } = await supabase
      .from("rulebooks")
      .update({
        thumbnail_url: thumbnailUrlData.publicUrl,
        pdf_url: pdfUrlData.publicUrl,
      })
      .eq("id", rulebookId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update rulebook record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        thumbnailUrl: thumbnailUrlData.publicUrl,
        textCoordsUrl: textCoordsUrlData.publicUrl,
        pdfUrl: pdfUrlData.publicUrl,
      },
    });
  } catch (err) {
    console.error("Upload assets error:", err);
    return NextResponse.json(
      { error: "Failed to upload assets" },
      { status: 500 }
    );
  }
}
