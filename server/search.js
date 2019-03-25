const { client, index, type } = require('./connection');

module.exports = {
  // query es index for the provided term 
  queryTerm(term, offset = 0) {
    const body = {
      // from allows pagination - each query returns 10 by default, so from: 10 would let us get results 10-20
      from: offset,
      query: {
        match: {
          text: {
            query: term,
            operator: 'and',
            fuzziness: 'auto'
          }
        }
      },
      highlight: { fields: { text: {} } }
    }
    return client.search({ index, type, body });
  }
}