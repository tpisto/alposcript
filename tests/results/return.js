() => $("a", null);

function myFun(s) {
  let a = 1;
  return {
    b: a ? 2 : null
  };
}

return ({
  a,
  b
}) => {
  let c = 1;
};