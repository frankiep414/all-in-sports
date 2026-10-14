export async function POST() {
  return Response.json({ error: 'This registration endpoint has been retired. Please use /play-for-carmita.' }, { status: 410 });
}
