let a;

a = (() => {
  switch (a) {
    case 1:
      return 2;

    case 2:
      return 3;

    case 3:
      return 4;

    case 4:
      return 5;

    case 5:
      return a === 5 ? a + 1 : a - 1;
  }
})();