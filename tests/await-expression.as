# Await expression
fn fetchData ->>
  res = await fetch searchUrl
  return res
