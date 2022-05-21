let a = {
  [b]: 1,
  c: 1,
  [d]: 2
};
testFn(function () {
  return {
    [b]: 2
  };
});
testFn2(function () {
  return {
    [b]: 3
  };
});
testCall({
  [a]: 1
});
testCall({
  [a]: 1,
  b: 1
});
testCall({
  b: 1,
  [a]: 2
});
testCall({
  b: 1,
  [a]: [b]
});