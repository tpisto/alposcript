# Return object immediately from function
a = b do
  c: () -> return
    d: '#fff'
    e: '#jee'

b = b do
  c: () -> return
    d: '#fff'

a = ->
  b:
    c: 1

a = ->
  console.log 'x'
  b:
    c: 1
