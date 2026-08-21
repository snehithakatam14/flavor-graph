require('dotenv').config({ path: '.env.local' });
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function test() {
  const session = driver.session();
  try {
    const result = await session.run('RETURN 1 AS test');
    console.log('Connected! Result:', result.records[0].get('test'));
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await session.close();
    await driver.close();
  }
}

test();