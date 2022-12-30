# For Of, For In
for const [a, b] of c
  a = 1

for const a of d
  console.log('jee')

for const [ key, value ] of Object.entries(myObject)
  a = 1

for const [ key2, value2 ] of Object.entries(@myObject)
  let a = b: 1

let g = [ 'a', 'b', 'c' ]

for a in g
  console.log a

for a of g
  console.log a

for k in tree.children
  console.log 'K', k

for k, child of tree.children
  console.log 'K', k
