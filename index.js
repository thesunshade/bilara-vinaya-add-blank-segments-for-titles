const fetch = require("node-fetch");
const fs = require("fs");
const language = "pli-tv";
const rules = require("./rules.json");
const branch = "unpublished";
const reportArray = [];

// The actual thing that does the work
let logIndex = 0;
const sections = Object.keys(rules); // [ 'bu-vb', 'bi-vb' ]
for (let b = 0; b < sections.length; b++) {
  // loop through sections
  const sectionKey = sections[b]; // 'bu-vb' etc
  const ruleClassArrayOfIDs = Object.keys(rules[sections[b]]); // ['pr','ss','ay' etc]

  for (let x = 0; x < ruleClassArrayOfIDs.length; x++) {
    const ruleNameId = ruleClassArrayOfIDs[x]; // 'pr' etc
    const ruleNumbersArray = rules[sectionKey][ruleNameId];
    for (let i = 0; i < ruleNumbersArray.length; i++) {
      const book = `${language}-${sectionKey}`;
      const type = ruleNameId;
      const number = ruleNumbersArray[i];
      buildSutta(book, type, number, logIndex);
      logIndex++;
    }
  }
}

setTimeout(() => {
  // console.log(reportArray);
  let report = "";
  for (let i = 0; i < reportArray.length; i++) {
    // console.log(reportArray[i]);
    report += reportArray[i] + "\n";
  }
  fs.writeFileSync(`./report-${branch}.txt`, report);
  fs.writeFileSync(`./reportArray.txt`, JSON.stringify(reportArray, null, 2));
}, 60000);

function buildSutta(book, type, number, logIndex) {
  let slug = "";
  if (type === "root") {
    slug = `${book}/${book}${number}`;
  } else {
    slug = `${book}/${book}-${type}/${book}-${type}${number}`;
  }

  // console.log(slug);

  const rootResponse = fetch(
    `https://raw.githubusercontent.com/suttacentral/bilara-data/${branch}/root/pli/ms/vinaya/${slug}_root-pli-ms.json`
  )
    .then(response => response.json())
    .catch(error => {
      console.log("something went wrong getting root");
      console.log(slug);
    });

  const htmlResponse = fetch(
    `https://raw.githubusercontent.com/suttacentral/bilara-data/${branch}/html/pli/ms/vinaya/${slug}_html.json`
  )
    .then(response => response.json())
    .catch(error => {
      console.log("something went wrong getting html");
      console.log(slug);
    });

  Promise.all([rootResponse, htmlResponse]).then(responses => {
    const [paliData, htmlData] = responses;
    let newPaliData = {};
    let replacementCount = 0;
    Object.keys(htmlData).forEach(segment => {
      if (paliData[segment] === undefined) {
        newPaliData[segment] = "";
        replacementCount++;
      } else {
        newPaliData[segment] = paliData[segment];
      }
    });
    reportArray[logIndex] = `${book}-${type != "root" ? type + "-" : ""}${number} segments added: ${replacementCount}`;
    // console.log(reportArray[logIndex]);
    let dir = "";
    if (type === "root") {
      dir = `./${branch}/vinaya/${book}`;
    } else {
      dir = `./${branch}/vinaya/${book}/${book}-${type}`;
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (type === "root") {
      fs.writeFileSync(`./${dir}/${book}${number}_root-pli-ms.json`, JSON.stringify(newPaliData, null, 2));
    } else {
      fs.writeFileSync(`./${dir}/${book}-${type}${number}_root-pli-ms.json`, JSON.stringify(newPaliData, null, 2));
    }
  });
}
