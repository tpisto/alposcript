function TimeLogField(props) {
  let myValue = 2;

  if (true) {
    if (true) {
      return myValue = 1;
    }
  }
}

function TimeLogField2(props) {
  if (true) {
    let myValue2 = 2;

    if (true) {
      return myValue2 = 1;
    }
  }
}

function TimeLogField3(props) {
  let myValue3;

  if (true) {
    if (true) {
      return myValue3 = 3;
    }
  }
}

function TimeLogField4(props) {
  if (true) {
    if (true) {
      return myValue4 = 3;
    }
  }
}

function a(b) {
  return b = 1;
}

function b({
  c
}) {
  return c = 2;
}

function c({
  d,
  ...f
}) {
  f = 2;
  return d = 2;
}

a => {
  return a = 2;
};