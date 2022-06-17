# Function - disable implicit return
fn a() ->
  1
fn a() !->
  1
fn b() ->>
  1
fn b() !->>
  1  
fn c() ->*
  1
fn c() !->*
  1