let p = require("./preprocessor/preprocessor");
let fs = require("fs");
let generate = require("@babel/generator");
let Tokenizer = require("./tokenizer/tokenizer");

let parseFile = (file) => {
  let preProcessedFile = p.Preprocessor.process(file);
  let tokenizer = new Tokenizer(preProcessedFile);

  // We first tokenize the source code
  let tokenArray = tokenizer.tokenize();
  // Because alposcript has quite special syntax, we make creation of the AST
  // simpler by, converting some token constructs to new tokens (like call_expression in a case of string_literal + string_literal: "a 'b'")
  tokenArray = tokenizer.processTokens();

  // Show the token array
  for (let token of tokenArray) {
    console.log(token.name.padEnd(28), " | ", ((token.value || {}).name ? (token.value || {}).name + " " + (token.value || {}).value : null) || token.value || "");
  }

  // Run the expressions
  let ast = tokenizer.getTokenFunction().expression(0);
  console.log(JSON.stringify(ast, null, "\t"));

  let output = generate.default(ast, {}, preProcessedFile);
  return output.code;
};

let testFile = fs.readFileSync("./babeltest/test.as");
let compiledScript = parseFile(testFile);
// console.log(JSON.stringify(compiledScript))
console.log(compiledScript);
