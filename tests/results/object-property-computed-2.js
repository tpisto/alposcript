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