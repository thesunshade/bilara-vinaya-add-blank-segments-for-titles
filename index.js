const fetch = require("node-fetch");
const fs = require("fs");
const language = "pli-tv";

const rules = {
  "bu-vb": {
    pj: ["1", 2, 3, 4],
    ss: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    ay: [1, 2],
    np: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    pc: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
      60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87,
      88, 89, 90, 91, 92,
    ],

    pd: [1, 2, 3, 4],
    sk: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
      60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75,
    ],
    root: ["as1-7"],
  },

  "bi-vb": {
    pj: [5, 6, 7, 8],
    ss: [1, 2, 3, 4, 5, 6, 10, 11, 12, 13],
    np: [1, 2, 3, 4, 5, 6, 10, 11, 12],
    pc: [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63,
      64,
      65,
      66,
      67,
      68,
      69,
      70,
      71,
      72,
      73,
      74,
      75,
      76,
      77,
      78,
      79,
      80,
      81,
      82,
      83,
      84,
      85,
      86,
      87,
      88,
      89,
      90,
      "91-93",
      94,
      95,
      96,
    ],
    pd: [1, "2-8"],
    root: ["as1-7", "sk1-75"],
  },
};

// The actual thing that does the work
const sections = Object.keys(rules); // [ 'bu-vb', 'bi-vb' ]

for (let b = 0; b < sections.length; b++) {
  // loop through sections
  const sectionKey = sections[b]; // 'bu-vb' etc
  const ruleClassArrayOfIDs = Object.keys(rules[sections[b]]); // ['pr','ss','ay' etc]
  // console.log({ sectionKey });
  for (let x = 0; x < ruleClassArrayOfIDs.length; x++) {
    const ruleNameId = ruleClassArrayOfIDs[x]; // 'pr' etc
    // console.log(ruleNameId);
    const ruleNumbersArray = rules[sectionKey][ruleNameId];
    for (let i = 0; i < ruleNumbersArray.length; i++) {
      // console.log("Rule Number: " + ruleNumbersArray[i]);
      const book = `${language}-${sectionKey}`;
      const type = ruleNameId;
      const number = ruleNumbersArray[i];

      // console.log(book, type, number);
      buildSutta(book, type, number);
    }
  }
}

function buildSutta(book, type, number) {
  let slug = "";
  if (type === "root") {
    slug = `${book}/${book}-${number}`;
  } else {
    slug = `${book}/${book}-${type}/${book}-${type}${number}`;
  }

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

    let dir = "";
    if (type === "root") {
      dir = `./vinaya/${book}`;
    } else {
      dir = `./vinaya/${book}/${book}-${type}`;
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (type === "root") {
      fs.writeFileSync(`./${dir}/${book}-${number}.json`, JSON.stringify(newPaliData, null, 5));
    } else {
      fs.writeFileSync(`./${dir}/${book}-${type}${number}.json`, JSON.stringify(newPaliData, null, 5));
    }
  });
}
