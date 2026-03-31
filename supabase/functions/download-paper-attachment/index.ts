import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get attachment ID and PDF URL from request
    const { attachmentId, pdfUrl } = await req.json();

    if (!attachmentId || !pdfUrl) {
      return new Response(
        JSON.stringify({ error: "Attachment ID and PDF URL are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to this attachment
    const { data: attachment, error: attachmentError } = await supabaseClient
      .from("paper_attachments")
      .select("id, access_type, class_id")
      .eq("id", attachmentId)
      .single();

    if (attachmentError || !attachment) {
      return new Response(
        JSON.stringify({ error: "Attachment not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check access based on access_type
    if (attachment.access_type === 'class' && attachment.class_id) {
      const { data: enrollment } = await supabaseClient
        .from("class_enrollments")
        .select("id")
        .eq("class_id", attachment.class_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();
      
      if (!enrollment) {
        return new Response(
          JSON.stringify({ error: "Access denied - not enrolled in class" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (attachment.access_type === 'users') {
      const { data: userAccess } = await supabaseClient
        .from("paper_attachment_user_access")
        .select("id")
        .eq("attachment_id", attachmentId)
        .eq("user_id", user.id)
        .single();
      
      if (!userAccess) {
        return new Response(
          JSON.stringify({ error: "Access denied - not authorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    // 'free' access type allows everyone

    // Get user profile for watermark
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", user.id)
      .single();

    const userName = profile 
      ? `${profile.first_name} ${profile.last_name}` 
      : "Unknown";
    const userPhone = profile?.phone?.replace(/@phone\.alstudent\.com$/i, '') || "";

    // Fetch the original PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch PDF" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfBytes = await pdfResponse.arrayBuffer();
    
    // Load and modify PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const pages = pdfDoc.getPages();
    const watermarkText = `${userName} | ${userPhone}`;
    
    // Add watermarks to each page
    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = 10;
      const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
      
      // Bottom right watermark
      page.drawText(watermarkText, {
        x: width - textWidth - 20,
        y: 15,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.5,
      });

      // Top left watermark
      page.drawText(watermarkText, {
        x: 20,
        y: height - 25,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.5,
      });

      // Multiple diagonal watermarks across the page
      const centerFontSize = 18;
      const diagonalPositions = [
        { x: width * 0.2, y: height * 0.75 },
        { x: width * 0.5, y: height * 0.5 },
        { x: width * 0.8, y: height * 0.25 },
        { x: width * 0.3, y: height * 0.3 },
        { x: width * 0.7, y: height * 0.7 },
      ];

      for (const pos of diagonalPositions) {
        page.drawText(watermarkText, {
          x: pos.x - 50,
          y: pos.y,
          size: centerFontSize,
          font: helveticaFont,
          color: rgb(0.85, 0.85, 0.85),
          opacity: 0.12,
          rotate: { angle: 45, type: 'degrees' as const },
        });
      }
    }

    // Save modified PDF
    const modifiedPdfBytes = await pdfDoc.save();

    return new Response(modifiedPdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="review-material-${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
