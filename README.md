# Flavor Graph

Ingredient pairing explorer built on top of CognoDB. Finds flavor connections across 39k recipes using graph traversal.

**Demo:** https://flavor-graph-tau.vercel.app

---

## What it does

Type any ingredient, get back what it pairs well with — ranked by how often they appear together across recipes. You can also explore second-degree connections (ingredients that pair through a shared intermediate) and find recipes based on what you have at home.

---

## Why a graph database

The interesting query here is not the direct pairings — it is finding ingredients that have never appeared in the same recipe but are still culinarily related through a chain:

`
garlic -> ginger -> lemongrass
`

Garlic and lemongrass share no recipes. But both pair strongly with ginger, which makes them indirectly compatible. Expressing this as a SQL query means two self-joins on the pairs table plus deduplication. In Cypher it is just:

`cypher
MATCH (a:Ingredient {name: })-[:PAIRS_WITH]-(mid)-[:PAIRS_WITH]-(b)
WHERE b.name <> a.name
RETURN DISTINCT b.name
LIMIT 20
`

That is the core reason this project uses a graph database.

---

## Data model

Nodes: Ingredient, Recipe

Relationships:
- PAIRS_WITH (Ingredient to Ingredient) — score based on co-occurrence: count / sqrt(freq_a * freq_b)
- CONTAINS (Recipe to Ingredient)

3,034 ingredients, 39,774 recipes, 113,633 pair edges, 421,609 containment edges.

---

## Queries

All parameterized, no string interpolation.

Direct pairings:
`cypher
MATCH (i:Ingredient {name: })-[p:PAIRS_WITH]-(other)
RETURN other.name, p.score, p.shared_recipe_count
ORDER BY p.score DESC LIMIT 15
`

2-hop chain:
`cypher
MATCH (a:Ingredient {name: })-[:PAIRS_WITH]-(mid)
WITH a, mid LIMIT 8
MATCH (mid)-[:PAIRS_WITH]-(b)
WHERE b.name <> a.name
RETURN DISTINCT b.name LIMIT 20
`

Recipe suggestions:
`cypher
MATCH (have:Ingredient)-[:PAIRS_WITH]-(sub)<-[:CONTAINS]-(r:Recipe)
WHERE have.name IN 
WITH r, collect(DISTINCT sub.name) AS via
RETURN r.name, r.cuisine, via, size(via) AS score
ORDER BY score DESC LIMIT 12
`

---

## Setup

Requires Node 18+, Python 3.9+, and a CognoDB instance.

`ash
git clone https://github.com/snehithakatam14/flavor-graph.git
cd flavor-graph
npm install
`

Add a .env.local:
`
NEO4J_URI=bolt+s://...
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=...
`

Download train.json from the Kaggle Recipe Ingredients Dataset and put it in data/.

`ash
python scripts/process_data.py
node scripts/seed.js
npm run dev
`

---

## Stack

Next.js 16, Tailwind CSS, neo4j-driver, CognoDB, Vercel, Python (data pipeline)
