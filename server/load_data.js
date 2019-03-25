const fs = require('fs');
const path = require('path');
const esConnection = require('./connection');

async function readAndInsertBooks() {
  try {
    // clear previous index
    await esConnection.resetIndex();

    let files = fs.readdirSync('./books').filter(file => file.slice(-4) === '.txt');
    console.log(files.length);

    // index each paragraph of each book 
    for (const file of files) {
      console.log(`Current file - ${file}`);
      const filePath = path.join('./books', file);
      const { title, author, paragraphs } = parseBookFile(filePath);
      await insertBookData(title, author, paragraphs);
    }
  } catch (err) {
    console.error(err);
  }
}

function parseBookFile(filePath) {
  const book = fs.readFileSync(filePath, 'utf8');

  const title = book.match(/^Title:\s(.+)$/m)[1];
  const authorMatch = book.match(/^Author:\s(.+)$/m);
  const author = (!authorMatch || authorMatch[1].trim() === '') ? 'Unknown Author' : authorMatch[1]

  console.log(`Reading Book - ${title} By ${author}`);

  const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m);
  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length;
  const endOfBookIndex = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m).index;

  // Clean book text and split into array of paragraphs
  const paragraphs = book
    .slice(startOfBookIndex, endOfBookIndex) // Remove Guttenberg header and footer
    .split(/\n\s+\n/g) // Split each paragraph into it's own array entry
    .map(line => line.replace(/\r\n/g, ' ').trim()) // Remove paragraph line breaks and whitespace
    .map(line => line.replace(/_/g, '')) // Guttenberg uses "_" to signify italics.  We'll remove it, since it makes the raw text look messy.
    .filter((line) => (line && line !== '')) // Remove empty lines

  console.log(`Parsed ${paragraphs.length} Paragraphs\n`);
  return { title, author, paragraphs };
}

async function insertBookData(title, author, paragraphs) {
  let bulkOps = []; // Array to store bulk operations

  // Add an index operation for each section in the book
  for (let i = 0; i < paragraphs.length; i++) {
    bulkOps.push({ index: { _index: esConnection.index, _type: esConnection.type } });

    bulkOps.push({
      author,
      title,
      location: i,
      text: paragraphs[i]
    });

    if (i > 0 && i % 500 === 0) {
      // Do bulk insert in 500 paragraph batches
      await esConnection.client.bulk({ body: bulkOps });
      bulkOps = [];
      console.log(`Indexed Paragraphs ${i - 499} - ${i}`);
    }
  }

  // Insert remainder of bulk ops array
  await esConnection.client.bulk({ body: bulkOps });
  console.log(`Indexed Paragraphs ${paragraphs.length - (bulkOps.length / 2)} - ${paragraphs.length}\n\n\n`);
}
readAndInsertBooks();