# Member expression in block
fetch('http://example.com/tests.json')
  .then (response) => response
  .then (data) => 2

# Member expression in block
fetch(a)
  .then (b) =>
    c 'd'
    e 'f'
  .then (g) =>
    h 'i'
    j 'k'