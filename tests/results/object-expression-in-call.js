$("rect", {
  key: "body",
  ref: ref => this.rectRef = ref,
  test: true
});
$("a", {
  b: {
    c: 2
  }
});
let a = b({
  "c": function (d) {
    let a = 1;
  }
}, {});