const fetch = require("node-fetch");
const fs = require("fs");
const language = "pli-tv";
const rules = require("./rules.json");
const branch = "published";
const reportArray = [];

// The actual thing that does the work
let logIndex = 1;
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
  fs.writeFileSync(`./book-report-${branch}.txt`, report);
  fs.writeFileSync(`./book-reportArray.txt`, JSON.stringify(reportArray, null, 2));
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

  const translationResponse = fetch(
    `https://raw.githubusercontent.com/suttacentral/bilara-data/${branch}/translation/en/brahmali/vinaya/${slug}_translation-en-brahmali.json`
  )
    .then(response => response.json())
    .catch(error => {
      console.log("something went wrong getting translation");
      console.log(slug);
    });

  Promise.all([rootResponse, htmlResponse, translationResponse]).then(responses => {
    let [paliData, htmlData, translationData] = responses;
    let chapterHTML = `<?xml version="1.0" encoding="utf-8"?>
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
    <head>
      <title>${type}</title>
    </head>
    <body>`;
    Object.keys(htmlData).forEach(segment => {
      if (paliData[segment] === undefined) {
        paliData[segment] = "";
      }
      if (translationData[segment] === undefined) {
        translationData[segment] = "";
      }
      let [openHtml, closeHtml] = htmlData[segment].split(/{}/);
      chapterHTML += `${openHtml}<span class="segment" id ="${segment}"><span class="pli-lang" lang="pi">${paliData[segment]}</span><span class="eng-lang" lang="en">${translationData[segment]}</span></span>${closeHtml}\n\n`;
    });

    reportArray[logIndex] = `${book}-${type != "root" ? type + "-" : ""}${number}`;
    // console.log(reportArray[logIndex]);

    chapterHTML += `</body>
    </html>`;

    let dir = "text";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    let leadingNumber = ("000" + logIndex).slice(-4);

    if (type === "root") {
      fs.writeFileSync(`./${dir}/${leadingNumber}-${book}${number}.xhtml`, chapterHTML);
    } else {
      fs.writeFileSync(`./${dir}/${leadingNumber}-${book}-${type}${number}.xhtml`, chapterHTML);
    }
  });
}
