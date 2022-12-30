for (const [a, b] of c) {
  let a;
  a = 1;
};

for (const a of d) {
  console.log("jee");
};

for (const [key, value] of Object.entries(myObject)) {
  let a;
  a = 1;
};

for (const [key2, value2] of Object.entries(this.myObject)) {
  let a = {
    b: 1
  };
};

let g = ["a", "b", "c"];

for (a in g) {
  console.log(a);
};

for (a of g) {
  console.log(a);
};

for (let [k, v] of tree.children.entries()) {
  console.log("K", k, "V", v);
};

for (let [k, v] of Object.entries(tree.children)) {
  console.log("K", k, "V", child);
};