module.exports = function processTemplateLiterals(templatePositions, textPos) {
  let isInsideTemplate;
  // Template literals are quite hard, so we here check should we use literal expressions or not
  if (templatePositions.length > 0) {
    if (templatePositions[templatePositions.length - 1].end < textPos) {
      templatePositions = [];
      isInsideTemplate = false;
    }
    for (let index in templatePositions) {
      let pos = templatePositions[index];
      if (textPos >= pos.start && textPos <= pos.end) {
        isInsideTemplate = true;
        if (pos.type == "first") {
          addToken(t.template_element_token, "");
        } else if (pos.type == "quasis") {
          addToken(t.template_element_token, globalText.substring(pos.start, pos.end + 1));
          textPos = pos.end + 1;
          return textPos;
        } else if (pos.type == "expression") {
          if (globalText[textPos] == "#") {
            addToken(t.template_expression_token, "#{");
            textPos = textPos + 2;
            return textPos;
          }
        } else if (pos.type == "hyphen_close") {
          addToken(t.template_element_token, "", { tail: true });
          textPos = textPos + 1;
          return textPos;
        }
      }
    }
  } else {
    isInsideTemplate = false;
  }
  return false;
};
