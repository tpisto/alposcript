# Variable declaration destructuring
const { a } = { a: 1 }
{ b } = { b: 1 }
{ c } = require 'd'
let d = 1
# Here we should generate "let { u, i, o } = { o: 1 }"
{ u, i, o } = { o: 1 }
# But now, because we already have "f" variable in our scope, we don't use "let", but instead add variables to the scope and generate expression
let f = 2
{ d, f } = { d: 5, f: 6 }