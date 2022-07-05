let parse = require("@babel/parser").parse;
let generate = require("@babel/generator").default;

let code = "let a = ((b && c + 1) + 1) / 2 || (d || e)";
const ast = parse(code);

const output = generate(
  ast,
  {
    /* options */
  },
  code
);

console.log(output);
