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

readAndInsertBooks();