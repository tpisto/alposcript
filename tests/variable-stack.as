# Variable stack
fn TimeLogField(props) ->
  let myValue = 2
  if true
    if true
      myValue = 1

fn TimeLogField2(props) ->
  if true
    let myValue2 = 2
    if true
      myValue2 = 1

fn TimeLogField3(props) ->
  if true
    if true
      myValue3 = 3

fn TimeLogField4(props) ->
  if true
    if true
      myValue4 := 3

fn a(b) -> 
  b = 1

fn a({c}) ->
  c = 2

(a) =>
  a = 2