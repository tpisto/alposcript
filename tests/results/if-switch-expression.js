function a() {
  switch (a) {
    case 2:
      if (3) {
        return 4;
      } else {
        return 5;
      }

      break;
  }
}

function b() {
  switch (c) {
    case a:
      return 1;
      break;
  }
}

function c() {
  let a = a ? (() => {
    switch (a) {
      case 1:
        return 2;

      case 2:
        return 3 ? 4 : 5;
    }
  })() : 2;
  return a;
}

function d() {
  if (a) {
    switch (a) {
      case 1:
        return 2;
        break;

      case 2:
        if (3) {
          return 4;
        } else {
          return 5;
        }

        break;
    }
  } else {
    return 2;
  }
}