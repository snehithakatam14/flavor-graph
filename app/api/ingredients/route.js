import driver from '@/lib/db';

// GET /api/ingredients?q=gar  → autocomplete list
export async function GET(request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (i:Ingredient)
       WHERE toLower(i.name) CONTAINS toLower($q)
       RETURN i.name AS name
       ORDER BY i.name
       LIMIT 20`,
      { q }
    );
    return Response.json(result.records.map(r => r.get('name')));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  } finally {
    await session.close();
  }
}
