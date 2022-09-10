let fs = require("fs");
let generate = require("@babel/generator");
let chalk = require("chalk");
let path = require("path");
let compile = require("./index");

let parseFile = (file) => {
  let ast = compile(file);
  let output = generate.default(ast, {}, file);
  return output.code;
};

let testDir = fs.readdirSync("./tests", { withFileTypes: true });
let testNum = 1;

console.log();
console.log(chalk.yellow("Testing alposcript"), "\n");

for (let file of testDir) {
  if (file.isFile()) {
    let fileName = file.name;
    let testFile = fs.readFileSync(`./tests/${fileName}`);
    let baseName = path.basename(fileName, ".as");
    let resFile = null;

    try {
      resFile = fs.readFileSync(`./tests/results/${baseName}.js`).toString();
    } catch (e) {}

    let lines = testFile.toString().split("\n");

    try {
      let compiledScript = parseFile(testFile);
      let shouldCompileTo = resFile || JSON.parse(lines[1].substr(8));
      // For debugging
      // if (baseName == "variable_declaration_destruct") {
      //   console.log(compiledScript, "XXX", shouldCompileTo);
      // }
      if (compiledScript.trim() != shouldCompileTo.trim()) {
        throw "Results does not match";
      }
      console.log(
        `${chalk.blue(
          "Test" +
            testNum.toLocaleString("en-US", {
              minimumIntegerDigits: 2,
              useGrouping: false,
            }) +
            ":"
        )} ${lines[0].substr(2).padEnd(45)} ${fileName.padEnd(45)} ${chalk.green("succeeded")}`
      );
    } catch (error) {
      console.log(`${chalk.blue("Test" + testNum + ":")} ${lines[0].substr(2).padEnd(45)} ${fileName.padEnd(35)} ${chalk.red("failed")}`);
    }
    testNum++;
  }
}
console.log();
