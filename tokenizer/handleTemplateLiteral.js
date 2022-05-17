module.exports = function handleTemplateLiteral(text, textPos) {
  let templatePositions = [];
  let hasTemplates = false;
  let quasisStart = null;
  let i = textPos;
  // Get string that is inside the parentheses
  for (; i < text.length; i++) {
    if (text[i] == '"' && text[i - 1] != "\\") {
      break;
    }
    // Get positions of the template strings
    if (text[i] == "#" && text[i + 1] == "{") {
      // We add both quasis and expressions to templatepositions
      hasTemplates = true;
      if (quasisStart != null) {
        templatePositions.push({ start: quasisStart, end: i - 1, type: "quasis" });
        quasisStart = null;
      }

      // What makes this little bit more difficult is that we can have
      // another block tokens inside the template literal
      let start = i;
      let end = null;
      let bracketCount = 0;
      let p = 0;
      for (p = i + 2; p < text.length; p++) {
        if (text[p] == "{") {
          bracketCount = bracketCount + 1;
        }
        if (text[p] == "}") {
          if (bracketCount == 0) {
            end = p;
            break;
          } else {
            bracketCount = bracketCount - 1;
          }
        }
      }
      templatePositions.push({ start: start, end: end, type: "expression" });
      i = p;
    } else {
      if (quasisStart == null) {
        quasisStart = i;
      }
    }
  }

  if (hasTemplates) {
    if(quasisStart != null) {
      templatePositions.push({ start: quasisStart, end: i - 1, type: "last" });
    } else {
      let last = templatePositions[templatePositions.length - 1];
      templatePositions.push({ start: last.end + 1, end: last.end + 1, type: "last" });
    }
    // We need to have template element before any template expressions
    if (templatePositions[0].type == "expression") {
      templatePositions.unshift({ start: templatePositions[0].start, end: templatePositions[0].start, type: "first" });
    }
    return templatePositions;
  } else {
    return [];
  }
};
