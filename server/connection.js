const eleasticsearch = require('elasticsearch');

// Core ES variables
const index = 'library';
const type = 'novel';
const port = 9200;
const host = process.env.ES_HOST || 'localhost';
const client = new eleasticsearch.Client({ host: { host, port } });

// check connection status
async function checkConnection() {
  let isConnected = false;
  while (!isConnected) {
    console.log('Connecting to ES');
    try {
      const health = await client.cluster.health({});
      console.log(health);
      isConnected = true;
    } catch (err) {
      console.log('Failed connection, retrying...', err);
    }
  }
}

async function resetIndex() {
  if (await client.indices.exists({ index })) {
    await client.indices.delete({ index });
  }

  await client.indicies.create({ index });
  await putBookMapping();
}

async function putBookMapping() {
  const schema = {
    title: { type: 'keyword' },
    author: { type: 'keyword' },
    location: { type: 'integer' },
    text: { type: 'text' }
  }

  return client.indicies.putMapping({ index, type, body: { properties: schema } });
}

module.exports = {
  client, index, type, checkConnection, resetIndex
};