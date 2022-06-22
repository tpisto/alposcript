# Object expression in call
$ 'rect',
  key: 'body'
  ref: (ref) => @rectRef = ref
  test: true

$ 'a',
  b:
    c: 2

let a = b do
  'c': (d) ->
    let a = 1
  , { }
