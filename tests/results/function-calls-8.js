a?.find(1);
a?.b.c(1);
a.b.c?.d.e.f(1);
const a = b(state => c.d.e?.f(function (v) {
  return v.t === "a";
}));