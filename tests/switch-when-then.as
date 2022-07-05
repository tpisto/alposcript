# Switch When Then
a = switch a
  when 1 then 2
  when 2 then 3
  when 3 then 4
  when 4 then 5
  # Testing if stucture in when-then
  when 5 then if a == 5 then a + 1 else a - 1
