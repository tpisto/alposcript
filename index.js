let p = require("./preprocessor/preprocessor");
let Tokenizer = require("./tokenizer/tokenizer");

module.exports = function (code, opts) {
  let preProcessedCode = p.Preprocessor.process(code);
  let tokenizer = new Tokenizer(preProcessedCode);
  // We first tokenize the source code
  let tokenArray = tokenizer.tokenize();
  // Because alposcript has quite special syntax, we make creation of the AST
  // simpler by, converting some token constructs to new tokens (like call_expression in a case of string_literal + string_literal: "a 'b'")
  tokenArray = tokenizer.processTokens();
  // // Show the token array
  // for (token of tokenArray) {
  //   console.log(token.name.padEnd(25), " | ", ((token.value || {}).name ? (token.value || {}).name + " " + (token.value || {}).value : null) || token.value || "");
  // }
  // Run the expressions
  let ast = tokenizer.getTokenFunction().expression(0);
  // console.log(JSON.stringify(ast, null, "\t"));
  return ast;
};
