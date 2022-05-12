# Function calls
a b(10, c d e f 2), g
a b 10, c(d e 2)
a({ a: 1 }, b, c, 1, '1', "1")
a(b({ a: 1, b: 2 }), c, d(1,2,3), 1, '1', "1")
let a = a b c d e f g 10
let b = () => { c = 1; d = () => 'hi'; e = 3 }
o.a()
o.a('1')
o.b({ a: 1 })
a.b(1).c('x').d().e()
c = b do
  c: 1
d = b do
  a: 1
  b: 2
d = b do
  a: 1
  b: 2
  c: 3
  d: 4  
$ 'c', s: { d: 1 },
  $ 'b'
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
