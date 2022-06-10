require("fs").writeFileSync("test.txt", "Hell world!\n");

var fs = require("fs");
var dir = "./tmp";

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}
