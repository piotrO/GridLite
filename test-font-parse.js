// test-font-parse.js
const cssContent =
  `
@font-face {
  font-family: 'TestFont';
  src: url('data:font/woff2;base64,` +
  "A".repeat(5 * 1024 * 1024) +
  `');
}

@font-face {
  font-family: 'OtherFont';
  src: url('data:font/woff2;base64,` +
  "B".repeat(5 * 1024 * 1024) +
  `');
}
`;

console.time("parse");
const fontData = {};
const blocks = cssContent.split("@font-face");

for (const block of blocks) {
  if (!block.trim()) continue;

  const familyMatch = block.match(/font-family:\s*['"]([^'"]+)['"]/);
  const srcMatch = block.match(
    /src:\s*url\(['"]data:[^;]+;base64,([^'"]+)['"]\)/,
  );

  if (familyMatch && familyMatch[1] && srcMatch && srcMatch[1]) {
    fontData[familyMatch[1]] = srcMatch[1];
  }
}
console.timeEnd("parse");
console.log("Fonts found:", Object.keys(fontData));
console.log("Length of TestFont:", fontData["TestFont"]?.length);
