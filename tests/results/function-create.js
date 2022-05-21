let a1 = (a, b, c) => a * 2 + b / c;

let b1 = () => a * 2 + b / c;

let c1 = {
  a: () => a + b / c
};

let d1 = () => {
  a + 1;
  b + 2;
  return a * b;
};

let e1 = () => {
  a + 1;
  b + 2;
  return a * b;
};

let f1 = (a, b, c) => {
  a + 1;
  b + 2;
  return a * b;
};

let g1 = (a, b, c) => {
  a + 1;
  b + 2;
  return a * b;
};

let a2 = function (a, b, c) {
  return a * 2 + b / c;
};

let b2 = function () {
  return a * 2 + b / c;
};

let c2 = {
  a: function () {
    return a + b / c;
  }
};

let d2 = function () {
  a + 1;
  b + 2;
  return a * b;
};

let e2 = function () {
  a + 1;
  b + 2;
  return a * b;
};

let f2 = function (a, b, c) {
  a + 1;
  b + 2;
  return a * b;
};

let g2 = function (a, b, c) {
  a + 1;
  b + 2;
  return a * b;
};

let h1 = async () => a + 1;

let h2 = async function () {
  return a + 1;
};

let h3 = async a => a + 1;

let h4 = async function (a) {
  return a + 1;
};