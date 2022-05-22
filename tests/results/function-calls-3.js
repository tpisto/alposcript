a("c", {
  b: 1,
  c: 2
}, "d", a("b", {
  b: 2
}));
a({
  [b]: 1
});
a("c", {
  b: 1,
  c: 2
}, "d", a({
  b: 2
}));
$("a", $("b", {
  c: 1,
  d: 2
}, $("c", {
  e: "offOut",
  in: "SourceGraphic",
  dx: "2",
  dy: "2"
})));
a(1)(2)(3);

(() => a + 1)();

let a = _.b(c, function (d) {
  return d.e === f.g;
});