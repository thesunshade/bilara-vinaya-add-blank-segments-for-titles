const fetch = require("node-fetch");
const fs = require("fs");
const language = "pli-tv";
const rules = require("./rules-build-book.json");
// const { table } = require("console");
const branch = "unpublished-vinaya-corrections-additions-BKh/"; // should end with slash
const reportArray = []; // only needed when making reports
let dir = "text";
const githubLocation = `https://raw.githubusercontent.com/thesunshade/bilara-data/${branch}`;

// remove files if they exist
fs.rmSync(dir, { recursive: true, force: true });

// The actual thing that does the work
let logIndex = 1;
const sections = Object.keys(rules); // [ 'bu-vb', 'bi-vb' ]
for (let b = 0; b < sections.length; b++) {
  // loop through sections
  const sectionKey = sections[b]; // 'bu-vb', 'bi-vb' etc
  const ruleClassArrayOfIDs = Object.keys(rules[sections[b]]); // ['pr','ss','ay', 'root-as' etc]
  for (let x = 0; x < ruleClassArrayOfIDs.length; x++) {
    const ruleNameId = ruleClassArrayOfIDs[x]; // 'pr', 'root-as' etc
    buildChapterPage(sectionKey, ruleNameId, logIndex);
    logIndex++;
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

// make a report
// setTimeout(() => {
//   // console.log(reportArray);
//   let report = "";
//   for (let i = 0; i < reportArray.length; i++) {
//     // console.log(reportArray[i]);
//     report += reportArray[i] + "\n";
//   }
//   fs.writeFileSync(`./book-report-${branch}.txt`, report);
//   fs.writeFileSync(`./book-reportArray.txt`, JSON.stringify(reportArray, null, 2));
// }, 60000);

function buildSutta(book, type, number, logIndex) {
  let slug = "";
  if (/root\-/.test(type)) {
    slug = `${book}/${book}${number}`;
  } else {
    slug = `${book}/${book}-${type}/${book}-${type}${number}`;
  }

  let headerPrefix = "start error"; // should never appear in book. Indicates a problem
  let headerTypePrefix = type.replace("root-", "");

  headerTypePrefix = headerTypePrefix.charAt(0).toUpperCase() + headerTypePrefix.slice(1);

  switch (book) {
    case `${language}-bu-vb`:
      headerPrefix = `Bu ${headerTypePrefix}`;
      break;
    case `${language}-bi-vb`:
      headerPrefix = `Bi ${headerTypePrefix}`;
      break;
    case `${language}-kd`:
      headerPrefix = "Kd";
      break;
    case `${language}-pvr`:
      headerPrefix = "Pvr";
      break;
    default:
      headerPrefix = "missing"; // indicates a problem
  }

  // if the number for a segment is part of a series, i.e. 2-8, don't include the number at all
  headerPrefix = `<span class="prefix"> ${headerPrefix} ${/\-/.test(number) ? "" : number} </span>`;

  let tableOfContents = "";

  const rootResponse = fetch(`${githubLocation}root/pli/ms/vinaya/${slug}_root-pli-ms.json`)
    .then(response => response.json())
    .catch(error => {
      console.log("something went wrong getting---root---");
      console.log(error);

      console.log(`${githubLocation}root/pli/ms/vinaya/${slug}_root-pli-ms.json`);
    });

  const htmlResponse = fetch(`${githubLocation}html/pli/ms/vinaya/${slug}_html.json`)
    .then(response => response.json())
    .catch(error => {
      console.log("something went wrong getting--- html---");
      console.log(slug);
    });

  const translationResponse = fetch(
    `${githubLocation}translation/en/brahmali/vinaya/${slug}_translation-en-brahmali.json`
  )
    .then(response => response.json())
    .catch(error => {
      console.log("something went wrong getting--- translation---");
      console.log(slug);
    });

  Promise.all([rootResponse, htmlResponse, translationResponse]).then(responses => {
    let [paliData, htmlData, translationData] = responses;
    let chapterHTML = "";
    let top = `<?xml version="1.0" encoding="utf-8"?>
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
    <head>
      <title>${type}</title>
      <link href="../Styles/Style0001.css" type="text/css" rel="stylesheet"/>
    </head>
    <body>`;
    let bottom = `</body>
    </html>`;

    let paliInclusionFlag = true;
    let leadingNumber = ("000" + logIndex).slice(-4); // used for file name

    // Process each segment
    Object.keys(htmlData).forEach(segment => {
      htmlData[segment] = htmlData[segment].replace(
        "<hr>",
        `<div class="divider-container"><img class="divider" alt="dividers" src="../Images/dividers.png"/></div>`
      );
      let [openHtml, closeHtml] = htmlData[segment].split(/{}/);

      // deal with missing segments
      if (paliData[segment] === undefined) {
        paliData[segment] = "";
      }
      if (translationData[segment] === undefined) {
        translationData[segment] = "";
      }

      // step down heading levels
      openHtml = openHtml
        .replace("<h5", "<h6")
        .replace("<h4", "<h5")
        .replace("<h3", "<h4")
        .replace("<h2", "<h3")
        .replace("<h1", "<h2");
      closeHtml = closeHtml
        .replace("</h5", "</h6")
        .replace("</h4", "</h5")
        .replace("</h3", "</h4")
        .replace("</h2", "</h3")
        .replace("</h1", "</h2");

      // create table of contents and link backs in headings
      if (openHtml.match(/<h[345]/)) {
        let level = openHtml.match(/<h([345])/)[1];
        tableOfContents += `<div class="level-${level}" id="toc-${segment
          .replace(/\./g, "-")
          .replace(/:/g, "--")}"><a href="#${segment.replace(/\./g, "-").replace(/:/g, "--")}">${
          translationData[segment]
        }</a></div>\n`;
        openHtml = openHtml.replace(
          /(<h[345].*>)/,
          `<a href="#toc-${segment.replace(/\./g, "-").replace(/:/g, "--")}"> $1${headerPrefix}`
        );
      }
      if (/<\/h[345]>/.test(closeHtml)) {
        closeHtml = closeHtml.replace(/(<\/h[345]>)/, `$1</a>`);
      }

      // remove Pali in p, dd, and li unless it is part of a rule
      if (/<p|<dd|<li/.test(openHtml)) {
        paliInclusionFlag = false;
        if (openHtml.match("class='rule'")) {
          paliInclusionFlag = true;
        }
      }

      // in h2 remove number from English and insert colon after Pali
      if (/<h2/.test(openHtml)) {
        if (translationData[segment]) {
          translationData[segment] = translationData[segment].replace(/^\d+\.\s/, "");
          paliData[segment] = paliData[segment].replace(/\s*$/, ": ");
        }
      }

      // generate segment
      chapterHTML += `
      ${openHtml}
      <span class="segment" id ="${segment.replace(/\./g, "-").replace(/:/g, "--")}">
      ${paliData[segment] && paliInclusionFlag ? `<span class="pli-lang" lang="pi">${paliData[segment]}</span>` : ""}
      ${
        translationData[segment]
          ? `<span class="eng-lang" lang="en">${translationData[segment]
              .replace(/_(.+?)_/g, "<i>$1</i>")
              .replace(/\*(.+?)\*/g, "<em>$1</em>")}</span>`
          : ""
      }
      </span>
      ${closeHtml}`;

      if (/<\/p|<\/dd|<\/li/.test(closeHtml)) {
        paliInclusionFlag = true;
      }
    }); // end processing of segments

    reportArray[logIndex] = `${book}-${type != "root" ? type + "-" : ""}${number}`;

    chapterHTML = chapterHTML.replace(/<header><ul>[\s\S]*?<\/ul>/, "<header>"); //remove header list from the final document

    if (tableOfContents.length > 0) {
      tableOfContents = `<div class="chapter-toc">${tableOfContents}</div>`;
    }
    chapterHTML = chapterHTML.replace(/<\/header>/, "</header>\n" + tableOfContents);
    chapterHTML = `${top}\n\n${chapterHTML}\n\n${bottom}`;

    // create the directory
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    if (/root-/.test(type)) {
      fs.writeFileSync(`./${dir}/${leadingNumber}-${book}${number}.xhtml`, chapterHTML);
    } else {
      fs.writeFileSync(`./${dir}/${leadingNumber}-${book}-${type}${number}.xhtml`, chapterHTML);
    }
  });
}

function buildChapterPage(book, type, logIndex) {
  let top = `<?xml version="1.0" encoding="utf-8"?>
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
    <head>
      <title>${type}</title>
      <link href="../Styles/Style0001.css" type="text/css" rel="stylesheet"/>
    </head>
    <body>`;
  let bottom = `</body>
    </html>`;
  let bookFullNamePali = "";
  let bookFullNameEnglish = "";
  let typeFullNamePali = "start";
  let typeFullNameEnglish = "start";

  switch (book) {
    case `bu-vb`:
      bookFullNamePali = "Bhikkhu";
      bookFullNameEnglish = "Monks’";
      break;
    case `bi-vb`:
      bookFullNamePali = "Bhikkhuni";
      bookFullNameEnglish = "Nuns’";
      break;
    case `kd`:
      bookFullNamePali = "Khandhaka";
      bookFullNameEnglish = "Chapters on Legal Topics";
      break;
    case `pvr`:
      bookFullNamePali = "Parivāra";
      bookFullNameEnglish = "The Compenduim";
      break;
    default:
      bookFullNamePali = "missing";
      bookFullNameEnglish = "missing";
  }

  switch (type) {
    case `pj`:
      typeFullNamePali = "Pārājika";
      typeFullNameEnglish = "Expulsion";
      break;
    case `ss`:
      typeFullNamePali = "Saṅghādisesa";
      typeFullNameEnglish = "Suspension";
      break;
    case `ay`:
      typeFullNamePali = "Aniyata";
      typeFullNameEnglish = "Undertermined";
      break;
    case `np`:
      typeFullNamePali = "Nissaggiya Pācittiya";
      typeFullNameEnglish = "Relinquishment With Confession";
      break;
    case `pc`:
      typeFullNamePali = "Pācittiya";
      typeFullNameEnglish = "Confession";
      break;
    case `pd`:
      typeFullNamePali = "Pāṭidesanīya";
      typeFullNameEnglish = "Acknowledgment";
      break;
    case `sk`:
    case `root-sk`:
      typeFullNamePali = "Sekhiya";
      typeFullNameEnglish = "Rules for Training";
      break;
    case `as`:
    case `root-as`:
      typeFullNamePali = "Adhikaraṇasamatha";
      typeFullNameEnglish = "Settling Legal Issues";
      break;
    default:
      typeFullNamePali = "";
      typeFullNameEnglish = "";
  }

  chapterHTML = `<h1 class="chapterHead" title="${bookFullNamePali.toUpperCase()} ${typeFullNamePali.toUpperCase()}: ${bookFullNameEnglish} ${typeFullNameEnglish}"><span class="lang-pali">${bookFullNamePali} ${typeFullNamePali}</span>${bookFullNameEnglish} ${typeFullNameEnglish}</h1>`;

  chapterHTML = `${top}\n\n${chapterHTML}\n\n${bottom}`;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  let leadingNumber = ("000" + logIndex).slice(-4);

  if (/root/.test(type)) {
    fs.writeFileSync(`./${dir}/${leadingNumber}-${book}-chapter-head.xhtml`, chapterHTML);
  } else {
    fs.writeFileSync(`./${dir}/${leadingNumber}-${book}-${type.replace("root-", "")}-chapter-head.xhtml`, chapterHTML);
  }
}
