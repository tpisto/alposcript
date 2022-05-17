let a;
a = _.map(b, function (v) {
  return {
    a: v.a,
    b: v.b
  };
});
a = _.map(b, function (v) {
  console.log("x");
  return {
    a: v.a,
    b: v.b
  };
});