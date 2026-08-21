import driver from '@/lib/db';

// GET /api/recipes?ingredients=garlic,onion,tomato
// Finds recipes whose ingredients pair well with what you have (1-hop via PAIRS_WITH)
export async function GET(request) {
  const raw = new URL(request.url).searchParams.get('ingredients') ?? '';
  const myIngredients = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (myIngredients.length === 0)
    return Response.json([]);

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (have:Ingredient)-[:PAIRS_WITH]-(sub:Ingredient)
       WHERE have.name IN $myIngredients
       WITH sub LIMIT 20
       MATCH (sub)<-[:CONTAINS]-(r:Recipe)
       WITH r, collect(DISTINCT sub.name) AS matchedVia
       RETURN r.name AS name,
              r.cuisine AS cuisine,
              matchedVia,
              size(matchedVia) AS matchCount
       ORDER BY matchCount DESC
       LIMIT 12`,
      { myIngredients }
    );
    return Response.json(
      result.records.map(r => ({
        name: r.get('name'),
        cuisine: r.get('cuisine'),
        matchedVia: r.get('matchedVia'),
        matchCount: r.get('matchCount').toNumber ? r.get('matchCount').toNumber() : r.get('matchCount'),
      }))
    );
  } catch (err) {
    console.error('Recipes error:', err.message);
    return Response.json([]);
  } finally {
    await session.close();
  }
}

