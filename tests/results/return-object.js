let a, b;
a = b({
  c: function () {
    return {
      d: "#fff",
      e: "#jee"
    };
  }
});
b = b({
  c: function () {
    return {
      d: "#fff"
    };
  }
});

a = function () {
  return {
    b: {
      c: 1
    }
  };
};

a = function () {
  console.log("x");
  return {
    b: {
      c: 1
    }
  };
};