import driver from '@/lib/db';

// GET /api/pairings?ingredient=garlic
// Returns direct 1-hop pairings ordered by score
export async function GET(request) {
  const name = new URL(request.url).searchParams.get('ingredient') ?? '';
  if (!name) return Response.json({ error: 'ingredient param required' }, { status: 400 });

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (i:Ingredient {name: $name})-[p:PAIRS_WITH]-(other:Ingredient)
       RETURN other.name AS name,
              round(p.score * 1000) / 1000 AS score,
              p.shared_recipe_count AS count
       ORDER BY p.score DESC
       LIMIT 15`,
      { name }
    );
    return Response.json(
      result.records.map(r => ({
        name: r.get('name'),
        score: r.get('score'),
        count: r.get('count').toNumber ? r.get('count').toNumber() : r.get('count'),
      }))
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  } finally {
    await session.close();
  }
}
