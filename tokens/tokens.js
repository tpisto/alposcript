let notExpressionStatements = [
  "VariableDeclaration",
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExpressionStatement",
  "ReturnStatement",
  "IfStatement",
  "TryStatement",
  "FunctionDeclaration",
  "SwitchCase",
  "SwitchStatement",
];

module.exports = function getTokens() {
  let tokens = {};
  let tokenArray = [];
  let tokenArrayIndex = -1;
  let commentArray = [];
  let sourceType = "script";

  // Auto declaring variables using 'let'
  let variableStack = {
    variableScopeStack: [],
    push(hasScope) {
      let localVariableStack = { used: {}, add: {}, hasScope: hasScope };
      this.variableScopeStack.push(localVariableStack);
    },
    addVariablesToBody(body) {
      let variableScope = this.variableScopeStack[this.variableScopeStack.length - 1];
      let variables = Object.keys(variableScope.add);
      if (variables.length > 0) {
        let variableDeclarations = {
          type: "VariableDeclaration",
          declarations: [],
          kind: "let",
          // !TODO! Create correct locations
          start: 0,
          end: 0,
          loc: {
            start: {
              line: 0,
              column: 0,
            },
            end: {
              line: 0,
              column: 0,
            },
          },
        };
        for (let variable of variables) {
          if (variableScope.used[variable] != true) {
            variableDeclarations.declarations.push({
              type: "VariableDeclarator",
              id: {
                type: "Identifier",
                name: variable,
              },
              init: null,
              // !TODO! Create correct locations
              start: 0,
              end: 0,
              loc: {
                start: {
                  line: 0,
                  column: 0,
                },
                end: {
                  line: 0,
                  column: 0,
                },
              },
            });
          }
        }
        if (variableDeclarations.declarations.length > 0) {
          body.unshift(variableDeclarations);
        }
      }
      this.variableScopeStack.pop();
    },
    setDeclared(name) {
      this.variableScopeStack[this.variableScopeStack.length - 1].used[name] = true;
    },
    isAlreadySetOrDeclared(name) {
      return this.variableScopeStack[this.variableScopeStack.length - 1].add[name] || this.variableScopeStack[this.variableScopeStack.length - 1].used[name];
    },
    set(name) {
      if (name) {
        // We allow create variables inside if scope
        if (this.variableScopeStack[this.variableScopeStack.length - 1].hasScope) {
          this.variableScopeStack[this.variableScopeStack.length - 1].add[name] = true;
        } else {
          if (this.variableScopeStack[this.variableScopeStack.length - 1].used[name] != true) {
            for (let i = this.variableScopeStack.length - 1; i >= 0; i--) {
              if (this.variableScopeStack[i].hasScope) {
                if (this.variableScopeStack[i].used[name] != true) {
                  this.variableScopeStack[i].add[name] = true;
                }
                break;
              } else if (this.variableScopeStack[i].used[name] == true) {
                break;
              }
            }
          }
        }
      }
    },
    getVariables() {},
  };

  tokens.setTokenArray = (tArr) => {
    tokenArray = tArr;
  };
  tokens.setCommentArray = (cArr) => {
    commentArray = cArr;
  };

  let expression = (rightBindingPower, options) => {
    try {
      // console.log("NextToken", peekToken().name);
      let left = getNextToken().nullDenotation(options);
      // console.log("L", JSON.stringify(left, null, 4));
      while (rightBindingPower < peekToken().leftBindingPower) {
        // console.log("INSIDE1", peekToken().name, peekToken().leftBindingPower);
        left = getNextToken().leftDenotation(left, options);
        // console.log("L", left);
        // console.log("INSIDE2", peekToken().name, peekToken().leftBindingPower);
      }
      return left;
    } catch (error) {
      // For debugging (at this point, will be removed asap)
      // console.log("ERROR", error);

      let token = peekToken();
      // !TODO! Allow better error messages. Now error messages that tokens are emitting, are not shown =(
      throw new Error(`Syntax error at "${token.name}". Value: "${token.value}". Line: ${token.props?.line}, column: ${token.props?.column}.`);
    }
  };

  tokens.expression = expression;

  tokens.clearIndex = () => {
    tokenArrayIndex = -1;
  };

  tokens.template_literal_token = (value, props) => {
    return {
      name: "template_literal_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        let expressions = [];
        let quasis = [];
        do {
          let nextToken = peekToken();
          if (nextToken.name == "template_element_token") {
            quasis.push(expression(0));
          }
          if (nextToken.name == "template_expression_token") {
            expressions.push(expression(0));
            consumeToken("block_token");
          }
        } while (peekToken().name == "template_element_token" || peekToken().name == "template_expression_token");

        return createNudLoc(
          {
            type: "TemplateLiteral",
            expressions: expressions,
            quasis: quasis,
          },
          props
        );
      },
    };
  };

  tokens.template_element_token = (value, props) => {
    return {
      name: "template_element_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        return createNudLoc(
          {
            type: "TemplateElement",
            value: {
              raw: value,
              cooked: value,
            },
            tail: props.options?.tail == true ? true : false,
          },
          props
        );
      },
    };
  };

  tokens.template_expression_token = (value, props) => {
    return {
      name: "template_expression_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        return expression(0, { isParameterOrElement: true });
      },
    };
  };

  tokens.literal_token = (value, props) => {
    return {
      name: "literal_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        if (props.options && (props.options.type == "string" || props.options.type == "null")) {
          // String that does not contain any templates
          return createNudLoc(
            {
              type: value == "null" ? "NullLiteral" : "StringLiteral",
              value: value,
              extra: {
                raw: value,
              },
            },
            props
          );
        } else {
          return createNudLoc(
            {
              type: "NumericLiteral",
              value: Number(value),
              extra: {
                raw: value,
              },
            },
            props
          );
        }
      },
    };
  };

  tokens.identifier_token = (value, props) => {
    return {
      name: "identifier_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        return createNudLoc(
          {
            type: "Identifier",
            name: value.trim(),
          },
          props
        );
      },
    };
  };

  tokens.this_token = (value, props) => {
    return {
      name: "this_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        return createNudLoc(
          {
            type: "ThisExpression",
            name: value.trim(),
          },
          props
        );
      },
    };
  };

  tokens.regexp_literal_token = (value, props) => {
    return {
      name: "regexp_literal_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        return createNudLoc(
          {
            type: "RegExpLiteral",
            pattern: props.options.pattern,
            flags: props.options.flags,
          },
          props
        );
      },
    };
  };

  tokens.switch_statement_token = (value, props) => {
    return {
      name: "switch_statement_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: (options) => {
        discriminant = expression(0);
        consumeToken("end_token");
        cases = expression(0, options);

        // Check that cases has been at block
        if (cases.type == "BlockStatement") {
          cases = cases.body;
        } else {
          throw new Error("Cases must be in a block");
        }

        // Normal switch statement
        switchStatement = createLocation(
          {
            type: "SwitchStatement",
            discriminant: discriminant,
            cases: cases,
          },
          discriminant,
          cases[cases.length - 1],
          props
        );

        // We need to do quite massive wrapping if we want to support switch statement -> expression conversion
        if (options?.isParameterOrElement) {
          // Wrap consequent into CallExpression and ArrowFunctionExpression
          switchStatement = createLocation(
            {
              type: "CallExpression",
              callee: createLocation(
                {
                  type: "ArrowFunctionExpression",
                  params: [],
                  body: createLocation(
                    {
                      type: "BlockStatement",
                      body: [switchStatement],
                    },
                    switchStatement,
                    switchStatement,
                    props
                  ),
                },
                switchStatement,
                switchStatement,
                props
              ),
              arguments: [],
            },
            switchStatement,
            switchStatement,
            props
          );
        }

        return switchStatement;
      },
    };
  };

  tokens.switch_case_token = (value, props) => {
    return {
      name: "switch_case_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: (options) => {
        if (props.type == "default") {
          test = null;
        } else {
          test = expression(0);
        }
        consumeToken("end_token");
        consequent = expression(0);

        // Check that consequent has been at block
        if (consequent.type == "BlockStatement") {
          // If we have switch experession, cases should return value
          if (options?.isParameterOrElement) {
            convertBlockIntoExpressionInPlace(consequent);
            consequent = consequent.body;
          } else {
            consequent = consequent.body;
          }
          lastToken = consequent[consequent.length - 1];
          // Add break token to consequent (auto-break)
          consequent.push(createLocation({ type: "BreakStatement", label: null }, lastToken, lastToken, props));
        } else {
          throw new Error("Case must have a block");
        }

        return createNudLoc({ type: "SwitchCase", test: test, consequent: consequent }, props);
      },
    };
  };

  tokens.object_property_token = (value, props) => {
    function getPropertyStructure(value, props, propertyValue, keyValue) {
      let token = {
        type: "ObjectProperty",
        method: false,
        computed: props.computed == true,
        key: keyValue,
        value: propertyValue,
      };
      if (propertyValue.type == "Identifier" && keyValue.type == "Identifier" && propertyValue.name == keyValue.name) {
        token.shorthand = true;
        token.extra = { shorthand: true };
      }
      return createNudLoc(token, props);
    }
    return {
      name: "object_property_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: (options) => {
        let prevToken = peekToken(-1);

        // We support also computed object keys: let a = { [b]: 1 }
        let keyValue = null;
        if (props.computed) {
          keyValue = expression(0);
          if (keyValue.type == "ArrayExpression") {
            keyValue = keyValue.elements[0];
          } else {
            consumeToken("array_token", "]");
          }
        } else {
          if (props.options?.hasLiteralKey) {
            keyValue = expression(999);
          } else {
            keyValue = tokens.identifier_token(value, props).nullDenotation();
          }
        }
        // If this is the first property, we wrap this inside ObjectExpression
        let propertyValue = expression(0, { isParameterOrElement: true });

        // !TODO! This was supposed to fix the case where we have only single object expression, but seems it's working after fixes at object_expression
        // !TODO! Remove this isSingle system if found ok.
        let isSingle = false; //peekToken(1).name == "comma_token" && peekToken(2).name == "end_token";

        // !TODO! I don't like much about this idea about converting first token without block as ObjectExpression
        // would be nice to do some other way... But this was quite simple and quick to do this way.
        // Do not proceed as ObjectExpression if we don't have immediate object properties, but instead of comma and end (solves $ 'a', { b: 1 }, END, INDENT, $ 'b')
        if (options?.isFirstProperty != false && isSingle == false) {
          // && !(peekToken().name == "comma_token" && peekToken(2).name == "end_token")) {
          return tokens
            .object_expression_token("{", {
              withoutBlock: true,
              firstProperty: createNudLoc(
                {
                  type: "ObjectProperty",
                  method: false,
                  shorthand: false,
                  computed: props.computed == true,
                  key: keyValue,
                  value: propertyValue,
                },
                props
              ),
            })
            .nullDenotation();
        } else if (isSingle) {
          return createNudLoc(
            {
              type: "ObjectExpression",
              properties: [getPropertyStructure(value, props, propertyValue, keyValue)],
            },
            props
          );
        } else {
          return getPropertyStructure(value, props, propertyValue, keyValue);
        }
      },
    };
  };

  tokens.member_expression_token = (value, props) => {
    return {
      name: "member_expression_token",
      value: value,
      props: props,
      leftBindingPower: 81,
      leftDenotation: (left) => {
        let right = null;

        // If we have call expression that is in member expression notation, we take call expression to the top level.
        // Call expression is then called with leftDenotation
        // !TODO! I think this is a bug that I convert identifier to call expression. If I would leave identifier as identifier and then call expression would be just next token
        // this would work out of the box by the algorithm. I should fix this at some point.
        if (peekToken().name == "call_expression_token") {
          right = tokens.identifier_token(peekToken().value, props).nullDenotation();
        } else {
          // Handle member expressions inside the array, like:
          // let a = b.c[e.f];
          if (props.computed) {
            right = expression(0);
          } else {
            right = expression(200);
          }
        }

        if (props.computed) {
          consumeToken("array_token", "]");
        }

        return {
          type: value == "?." || left.type == "OptionalMemberExpression" ? "OptionalMemberExpression" : "MemberExpression",
          object: left,
          property: right,
          computed: props.computed == true,
          optional: value == "?.",
          start: left.start,
          end: right.end,
          loc: {
            start: left.loc.start,
            end: right.loc.end,
          },
        };
      },
    };
  };

  tokens.spread_element_token = (value, props) => {
    return {
      name: "spread_element_token",
      leftBindingPower: 81,
      props: props,
      value: value,
      nullDenotation: () => {
        let right = expression(0);
        return createLocation(
          {
            type: "SpreadElement",
            argument: right,
          },
          null,
          right,
          props
        );
      },
    };
  };

  tokens.export_token = (value, props) => {
    return {
      name: "export_token",
      value: value,
      props: props,
      nullDenotation: (options) => {
        sourceType = "module";
        let right = expression(0);
        if (props.type == "default") {
          return createLocation(
            {
              type: "ExportDefaultDeclaration",
              declaration: right,
            },
            null,
            right,
            props
          );
        } else {
          return createLocation(
            {
              type: "ExportNamedDeclaration",
              declaration: right,
              exportKind: "value", // For now we support only "value" export kinds
              source: null,
              specifiers: [], // For now we don't support specifiers
              assertions: [], // For now we don't support assertions
            },
            null,
            right,
            props
          );
        }
      },
    };
  };

  tokens.binary_expression_token = (value, props) => {
    return {
      name: "binary_expression_token",
      value: value,
      props: props,
      leftBindingPower: 80,
      leftDenotation: (left) => {
        let right = expression(80);
        return createLocation(
          {
            type: "BinaryExpression",
            left: left,
            right: right,
            operator: value,
          },
          left,
          right,
          props
        );
      },
    };
  };

  tokens.keyword_token = (value, props) => {
    return {
      name: "keyword_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        return value;
      },
    };
  };

  tokens.import_specifier_token = (value, props, importedToken, localToken) => {
    return {
      name: "import_specifier_token",
      value: value,
      props: props,
      nullDenotation: () => {
        return {
          type: props.default ? "ImportDefaultSpecifier" : "ImportSpecifier",
          imported: importedToken.nullDenotation(),
          local: localToken ? localToken.nullDenotation() : importedToken.nullDenotation(),
          importKind: null,
        };
      },
    };
  };

  tokens.import_declaration_token = (value, props) => {
    return {
      name: "import_declaration_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        sourceType = "module";
        let nextToken = peekToken().name;
        let skipComma = false;
        let importSpecifiers = [];

        // If we have default and then specifiers... like - import React, { useRef } from "react"
        if (nextToken != "block_token" && peekToken(2).name == "comma_token") {
          let identifier = consumeToken("identifier_token");
          skipComma = true;
          importSpecifiers.push(tokens.import_specifier_token(identifier.value, Object.assign(identifier.props, { default: true }), identifier).nullDenotation());
          consumeToken("comma_token");
          nextToken = peekToken().name;
        }

        // Normal - import { useRef, useState } from "react"
        if (nextToken == "block_token") {
          consumeToken("block_token");
          do {
            if (importSpecifiers.length > 0 && skipComma != true) {
              consumeToken("comma_token");
              if (peekToken().name == "end_token") {
                consumeToken("end_token");
              }
            }
            // We accept trailing comma in the list
            if (peekToken().name == "block_token") {
              break;
            }

            // Import with specifiers: import { NN as MMM } from "react"
            if (peekToken().name == "call_expression_token" && peekToken(2).name == "call_expression_token" && peekToken(2).value == "as") {
              let imported = consumeToken("call_expression_token");
              // Convert into identifier token
              imported = tokens.identifier_token(imported.value, imported.props);
              consumeToken("call_expression_token");
              let local = consumeToken("identifier_token");
              importSpecifiers.push(tokens.import_specifier_token(imported.value, imported.props, imported, local).nullDenotation());
            }
            // Normal
            else {
              let identifier = consumeToken("identifier_token");
              importSpecifiers.push(tokens.import_specifier_token(identifier.value, identifier.props, identifier).nullDenotation());
            }
            skipComma = false;
          } while (peekToken().name == "comma_token");
          consumeToken("block_token");
        }

        // Only default - import React from "react"
        else if (nextToken == "identifier_token") {
          let identifier = consumeToken("identifier_token");
          importSpecifiers.push(tokens.import_specifier_token(identifier.value, Object.assign(identifier.props, { default: true }), identifier).nullDenotation());
        }
        // Literal like: import "./assets/sass/style.sass"
        else if (nextToken == "literal_token") {
          return createNudLoc(
            {
              type: "ImportDeclaration",
              specifiers: [],
              source: consumeToken("literal_token").nullDenotation(),
            },
            props
          );
        }
        consumeToken("from_token");

        return createNudLoc(
          {
            type: "ImportDeclaration",
            specifiers: importSpecifiers,
            source: consumeToken("literal_token").nullDenotation(),
          },
          props
        );
      },
    };
  };

  tokens.variable_declarator_token = (value, props) => {
    return {
      name: "variable_declarator_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        let nextTokenName = peekToken().name;
        let idExpression = null;
        let idToken = null;
        let declaration = null;
        if (nextTokenName == "identifier_token") {
          // We need here set the variable to the stack
          idToken = consumeToken("identifier_token");
          variableStack.setDeclared(idToken.value);
        } else if (nextTokenName == "array_token") {
          idExpression = expression(90);
          idExpression.type = "ArrayPattern";
        } else if (nextTokenName == "object_expression_token") {
          idExpression = expression(90, { isVariableDeclaration: true });
          // Add also destructured variables to declared
          let isSomeAlreadyDeclared = false;
          let declareArray = [];
          for (let prop of idExpression.properties) {
            if (prop.type == "Identifier" && prop.name) {
              if (variableStack.isAlreadySetOrDeclared(prop.name)) {
                isSomeAlreadyDeclared = true;
              } else {
                declareArray.push(prop.name);
              }
            }
          }

          // Check if we really should add variable declaration...
          if (props.type == "autoCreated") {
            if (isSomeAlreadyDeclared) {
              // Here we set and declare the variables, because we don't use the "let" keyword
              for (let variableName of declareArray) {
                variableStack.set(variableName);
              }

              // If we already have declared some variables inside the destructuring, we should do some magic by creating expressionstatement
              if (peekToken().name == "assignment_expression_token") {
                consumeToken("assignment_expression_token", "=").value;
              }
              declaration = expression(0, { isParameterOrElement: true });
              return createLedLoc(
                {
                  type: "ExpressionStatement",
                  expression: {
                    type: "AssignmentExpression",
                    operator: "=",
                    left: idExpression,
                    right: declaration,
                  },
                  extra: {
                    parenthesized: true,
                  },
                },
                idExpression,
                declaration
              );
            }
          }
        }

        // Not necessary we have "=", but if yes, let's consume it
        if (peekToken().name == "assignment_expression_token") {
          consumeToken("assignment_expression_token", "=").value;
        }

        if (!(peekToken().name == "of_token" || peekToken().name == "in_token")) {
          // Allow define object properies in the next line
          if (peekToken(1).name == "end_token" && peekToken(2).name == "block_token" && (peekToken(3).name == "object_expression_token" || peekToken(3).name == "object_property_token")) {
            consumeToken("end_token");
          }

          // Allow to have the declaration on the next line
          if (peekToken().name == "end_token" && peekToken(2).name == "block_token") {
            consumeToken("end_token");
          }

          // Allow to have the declaration on the next line
          if (peekToken().name == "block_token") {
            consumeToken("block_token");
            declaration = expression(0, { isParameterOrElement: true });
            if (peekToken().name == "end_token" && peekToken(2).name == "block_token") {
              consumeToken("end_token");
            }
            consumeToken("block_token");
          } else {
            declaration = expression(0, { isParameterOrElement: true });
          }
        }

        return createLedLoc(
          {
            type: "VariableDeclaration",
            kind: value,
            declarations: [
              createLedLoc(
                {
                  type: "VariableDeclarator",
                  id: idExpression || idToken.nullDenotation(),
                  init: declaration,
                },
                idExpression || createStartLocHelper(idToken),
                declaration
              ),
            ],
          },
          createStartLocHelper({ props }),
          declaration
        );
      },
    };
  };

  tokens.if_statement_token = (value, props) => {
    return {
      name: "if_statement_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: (options) => {
        if (options?.hasScope) {
          options = Object.assign(options, { hasScope: false });
        }

        if (peekToken().name == "parenthesis_open_token") {
          skipNextToken();
        }

        let test = expression(0);
        let alternate = null;
        let nextToken = peekToken();

        // Support also if nnn then, or if(nnn) then...
        switch (nextToken.name) {
          case "end_token":
            skipNextToken();
            break;
          case "then_token":
            skipNextToken();
            break;
          case "parenthesis_close_token":
            skipNextToken();
            if (peekToken().name == "end_token") {
              skipNextToken();
            }
            break;
        }

        let consequent = expression(0, options);

        // Else can be in block or without block
        if (peekToken().name == "else_token") {
          consumeToken("else_token");
          alternate = expression(0);
        } else if (peekToken().name == "end_token" && peekToken(2).name == "else_token") {
          consumeToken("end_token");
          consumeToken("else_token");
          if (peekToken().name == "end_token") {
            consumeToken("end_token");
          }
          alternate = expression(0, options);
        }

        if (options && options.isParameterOrElement == true) {
          // If no alternate, we return undefined (void 8)
          if (!alternate) {
            alternate = {
              type: "UnaryExpression",
              prefix: true,
              operator: "void",
              argument: {
                type: "NumericLiteral",
                value: 8,
                raw: "8",
              },
            };
          }

          if (consequent.type == "BlockStatement") {
            consequent = wrapBodyIntoSequenceExpression(consequent.body);
          }
          if (alternate.type == "BlockStatement") {
            alternate = wrapBodyIntoSequenceExpression(alternate.body);
          }

          return createNudLoc(
            {
              type: "ConditionalExpression",
              test: test,
              consequent: consequent,
              alternate: alternate,
            },
            props
          );
        } else {
          // Make sure that consequent and alternate are created as blocks (babel generator will not do that)
          consequent = wrapIntoBlockStatementIfNotBlock(consequent);
          if (alternate?.type != "IfStatement") {
            alternate = wrapIntoBlockStatementIfNotBlock(alternate);
          }

          return createNudLoc(
            {
              type: "IfStatement",
              test: test,
              consequent: consequent,
              alternate: alternate,
            },
            props
          );
        }
      },
    };
  };

  tokens.for_statement_token = (value, props) => {
    return {
      name: "for_statement_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: (options) => {
        if (peekToken().name == "parenthesis_open_token") {
          skipNextToken();
        }

        // !TODO! Allow "then"
        let left = expression(0);
        let inConversion = false;
        if (peekToken().name == "in_token") {
          consumeToken("in_token");
          inConversion = true;
        } else {
          consumeToken("of_token");
        }
        let right = expression(0);

        // !TODO! We do now here the conversion of in -> .entries(). Maybe we don't want to do it here, but at processTokens instead.
        // We have to mangle the right if we would like to add .entries() around the right side of the "in"
        if (inConversion) {
          right = {
            type: "CallExpression",
            callee: {
              type: "MemberExpression",
              object: right,
              property: {
                type: "Identifier",
                name: "entries",
              },
              start: right.start,
              end: right.end,
              loc: right.loc,
            },
            start: right.start,
            end: right.end,
            loc: right.loc,
            arguments: [],
          };
        }

        consumeToken("end_token");

        // !URGENT TODO!
        // !TODO! NOW WE HAVE SCOPED THE FOR LOOP. PLEASE TAKE INTO ACCOUNT THE FOR LOOP VARIABLES.
        // WITH SCOPED APPROACH WE RECRATE THE FOR LOOP VARIABLES HERE.
        let body = expression(0, { hasScope: true });

        return createNudLoc(
          {
            type: "ForOfStatement",
            left: left,
            right: right,
            body: body,
          },
          props
        );
      },
    };
  };

  tokens.assignment_expression_token = (value, props) => {
    return {
      name: "assignment_expression_token",
      value: value,
      props: props,
      leftBindingPower: 90,
      leftDenotation: (left) => {
        let right;

        // := operator prevents to auto-assign into scope. Otherwise we set variable into stack.
        if (props.options.doNotAddToScope != true) {
          variableStack.set(left.name);
        }

        // Allow define object properies in the next line
        if (peekToken(1).name == "end_token" && peekToken(2).name == "block_token" && (peekToken(3).name == "object_expression_token" || peekToken(3).name == "object_property_token")) {
          consumeToken("end_token");
        }

        // Allow to have the declaration on the next line
        if (peekToken().name == "block_token") {
          consumeToken("block_token");
          right = expression(0);
          if (peekToken().name == "end_token" && peekToken(2).name == "block_token") {
            consumeToken("end_token");
          }
          consumeToken("block_token");
        } else {
          right = expression(0, { isParameterOrElement: true });
        }

        // let right = expression(0, { isParameterOrElement: true });
        return createLedLoc(
          {
            type: "AssignmentExpression",
            operator: value,
            left: left,
            right: right,
          },
          left,
          right
        );
      },
    };
  };

  // *************************
  // Arithmetic operators
  // *************************
  tokens.operator_add_token = (value, props) => {
    return {
      name: "operator_add_token",
      leftBindingPower: 10,
      props: props,
      value: value,
      leftDenotation: (left) => {
        let right = expression(10);
        return createLedLoc(
          {
            type: "BinaryExpression",
            left: left,
            right: right,
            operator: "+",
          },
          left,
          right
        );
      },
    };
  };

  tokens.operator_sub_token = (value, props) => {
    return {
      name: "operator_sub_token",
      leftBindingPower: 10,
      props: props,
      nullDenotation: () => {
        let right = expression(70);
        return createNudLoc(
          {
            type: "UnaryExpression",
            prefix: true,
            right: right,
            operator: value,
            argument: right,
          },
          props
        );
      },
      leftDenotation: (left) => {
        let right = expression(10);
        return createLedLoc(
          {
            type: "BinaryExpression",
            left: left,
            right: right,
            operator: "-",
          },
          left,
          right
        );
      },
    };
  };

  tokens.operator_mul_token = (value, props) => {
    return {
      name: "operator_mul_token",
      leftBindingPower: 20,
      props: props,
      leftDenotation: (left) => {
        let right = expression(20);
        return createLedLoc(
          {
            type: "BinaryExpression",
            left: left,
            right: right,
            operator: "*",
          },
          left,
          right
        );
      },
    };
  };

  tokens.operator_div_token = (value, props) => {
    return {
      name: "operator_div_token",
      leftBindingPower: 20,
      props: props,
      leftDenotation: (left) => {
        let right = expression(20);
        return createLedLoc(
          {
            type: "BinaryExpression",
            left: left,
            right: right,
            operator: "/",
          },
          left,
          right
        );
      },
    };
  };

  tokens.operator_mod_token = (value, props) => {
    return {
      name: "operator_mod_token",
      leftBindingPower: 20,
      props: props,
      leftDenotation: (left) => {
        let right = expression(20);
        return createLedLoc(
          {
            type: "BinaryExpression",
            left: left,
            right: right,
            operator: "%",
          },
          left,
          right
        );
      },
    };
  };

  tokens.operator_exp_token = (value, props) => {
    return {
      name: "operator_exp_token",
      leftBindingPower: 20,
      props: props,
      leftDenotation: (left) => {
        let right = expression(20);
        return createLedLoc(
          {
            type: "BinaryExpression",
            left: left,
            right: right,
            operator: "**",
          },
          left,
          right
        );
      },
    };
  };

  tokens.parenthesis_open_token = (value, props) => {
    return {
      name: "parenthesis_open_token",
      value: value,
      props: props,
      leftBindingPower: 50,
      nullDenotation: () => {
        let right = expression(0);
        // console.log("R", right);
        // console.log(peekToken());
        consumeToken("parenthesis_close_token");
        // console.log(peekToken());

        return right;
      },
    };
  };

  // *************************
  // Logical operators
  // *************************
  tokens.operator_logical_and_token = (value, props) => {
    return {
      name: "operator_add_token",
      leftBindingPower: 9,
      props: props,
      value: value,
      leftDenotation: (left) => {
        let right = expression(9);
        return createLedLoc(
          {
            type: "LogicalExpression",
            left: left,
            right: right,
            operator: "&&",
          },
          left,
          right
        );
      },
    };
  };

  tokens.operator_logical_or_token = (value, props) => {
    return {
      name: "operator_or_token",
      leftBindingPower: 9,
      props: props,
      value: value,
      leftDenotation: (left) => {
        let right = expression(9);
        return createLedLoc(
          {
            type: "LogicalExpression",
            left: left,
            right: right,
            operator: "||",
          },
          left,
          right
        );
      },
    };
  };

  tokens.unary_expression_token = (value, props) => {
    return {
      name: "unary_expression_token",
      leftBindingPower: 8,
      props: props,
      value: value,
      nullDenotation: () => {
        let right = expression(80);
        return createNudLoc(
          {
            type: "UnaryExpression",
            prefix: true,
            operator: value,
            argument: right,
          },
          props
        );
      },
    };
  };

  tokens.new_expression_token = (value, props) => {
    return {
      name: "new_expression_token",
      leftBindingPower: 8,
      props: props,
      value: value,
      nullDenotation: () => {
        let right = expression(70);
        return createNudLoc(
          {
            type: "NewExpression",
            callee: right.type == "CallExpression" ? right.callee : right,
            arguments: right.type == "CallExpression" ? right.arguments : [],
          },
          props
        );
      },
    };
  };

  tokens.yield_expression_token = (value, props) => {
    return {
      name: "yield_expression_token",
      leftBindingPower: 0,
      props: props,
      value: value,
      nullDenotation: () => {
        let right = expression(0);
        return createLocation(
          {
            type: "YieldExpression",
            prefix: true,
            operator: value,
            argument: right,
          },
          null,
          right,
          props
        );
      },
    };
  };

  tokens.await_expression_token = (value, props) => {
    return {
      name: "await_expression_token",
      leftBindingPower: 0,
      props: props,
      value: value,
      nullDenotation: () => {
        let right = expression(0);
        return createLocation(
          {
            type: "AwaitExpression",
            argument: right,
          },
          null,
          right,
          props
        );
      },
    };
  };

  tokens.try_statement_token = (value, props) => {
    return {
      name: "try_statement_token",
      leftBindingPower: 0,
      props: props,
      value: value,
      nullDenotation: () => {
        if (peekToken().name == "end_token") {
          consumeToken("end_token");
        }
        let block = expression(0);
        if (peekToken().name == "end_token") {
          consumeToken("end_token");
        }
        let handler = expression(0);
        return createLocation(
          {
            type: "TryStatement",
            block: block,
            handler: handler,
          },
          null,
          handler,
          props
        );
      },
    };
  };

  tokens.catch_clause_token = (value, props) => {
    return {
      name: "catch_clause_token",
      leftBindingPower: 0,
      props: props,
      value: value,
      nullDenotation: () => {
        let param = expression(0);
        if (peekToken().name == "end_token") {
          consumeToken("end_token");
        }
        let body = expression(0);
        return createLocation(
          {
            type: "CatchClause",
            param: param,
            body: body,
          },
          null,
          body,
          props
        );
      },
    };
  };

  // *************************
  // Functions
  // *************************
  tokens.return_statement_token = (value, props) => {
    return {
      name: "return_statement_token",
      leftBindingPower: 0,
      props: props,
      nullDenotation: (options) => {
        if (peekToken(1).name == "end_token" && (peekToken(2).name == "block_token" || peekToken(2).name == "object_expression_token")) {
          consumeToken("end_token");
        }
        // handle case where we use do before block: return_token do_token end_token block_token
        if (peekToken().name == "do_token" && peekToken(2).name == "end_token") {
          consumeToken("do_token");
          consumeToken("end_token");
        }

        let argument;
        // We do not make expression statement in Arrow Function the case of RETURN + BLOCK + STATEMENT. That's because it's more of return statement.
        if (peekToken().name == "block_token") {
          if (options?.isArrayFunction == true) {
            argument = expression(0, { noExpressionStatement: true });
          }
        } else {
          argument = expression(0);
        }

        // If return is returning block with multiple items in body, we change it into array
        if (argument.type == "BlockStatement") {
          if (argument.body.length > 1) {
            argument = {
              type: "ArrayExpression",
              elements: argument.body,
            };
          }
          // New feature 20220610, return does not return block statements anymore
          else {
            argument = argument.body[0];
          }
        }

        return createNudLoc(
          {
            type: "ReturnStatement",
            argument: argument,
          },
          props
        );
      },
    };
  };

  // We can call immediately
  tokens.do_token = (value, props) => {
    return {
      name: "do_token",
      value: value,
      props: props,
      leftBindingPower: 30,
      nullDenotation: () => {
        let expr = null;
        let callThis = false;

        // do.this... we call using this as parameter
        if (peekToken().name == "member_expression_token" && peekToken(2).name == "call_expression_token" && peekToken(2).value == "this") {
          consumeToken("member_expression_token");
          consumeToken("call_expression_token");
          let functionToken = peekToken();
          expr = {
            type: "MemberExpression",
            object: expression(0, { isDo: true }),
            property: {
              type: "Identifier",
              name: "call",
            },
          };
          callThis = true;
        } else {
          expr = expression(0, { isDo: true });
        }

        return createNudLoc(
          {
            type: "CallExpression",
            callee: expr,
            arguments: callThis ? [{ type: "ThisExpression" }] : [],
            extra: callThis ? { parenthesized: true, parenStart: props.start } : null,
          },
          props
        );
      },
    };
  };

  function getCallParameters() {
    let params = [];
    // Handling the following case:
    // let a = b do
    //   c: 1
    //   , d, e, f
    let hasIndentBlock = peekToken().value == "INDENT" ? true : false;

    // Allow empty lines before first arguments
    if (peekToken().name == "end_token") {
      consumeToken("end_token");
    }

    do {
      if (params.length > 0) {
        consumeToken("comma_token");
      }

      if (peekToken().name == "parenthesis_open_token") {
        consumeToken("parenthesis_open_token");
      }

      if (peekToken().name == "end_token" && peekToken(2).name == "block_token") {
        consumeToken("end_token");
        let paramsExpression = null;

        // Allow using multi-line object expression directly in the parameters (with indentation)
        if (peekToken(2) == "object_property_token") {
          consumeToken("block_token");
        }
        paramsExpression = expression(5, { isParameterOrElement: true });
        params = params.concat(paramsExpression.body ? paramsExpression.body : paramsExpression);
      } else if (peekToken().name == "parenthesis_close_token") {
        // We don't do anything now if parentheses immediately close.
      } else {
        let myParams = expression(5, { isParameterOrElement: true });

        // Allow call with parameters in block
        // myFunction do
        //   c 1
        //   d 2
        if (myParams.type == "BlockStatement") {
          params = params.concat(myParams.body);
        } else {
          params.push(myParams);
        }
      }

      // Enable call expression with function parameter and then other parameters, like:
      // useEffect ->
      //   return a
      // , [];
      if (peekToken().name == "end_token" && peekToken(2).name == "comma_token") {
        consumeToken("end_token");
      }
    } while (peekToken().name == "comma_token");

    if (peekToken().name == "parenthesis_close_token") {
      consumeToken("parenthesis_close_token");
    }

    if (hasIndentBlock && params.length > 1) {
      if (peekToken().name == "end_token") {
        consumeToken("end_token");
      }
      if (peekToken().name == "block_token") {
        consumeToken("block_token");
      }
    }

    return params;
  }

  // !TODO! add locations to return
  tokens.parenthesized_call_expression_token = (value, props, token) => {
    return {
      name: "parenthesized_call_expression_token",
      leftBindingPower: 91,
      value: value,
      props: props,
      leftDenotation: (left) => {
        let params = getCallParameters();
        left.extra = { ...left.extra, ...{ parenthesized: true, parenStart: left.start - 1 } };

        return createLocation(
          {
            type: "CallExpression",
            callee: left,
            arguments: params,
          },
          left,
          params,
          props
        );
      },
    };
  };

  tokens.expression_statement_token = (value, props, token) => {
    return {
      name: "expression_statement_token",
      leftBindingPower: 91,
      value: value,
      props: props,
      nullDenotation: (callee) => {
        let myExpression = expression(0);
        if (callee?.isParameterOrElement) {
          return myExpression;
        } else {
          return createNudLoc(
            {
              type: "ExpressionStatement",
              expression: myExpression,
            },
            props
          );
        }
      },
    };
  };

  // !TODO! add locations to return
  tokens.call_expression_token = (value, props, token) => {
    return {
      name: "call_expression_token",
      leftBindingPower: 90,
      value: value,
      props: props,
      nullDenotation: (callee) => {
        let params = getCallParameters();
        let myCallee = callee?.type == "CallExpression" ? callee : token.nullDenotation();

        return createLocation(
          {
            type: "CallExpression",
            callee: myCallee,
            arguments: params,
          },
          myCallee,
          params,
          props
        );
      },
      leftDenotation: (left) => {
        let params = getCallParameters();
        return createLocation(
          {
            type: left.type == "OptionalMemberExpression" ? "OptionalCallExpression" : "CallExpression",
            callee: left,
            arguments: params,
          },
          left,
          params,
          props
        );
      },
    };
  };

  tokens.array_token = (value, props) => {
    return {
      name: "array_token",
      leftBindingPower: 40,
      value: value,
      props: props,
      nullDenotation: () => {
        let elements = [];
        let isBlock = false;

        // Allow having block inside array. In that case each line is array value
        if (peekToken().name == "end_token" && peekToken(2).name == "block_token") {
          isBlock = true;
          consumeToken("end_token");
          consumeToken("block_token");
        }

        do {
          if (elements.length > 0) {
            if (isBlock && peekToken().name == "end_token") {
              consumeToken("end_token");
            } else {
              // We have trailing comma on array block
              if (isBlock && peekToken().name == "comma_token" && peekToken(2).name == "end_token" && peekToken(3).name == "block_token" && peekToken(4).name == "end_token") {
                consumeToken("comma_token");
                consumeToken("end_token");
                consumeToken("block_token");
                consumeToken("end_token");
                break;
              }
              consumeToken("comma_token");
            }
          }
          // Close at dedent
          if (isBlock && peekToken().name == "block_token" && peekToken().value == "DEDENT") {
            consumeToken("block_token");
            consumeToken("end_token");
            break;
          }
          // Add array element
          else if (peekToken().name != "array_token" && peekToken().value != "]") {
            if (peekToken().name == "end_token") {
              consumeToken("end_token");
            }
            // Allow null element in array like in: const [, setMyVar] = useState();
            if (peekToken().name == "comma_token") {
              elements.push(null);
            }

            // Push element expression
            else {
              elements.push(expression(0, { isParameterOrElement: true }));
            }
          }
        } while (peekToken().name == "comma_token" || (isBlock && peekToken().name == "end_token"));

        // Object must be closed
        consumeToken("array_token", "]");

        return createNudLoc(
          {
            type: "ArrayExpression",
            elements: elements,
          },
          props
        );
      },
    };
  };

  // !TODO! add locations to return
  tokens.object_expression_token = (value, props) => {
    return {
      name: "object_expression_token",
      leftBindingPower: 40,
      value: value,
      props: props,
      nullDenotation: (options) => {
        let properties = [];
        // If we already has the first token, we should then add it. This can happen, if we don't use blocks to define the object_expression... and instead this expression is
        // created by the first property
        if (props.firstProperty) {
          properties.push(props.firstProperty);
          if (peekToken().name == "end_token" && peekToken(2).name == "object_property_token") {
            consumeToken("end_token");
          }
        } else {
          if (peekToken().name == "identifier_token") {
            objectProperty = expression(0, { isFirstProperty: properties.length <= 0 && props.hasBlock != true });
            objectProperty = createNudLoc(
              {
                type: "ObjectProperty",
                method: false,
                shorthand: true,
                extra: {
                  shorthand: true,
                },
                computed: false,
                key: objectProperty,
                value: objectProperty,
              },
              props
            );
            properties.push(objectProperty);
          }
        }

        while (
          (peekToken().name == "comma_token" && (peekToken(2).name == "object_property_token" || peekToken(2).name == "spread_element_token" || peekToken(2).name == "array_token")) ||
          (!props.firstProperty && peekToken(2).name == "identifier_token") ||
          peekToken().name == "object_property_token" ||
          peekToken().name == "spread_element_token"
        ) {
          if (peekToken().name == "comma_token") {
            consumeToken("comma_token");
          }

          let objectProperty = null;
          let nextToken = peekToken();
          let nextTokenName = nextToken.name;
          if (nextTokenName == "array_token") {
            objectProperty = tokens.object_property_token(nextToken.value, { ...nextToken.props, computed: true }).nullDenotation({ isFirstProperty: false });
          } else {
            objectProperty = expression(0, { isFirstProperty: properties.length <= 0 && props.hasBlock != true });
          }

          // We allow also single identifiers - that needs to be converted to object properties
          if (nextTokenName == "identifier_token") {
            objectProperty = createNudLoc(
              {
                type: "ObjectProperty",
                method: false,
                shorthand: true,
                extra: {
                  shorthand: true,
                },
                computed: false,
                key: objectProperty,
                value: objectProperty,
              },
              props
            );
          }
          properties.push(objectProperty);

          // Allow also adding properties without commas (to the next line)
          if (properties.length > 0 && peekToken().name == "end_token" && peekToken(2).name == "object_property_token") {
            consumeToken("end_token");
          }
        }

        // !TODO! We don't always close object expression using }. For example we can just add "a: b"
        if (props.hasBlock == true) {
          if (props.blockValue == "{") {
            consumeToken("block_token", "}");
          } else if (props.blockValue == "INDENT") {
            // Fix case where you have END_TOKEN BLOCK_TOKEN(INDENT)
            if (peekToken().name == "end_token") {
              consumeToken("end_token");
            }
            // We can have object expression as function parameterers block, like
            // let a = myFunction do
            //   a: 1
            //   , 1, 2, 3 # rest of the function parameters
            if (peekToken().name != "comma_token") {
              consumeToken("block_token", "DEDENT");
            }
          }
        }
        return createLocation(
          {
            type: props.type == "ObjectPattern" ? "ObjectPattern" : "ObjectExpression",
            properties: properties,
          },
          properties,
          properties,
          props
        );
      },
    };
  };

  tokens.end_token = (value, props) => {
    return {
      name: "end_token",
      leftBindingPower: 0,
      props: props,
    };
  };

  // !TODO! add locations to return
  tokens.block_token = (value, props) => {
    return {
      name: "block_token",
      leftBindingPower: 0,
      value: value,
      props: props,
      nullDenotation: (options) => {
        let body = [];

        // Functions have scope
        let hasScope = options?.hasScope;
        variableStack.push(hasScope);

        do {
          if (peekToken().name != "block_token") {
            // Maybe would be better to add returned exression if it's statement. But now we do it here (easy for now).
            let myExpression = expression(0, options);

            // Maybe would be better to add returned exression if it's statement. But now we do it here (easy for now).
            if (!notExpressionStatements.includes(myExpression.type) && options?.noExpressionStatement != true && !options?.isParameterOrElement) {
              body.push({
                type: "ExpressionStatement",
                expression: myExpression,
                start: myExpression.start,
                end: myExpression.end,
                loc: myExpression.loc,
              });
            } else {
              body.push(myExpression);
            }
          }
          while (peekToken().name == "end_token") {
            consumeToken("end_token");
          }
        } while (peekToken().name != "block_token" && peekToken().value != "}");
        consumeToken("block_token");

        variableStack.addVariablesToBody(body, hasScope);

        if (body.length > 0) {
          return {
            type: "BlockStatement",
            body: body,
            start: body[0].start,
            end: body[body.length - 1].end,
            loc: {
              start: body[0].loc.start,
              end: body[body.length - 1].loc.end,
            },
          };
        } else {
          if (options?.isParameterOrElement && value == "{") {
            return createNudLoc({ type: "ObjectExpression", properties: [] }, props);
          } else {
            return createNudLoc({ type: "BlockStatement", body: [] }, props);
          }
        }
      },
    };
  };

  // !TODO! add locations to return
  tokens.function_token = (value, props) => {
    return {
      name: "function_token",
      leftBindingPower: 30,
      value: value,
      props: props,
      nullDenotation: (options) => {
        let params = [];
        let insertBlock = false;
        do {
          if (params.length > 0) {
            consumeToken("comma_token");
          }
          if (peekToken().name != "parenthesis_close_token") {
            params.push(expression(5));
          }
        } while (peekToken().name == "comma_token");
        consumeToken("parenthesis_close_token");

        let arrowToken = consumeToken("arrow_token");

        // Fix case where there is linefeed
        if (peekToken().name == "end_token" && peekToken(2).name == "block_token") {
          consumeToken("end_token");
        }

        // For single arrow (normal function()), we need to create also a block
        let body = null;
        if (
          peekToken().name != "block_token" &&
          (arrowToken.value == "->" || arrowToken.value == "->>") &&
          !(peekToken().name == "return_statement_token" && peekToken(2).name == "end_token" && peekToken(3).name == "block_token")
        ) {
          variableStack.push();
          body = expression(5, { hasScope: true });
          variableStack.addVariablesToBody(body);

          // Check if we should have return statement
          if (!notExpressionStatements.includes(body.type)) {
            body = createLocation(
              {
                type: "ReturnStatement",
                argument: body,
              },
              body,
              body,
              props
            );
          }

          body = createLocation(
            {
              type: "BlockStatement",
              body: [body],
            },
            body,
            body,
            props
          );
        } else {
          body = expression(5, { isArrayFunction: true, hasScope: true });
        }

        // NEW CODE 2022 06 10. return does not return blocks anymore.
        if (
          (arrowToken && body?.type == "ReturnStatement") ||
          ((body.argument?.type == "ObjectExpression" || body.argument?.type == "ArrayExpression") && arrowToken.value != "=>" && arrowToken.value != "=>>")
        ) {
          if (arrowToken.value == "->" || arrowToken.value == "->>") {
            argument = body.argument;
            body = { type: "BlockStatement", body: [{ type: "ReturnStatement", argument: body.argument }] };
          } else {
            body = body.argument;
          }
        }

        // With do we have immediate call and then we should have parenthesized
        let extra = null;
        if (options?.isDo == true) {
          extra = { parenthesized: true, parenStart: props.start };
        }

        // Update 14.5.2022. After much thinking I have decided that like in Rust
        // the final expression in the function will be used as return value. Rust is awesome language, so let's do it their way.
        // CoffeeScript and LiveScript also has this feature, but they have more extreme "everything is an expression" rules.
        // !TODO! Do not create it here, but instead tell to the expressions also that they can be used as return value.
        if (body.type == "BlockStatement" && body.body.length > 0 && arrowToken.props?.options?.disableImplicitReturn != true) {
          convertBlockIntoExpressionInPlace(body);
        }

        return createNudLoc(
          {
            type: arrowToken.value == "=>>" || arrowToken.value == "=>" ? "ArrowFunctionExpression" : "FunctionExpression",
            expression: true,
            params: params,
            body: body,
            async: arrowToken.value == "=>>" || arrowToken.value == "->>",
            generator: arrowToken.value == "->*",
            extra: extra,
          },
          props
        );
      },
    };
  };

  // !TODO! add locations to return
  tokens.function_declaration_token = (value, props) => {
    return {
      name: "function_declaration_token",
      leftBindingPower: 30,
      value: value,
      props: props,
      nullDenotation: () => {
        const name = expression();
        // Get function
        const myFunction = expression();
        myFunction.type = "FunctionDeclaration";
        myFunction.id = name;
        return myFunction;
      },
    };
  };

  tokens.program_token = (value, props) => {
    return {
      name: "program_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        let body = [];
        variableStack.push(true);

        while (tokenArrayIndex < tokenArray.length - 1) {
          let myExpression = expression(0);

          // Maybe would be better to add returned exression if it's statement. But now we do it here (easy for now).
          if (!notExpressionStatements.includes(myExpression.type)) {
            body.push({
              type: "ExpressionStatement",
              expression: myExpression,
              start: myExpression.start,
              end: myExpression.end,
              loc: myExpression.loc,
            });
          } else {
            body.push(myExpression);
          }
          tokenArrayIndex = tokenArrayIndex + 1;
        }

        variableStack.addVariablesToBody(body);

        let lastBodyElement = body[body.length - 1];

        return {
          type: "Program",
          body: body,
          sourceType: sourceType,
          interpreter: null,
          directives: [],
          start: 0,
          end: lastBodyElement.end,
          loc: {
            start: {
              line: 1,
              column: 0,
            },
            end: lastBodyElement.loc?.end,
          },
        };
      },
    };
  };

  tokens.file_token = (value, props) => {
    return {
      name: "file_token",
      value: value,
      props: props,
      leftBindingPower: 0,
      nullDenotation: () => {
        let program = expression(0);
        let lastBodyElement = program.body[program.body.length - 1];
        return {
          type: "File",
          program: program,
          comments: commentArray,
          start: 0,
          end: lastBodyElement.end,
          loc: {
            start: {
              line: 1,
              column: 0,
            },
            end: lastBodyElement.loc?.end,
          },
        };
      },
    };
  };

  //
  // Helper functions
  //

  //
  // Token process helpers
  //
  let getNextToken = () => {
    tokenArrayIndex = tokenArrayIndex + 1;
    return tokenArray[tokenArrayIndex];
  };

  let skipNextToken = () => {
    tokenArrayIndex = tokenArrayIndex + 1;
  };

  let getCurrentToken = () => {
    return tokenArray[tokenArrayIndex];
  };

  let getPreviousToken = () => {
    return tokenArray[tokenArrayIndex - 1];
  };

  let peekToken = (index = 1) => {
    return tokenArray[tokenArrayIndex + index] || {};
  };

  let consumeToken = (tokenName, tokenValue) => {
    let nextAvailableToken = peekToken();
    if (nextAvailableToken.name == tokenName) {
      if (tokenValue && nextAvailableToken.value != tokenValue) {
        throw new Error(
          `Expected "${tokenName}", but found "${nextAvailableToken.name}" with value "${nextAvailableToken.value}" instead. Line: ${nextAvailableToken.props?.line}, column: ${
            nextAvailableToken.props?.column + 1
          }`
        );
      }
      return getNextToken();
    } else {
      throw new Error(
        `Expected "${tokenName}", but found "${nextAvailableToken.name}" with value "${nextAvailableToken.value}" instead. Line: ${nextAvailableToken.props?.line}, column: ${
          nextAvailableToken.props?.column + 1
        }`
      );
    }
  };

  let wrapIntoBlockStatementIfNotBlock = (token) => {
    if (token && token.type != "BlockStatement") {
      return {
        type: "BlockStatement",
        body: [token],
      };
    } else {
      return token;
    }
  };

  let wrapBodyIntoSequenceExpression = (body) => {
    if (body.length > 1) {
      return createLocation(
        {
          type: "SequenceExpression",
          expressions: body,
          extra: {
            parenthesized: true,
          },
        },
        body[0],
        body[body.length - 1],
        null
      );
    } else {
      return body[0];
    }
  };

  //
  // Location helpers
  //

  let createLedLoc = (tokenData, left, right) => {
    if (right && right.loc && right.loc.end && left && left.loc) {
      tokenData.start = left.start;
      tokenData.end = right.end;
      tokenData.loc = {
        start: {
          line: left.loc.start.line,
          column: left.loc.start.column,
        },
        end: {
          line: right.loc.end.line,
          column: right.loc.end.column,
        },
      };
    }
    return tokenData;
  };

  let createStartLocHelper = (token) => {
    return {
      start: token.props.start,
      loc: {
        start: {
          line: token.props.line,
          column: token.props.column,
        },
      },
    };
  };

  // Null denotation propss
  let createNudLoc = (tokenData, loc) => {
    tokenData.start = loc.start;
    tokenData.end = loc.end;
    tokenData.loc = {
      start: {
        line: loc.line,
        column: loc.column,
      },
      end: {
        line: loc.line,
        column: loc.column + loc.length,
      },
    };
    return tokenData;
  };

  let createStartOrEndLocation = (t, type, lr, props) => {
    // Left/Right element can be also array of elements. Then we take the last one for end and first one for start
    let elem = lr && lr.length ? (type == "end" ? lr[lr.length - 1] : lr[0]) : lr;
    // Use element, or construct from property
    elem = elem && elem[type] && elem.loc[type] ? elem : { ...props, ...{ loc: { [type]: { line: props.line, column: props.column } } } };
    t[type] = elem[type];
    t.loc[type] = {
      line: elem.loc[type].line,
      column: elem.loc[type].column,
    };
    return t;
  };

  let createLocation = (t, left, right, props) => {
    t.loc = {};
    t = createStartOrEndLocation(t, "start", left, props);
    t = createStartOrEndLocation(t, "end", right, props);
    return t;
  };

  let convertBlockIntoExpressionInPlace = (body) => {
    let lastElement = body.body[body.body.length - 1];

    // IF last element is expression, then we can use it as return value by converting ExpressionStatement to ReturnStatement
    if (lastElement.type == "ExpressionStatement") {
      lastElement.type = "ReturnStatement";
      lastElement.argument = lastElement.expression;
      delete lastElement.expression;
    }
    // If last element is ObjectExpression, then we can use it as return value by adding ReturnStatement
    else if (lastElement.type == "ObjectExpression") {
      body.body[body.body.length - 1] = createLocation({ type: "ReturnStatement", argument: lastElement }, lastElement, lastElement, props);
    } else if (lastElement.type == "IfStatement") {
      // This is pretty hard. I thought that maybe we could do the if branch converting in if token, but seems
      // it's easiest to understand the block structure in this point and do the conversions.

      // Convert all if token branch block last elements into return statements
      // !TODO! Convert also try catch blocks the same way.
      let convertIfBranches = (branch) => {
        // We should convert both alternate and consequent blocks
        for (type of ["consequent", "alternate"]) {
          if (branch[type]?.type == "IfStatement") {
            convertIfBranches(branch[type]);
          } else if (branch[type]?.type == "BlockStatement") {
            let lastElement = branch[type].body[branch[type].body.length - 1];
            if (lastElement.type == "ExpressionStatement") {
              lastElement.type = "ReturnStatement";
              lastElement.argument = lastElement.expression;
              delete lastElement.expression;
            } else if (lastElement.type == "IfStatement") {
              convertIfBranches(lastElement);
            }
          }
        }
      };
      convertIfBranches(lastElement);
    }
  };

  return tokens;
};
