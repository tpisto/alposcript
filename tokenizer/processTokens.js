module.exports = function processTokens(tokens, myTokenArray) {
  let convertToken = (fn, token) => {
    return fn(token.value, token.props, token);
  };

  // Stage 0, remove double end_tokens
  for (let i = 0; i < myTokenArray.length - 1; i++) {
    if (myTokenArray[i].name === "end_token" && myTokenArray[i + 1].name === "end_token") {
      myTokenArray.splice(i, 1);
      i--;
    }
  }

  // Stage 1 and 2 are just similiar, but some token fixes are affecint other token processing functions

  // Stage 1.
  for (let i = 0; i < myTokenArray.length - 1; i++) {
    // Allow object destructuring without let/const. Default to "let". Example: { a } = { a: 1 }
    if (myTokenArray[i].name == "assignment_expression_token" && myTokenArray[i - 1]?.name == "block_token" && myTokenArray[i - 1]?.value == "}") {
      let closedBracketsCount = 0;
      for (let p = i; p >= 0; p--) {
        if (myTokenArray[p].name == "block_token" && myTokenArray[p].value == "}") {
          closedBracketsCount++;
        } else {
          // Allow also use brackets inside parameters
          if (myTokenArray[p].name == "block_token" && myTokenArray[p].value == "{") {
            if (closedBracketsCount == 1) {
              // We might already have variable declartor token
              if (myTokenArray[p - 1].name != "variable_declarator_token") {
                let kind = myTokenArray[i + 1].name == "identifier_token" && myTokenArray[i + 1].value == "require" ? "const" : "let";
                myTokenArray.splice(p, 0, tokens.variable_declarator_token(kind, Object.assign({}, myTokenArray[p].props, { type: "autoCreated" })));
                i++;
              } else {
                break;
              }
            } else {
              closedBracketsCount--;
            }
            break;
          }
        }
      }
    }
  }

  // Stage 2
  // !!! Convert literal tokens to functions for certain cases !!!
  // !TODO!
  for (let i = 0; i < myTokenArray.length - 1; i++) {
    // Create function call token
    if (myTokenArray[i].name == "identifier_token" && myTokenArray[i].props.type != "string" && myTokenArray[i - 1]?.name != "function_declaration_token") {
      let nextToken = myTokenArray[i + 1] || {};
      let nextTokenName = nextToken.name;

      if (
        nextTokenName == "identifier_token" ||
        nextTokenName == "this_token" ||
        nextTokenName == "literal_token" ||
        nextTokenName == "object_property_token" ||
        nextTokenName == "parenthesis_open_token" ||
        (nextTokenName == "block_token" && nextToken.value == "{") ||
        nextTokenName == "do_token" ||
        nextTokenName == "template_literal_token"
      ) {
        // We can use "do" keyword to call indented blocks
        if (nextTokenName == "do_token") {
          myTokenArray.splice(i + 1, 1);
          if (myTokenArray[i + 1].name == "end_token") {
            myTokenArray.splice(i + 1, 1);
          }
        }
        myTokenArray[i] = convertToken(tokens.call_expression_token, myTokenArray[i]);
      }
      // Make identifier token to member expression
      if (nextTokenName == "array_token" && nextToken.value == "[") {
        myTokenArray[i + 1].props.computed = true;
        myTokenArray[i + 1] = convertToken(tokens.member_expression_token, myTokenArray[i + 1]);
      }
    }

    // Convert )( to call. // We can have a(1)(2)(3) calls
    if (myTokenArray[i].name == "parenthesis_close_token" && myTokenArray[i + 1].name == "parenthesis_open_token") {
      myTokenArray[i + 1] = convertToken(tokens.parenthesized_call_expression_token, myTokenArray[i + 1]);
    }

    // For
    if (
      myTokenArray[i].name == "for_statement_token" &&
      myTokenArray[i + 1].name == "identifier_token" &&
      myTokenArray[i + 2].name == "comma_token" &&
      myTokenArray[i + 3].name == "identifier_token"
    ) {
      // Create "for" array expression "for key, value of myObject"
      // This is quite big modification, but it enables pretty easy "for of" with keys and values for objects.
      // Close array before "of" and add Object.entries for the identfier
      let maxLength = myTokenArray.length;
      for (let p = i; p < maxLength; p++) {
        if (myTokenArray[p].name == "in_token") {
          myTokenArray.splice(p, 0, { name: "array_token", value: "]", props: myTokenArray[p].props });

          // // Find end, block
          break;
          // // Object.entries
          // if (myTokenArray[p + 2].name == "identifier_token" && myTokenArray[p + 4]?.value != "entries") {
          //   myTokenArray.splice(p + 2, 0, tokens.identifier_token("Object.entries", myTokenArray[p + 1].props));
          // }
        }
        if (myTokenArray[p].name == "of_token") {
          myTokenArray.splice(p, 0, { name: "array_token", value: "]", props: myTokenArray[p].props });
          // Object.entries
          if ((myTokenArray[p + 2].name == "identifier_token" || myTokenArray[p + 2].name == "this_token") && myTokenArray[p + 4]?.value != "entries") {
            myTokenArray.splice(p + 2, 0, tokens.identifier_token("Object.entries", myTokenArray[p + 1].props));
          }
          break;
        }
      }
      myTokenArray.splice(i + 1, 0, tokens.array_token("[", myTokenArray[i].props));
      myTokenArray.splice(i + 1, 0, tokens.variable_declarator_token("let", myTokenArray[i].props));
    }

    // !TODO! refactor this.
    // Create arrow expression token
    if (myTokenArray[i].name == "arrow_token") {
      let prevToken = (myTokenArray[i - 1] || {}).name;

      // Add function declartion token if previous is identifier token: myFunctionName -> return c
      if (prevToken == "identifier_token") {
        myTokenArray.splice(i - 1, 0, tokens.function_declaration_token("", myTokenArray[i].props));
        myTokenArray.splice(i + 1, 0, tokens.function_token("(", myTokenArray[i].props));
        myTokenArray.splice(i + 2, 0, { name: "parenthesis_close_token", value: ")", props: myTokenArray[i].props });
        i = i + 3;
      } else if (prevToken == "parenthesis_close_token") {
        let closedParenthesisCount = 0;
        for (let p = i; p >= 0; p--) {
          if (myTokenArray[p].name == "parenthesis_close_token") {
            closedParenthesisCount++;
          } else {
            // Allow also use parentheses inside parameters
            if (myTokenArray[p].name == "parenthesis_open_token") {
              if (closedParenthesisCount == 1) {
                myTokenArray[p] = convertToken(tokens.function_token, myTokenArray[p]);
                // This "whiteSpace / nonWhiteSpace" is used to allow creation of named functions like "export default a() => b"
                if (myTokenArray[p].props.type == "nonWhiteSpace") {
                  myTokenArray[p - 1] = convertToken(tokens.identifier_token, myTokenArray[p - 1]);
                  myTokenArray.splice(p - 1, 0, tokens.function_declaration_token("", myTokenArray[p - 1].props));
                }
              } else {
                closedParenthesisCount--;
              }
              break;
            }
          }
        }
      } else {
        // Allow empty arrow function without parameters (we add the () tokens here)
        myTokenArray.splice(i, 0, tokens.function_token("(", myTokenArray[i].props));
        myTokenArray.splice(i + 1, 0, { name: "parenthesis_close_token", value: ")", props: myTokenArray[i].props });
        i = i + 2;

        // If we would like to disable the possibility to use empty arrows as function calls, we can uncomment these lines
        // and remove the lines above.

        // const { line, column } = myTokenArray[i].props;
        // throw new Error(`Cannot find parameters for arrow function expression at line: ${line + 2} column: ${column}`);
      }
    }

    // Convert block_token into object_expression_token if next token is property token
    if (myTokenArray[i].name == "block_token") {
      // Convert following syntax to object_expression_token (b: 1 is object expression)
      // $ 'a',
      //   b:
      //     c: 1
      if (
        myTokenArray[i - 2]?.name == "object_property_token" &&
        myTokenArray[i - 1]?.name == "end_token" &&
        myTokenArray[i].value == "INDENT" &&
        myTokenArray[i + 1].name == "object_property_token"
      ) {
        myTokenArray[i].props = { ...myTokenArray[i].props, ...{ hasBlock: true, blockValue: myTokenArray[i].value } };
        myTokenArray[i] = convertToken(tokens.object_expression_token, myTokenArray[i]);
        if (myTokenArray[i - 1].name == "end_token") {
          myTokenArray.splice(i - 1, 1);
        }
      }

      // Convert call_expression_token block_token object_property token to object_expression_token
      if (myTokenArray[i - 1]?.name == "call_expression_token" && myTokenArray[i].value == "INDENT" && myTokenArray[i + 1]?.name == "object_property_token") {
        myTokenArray[i].props = { ...myTokenArray[i].props, ...{ hasBlock: true, blockValue: myTokenArray[i].value } };
        myTokenArray[i] = convertToken(tokens.object_expression_token, myTokenArray[i]);
      }

      if (myTokenArray[i].value == "{") {
        let nextToken1 = myTokenArray[i + 1] || {};
        let nextToken2 = myTokenArray[i + 2] || {};

        if (nextToken1.name == "object_property_token" || nextToken1.name == "spread_element_token") {
          myTokenArray[i].props = Object.assign({}, myTokenArray[i].props, { hasBlock: true, blockValue: myTokenArray[i].value });
          myTokenArray[i] = convertToken(tokens.object_expression_token, myTokenArray[i]);
        }

        // We can also have just identifiers and those should be converted to object property tokens
        if (nextToken1.name == "identifier_token" && myTokenArray[i + 2]?.name != "assignment_expression_token") {
          let canConvert = true;
          // We can't convert to the object in cases like import
          for (let p = i - 1; p >= 0; p--) {
            if (myTokenArray[p].name == "import_declaration_token") {
              canConvert = false;
            }
            if (myTokenArray[p].name == "end_token" || myTokenArray[p].name == "block_token") {
              break;
            }
          }
          if (canConvert) {
            myTokenArray[i].props = Object.assign({}, myTokenArray[i].props, { hasBlock: true, blockValue: myTokenArray[i].value });
            myTokenArray[i] = convertToken(tokens.object_expression_token, myTokenArray[i]);
            // Convert identifier to property
            myTokenArray.splice(i + 1, 0, myTokenArray[i + 1]);
            myTokenArray[i + 1] = convertToken(tokens.object_property_token, myTokenArray[i + 1]);
          }
        }

        // Fix block + indent block
        if (nextToken1.name == "end_token" && nextToken2.name == "block_token" && nextToken2.value == "INDENT") {
          myTokenArray.splice(i, 2);
          i = i - 2;
        }

        // Convert block {} at for example "let a = {}"" into object. Previous object needs to be assignment_expression_token.
        if (myTokenArray[i - 1].name == "assignment_expression_token" && nextToken1.name == "block_token" && nextToken1.value == "}") {
          Object.assign(myTokenArray[i].props, { hasBlock: true, blockValue: "{" });
          myTokenArray[i] = convertToken(tokens.object_expression_token, myTokenArray[i]);
        }
      }
      // Fix block + indent block
      else if (myTokenArray[i].value == "DEDENT") {
        let nextToken1 = myTokenArray[i + 1] || {};
        let nextToken2 = myTokenArray[i + 2] || {};
        if (nextToken1.name == "end_token" && nextToken2.name == "block_token" && nextToken2.value == "}") {
          myTokenArray.splice(i, 2);
          i = i - 2;
        }
      }
    }

    // variable_declarator_token + block_token { is object_pattern
    if (myTokenArray[i].name == "variable_declarator_token" && myTokenArray[i + 1].name == "block_token" && myTokenArray[i + 1].value == "{") {
      Object.assign(myTokenArray[i + 1].props, { type: "ObjectPattern", hasBlock: true, blockValue: "{" });
      myTokenArray[i + 1] = convertToken(tokens.object_expression_token, myTokenArray[i + 1]);
    }

    // Convert single line member expression to be part of previous line or token
    if (myTokenArray[i].name == "end_token" && myTokenArray[i + 1].name == "member_expression_token") {
      myTokenArray.splice(i, 1);
      i = i - 1;
      // We want this to bind at the very and of the previous block
      myTokenArray[i + 1].leftBindingPower = 5;
    }

    // Remove multiple end tokens
    if (myTokenArray[i].name == "end_token" && myTokenArray[i + 1].name == "end_token") {
      myTokenArray.splice(i, 1);
      i--;
    }

    // "export default"
    if (myTokenArray[i].name == "export_token" && myTokenArray[i + 1].name == "default") {
      myTokenArray[i].props.default = true;
      myTokenArray.splice(i + 1, 1);
    }
  }

  return myTokenArray;
};
