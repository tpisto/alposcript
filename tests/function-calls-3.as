# Function calls 3
# Object without brackets
a 'c', b: 1, c: 2, 'd',
  a 'b', b: 2
# Function call for object
a 'c', b: 1, c: 2, 'd',
  a b: 2
$ 'a',
  $ 'b', c: 1, d: 2,
    $ 'c', e: 'offOut', in: 'SourceGraphic', dx: '2', dy: '2'
# Function calls for return values
a(1)(2)(3)
(() => a+1)()
