# Immediate return (arrow function)
() => return
  $ 'a', null

# Return object
fn myFun(s) ->
  let a = 1
  return
    b: if a then 2 else null

return ({ a, b}) => 
  let c = 1