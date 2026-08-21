require('dotenv').config({ path: '.env.local' });
const neo4j = require('neo4j-driver');
const { readFileSync } = require('fs');
const { parse } = require('csv-parse/sync');
const { resolve } = require('path');

const DATA_DIR = resolve(__dirname, '../data');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

function loadCSV(filename) {
  const content = readFileSync(resolve(DATA_DIR, filename), 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

async function runBatches(session, rows, batchSize, cypher, label) {
  let done = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await session.run(cypher, { rows: batch });
    done += batch.length;
    process.stdout.write(`\r  ${label}: ${done}/${rows.length}`);
  }
  console.log(`\r  ${label}: ${done} rows loaded`);
}

async function seed() {
  const session = driver.session();

  try {
    // Create indexes
    console.log('Creating indexes...');
    await session.run('CREATE INDEX ingredient_name IF NOT EXISTS FOR (i:Ingredient) ON (i.name)');
    await session.run('CREATE INDEX recipe_id IF NOT EXISTS FOR (r:Recipe) ON (r.recipe_id)');
    console.log('Indexes ready.');

    // Ingredient nodes
    console.log('Loading ingredients...');
    const ingredients = loadCSV('ingredients.csv');
    await runBatches(session, ingredients, 500,
      `UNWIND $rows AS row MERGE (i:Ingredient {name: row.name})`,
      'Ingredients'
    );

    // Recipe nodes
    console.log('Loading recipes...');
    const recipes = loadCSV('recipes.csv');
    await runBatches(session, recipes, 500,
      `UNWIND $rows AS row
       MERGE (r:Recipe {recipe_id: row.recipe_id})
       SET r.name = row.name, r.cuisine = row.cuisine`,
      'Recipes'
    );

    // CONTAINS relationships
    console.log('Loading CONTAINS relationships (this may take a few minutes)...');
    const contains = loadCSV('contains.csv');
    await runBatches(session, contains, 500,
      `UNWIND $rows AS row
       MATCH (r:Recipe {recipe_id: row.recipe_id})
       MATCH (i:Ingredient {name: row.ingredient})
       MERGE (r)-[:CONTAINS]->(i)`,
      'CONTAINS'
    );

    // PAIRS_WITH relationships
    console.log('Loading PAIRS_WITH relationships...');
    const pairs = loadCSV('pairs.csv');
    await runBatches(session, pairs, 500,
      `UNWIND $rows AS row
       MATCH (a:Ingredient {name: row.ingredient_a})
       MATCH (b:Ingredient {name: row.ingredient_b})
       MERGE (a)-[:PAIRS_WITH {score: toFloat(row.score), shared_recipe_count: toInteger(row.shared_recipe_count)}]->(b)`,
      'PAIRS_WITH'
    );

    console.log('Seeding complete.');

  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

seed();
