const fetch = require("node-fetch");
const fs = require("fs");
let book = "pli-tv-bu-vb";
let type = "pc";
let maxRule = 92;
const bu = [
  ["pj", 4],
  ["ss", 13],
  ["ay", 2],
  ["np", 30],
  ["pc", 92],
  ["pd", 4],
  ["sk", 75],
];
const bi = [
  ["pj", 4],
  ["ss", 13],
  ["ay", 2],
  ["np", 12],
  ["pc", 96],
  ["pd", 4],
  ["sk", 75],
];

for (let x = 0; x < bu.length; x++) {
  for (let i = 1; i <= bu[x][1]; i++) buildSutta(book, bu[x][0], i);
}

function buildSutta(book, type, number) {
  let slug = `${book}/${book}-${type}/${book}-${type}${number}`;

  console.log(slug);
  const rootResponse = fetch(
    `https://raw.githubusercontent.com/suttacentral/bilara-data/published/root/pli/ms/vinaya/${slug}_root-pli-ms.json`
  )
    .then(response => response.json())
    .catch(error => {
      console.log("something went wrong");
    });

  const htmlResponse = fetch(
    `https://raw.githubusercontent.com/suttacentral/bilara-data/published/html/pli/ms/vinaya/${slug}_html.json`
  ).then(response => response.json());

  Promise.all([rootResponse, htmlResponse]).then(responses => {
    const [paliData, htmlData] = responses;
    let newPaliData = {};

    Object.keys(htmlData).forEach(segment => {
      if (paliData[segment] === undefined) {
        newPaliData[segment] = "";
      } else {
        newPaliData[segment] = paliData[segment];
      }
    });

    var dir = `./${book}/${book}-${type}`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(`./${dir}/${book}-${type}${number}.json`, JSON.stringify(newPaliData, null, 5));
  });
}
