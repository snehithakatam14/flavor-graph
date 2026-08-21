import driver from '@/lib/db';

// GET /api/explore?ingredient=garlic
// 2-hop PAIRS_WITH chain — finds ingredients connected through one intermediate node
// Intentionally limits intermediate nodes first to keep query fast
export async function GET(request) {
  const name = new URL(request.url).searchParams.get('ingredient') ?? '';
  if (!name) return Response.json([]);

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (start:Ingredient {name: $name})-[:PAIRS_WITH]-(mid:Ingredient)
       WITH start, mid LIMIT 8
       MATCH (mid)-[:PAIRS_WITH]-(related:Ingredient)
       WHERE related.name <> start.name
       RETURN DISTINCT related.name AS name
       LIMIT 20`,
      { name }
    );
    return Response.json(
      result.records.map(r => ({ name: r.get('name'), hops: 2 }))
    );
  } catch (err) {
    console.error('Explore error:', err.message);
    return Response.json([]);
  } finally {
    await session.close();
  }
}

