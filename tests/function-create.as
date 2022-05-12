# Function creation
# Arrow function
let a1 = (a, b, c) => a * 2 + b / c
let b1 = () => a * 2 + b / c
let c1 = { a: () => a + b / c }
let d1 = () =>
  a + 1
  b + 2
  return a * b
let e1 = () => {
  a + 1
  b + 2
  return a * b
}
let f1 = (a, b, c) =>
  a + 1
  b + 2
  return a * b
let g1 = (a, b, c) => {
  a + 1
  b + 2
  return a * b
}

# Normal function
let a2 = (a, b, c) -> a * 2 + b / c
let b2 = () -> a * 2 + b / c
let c2 = { a: () -> a + b / c }
let d2 = () ->
  a + 1
  b + 2
  return a * b
let e2 = () -> {
  a + 1
  b + 2
  return a * b
}
let f2 = (a, b, c) ->
  a + 1
  b + 2
  return a * b
let g2 = (a, b, c) -> {
  a + 1
  b + 2
  return a * b
}

# Async functions
let h1 = () =>> a + 1
let h2 = () ->> a + 1
let h3 = (a) =>> a + 1
let h4 = (a) ->> a + 1
