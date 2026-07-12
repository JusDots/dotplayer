export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const ytEmbedUrl = `https://www.youtube.com/watch?v=${id}&autoplay=1`;
    return Response.json({
      url: ytEmbedUrl,
      mimeType: 'video/youtube',
      isEmbed: true,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}