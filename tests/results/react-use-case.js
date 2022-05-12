import { useState } from "react";

let example = () => {
  const [count, setCount] = useState(0);
  return {
    $("div", null, $("p", null, "You clicked {count} times"), $("button", {
      onClick: () => setCount(count + 1)
    }, "Click me"))
  };
};