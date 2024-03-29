let { INDENT, DEDENT, TERM, NEWLINE } = require("./specialTokens");
let getTokens = require("../tokens/tokens");
let processTokens = require("./processTokens");
let handleTemplateLiteral = require("./handleTemplateLiteral");

module.exports = class Tokenizer {
  constructor(text) {
    this.t = getTokens();
    this.text = text;
    this.line = 1;
    this.column = 0;
    this.textPos = 0;
    this.templatePositions = [];
    this.tokenArray = [];
    this.commentArray = [];
    this.t.setTokenArray(this.tokenArray);
    this.t.setCommentArray(this.commentArray);
  }

  tokenize() {
    // Start with file and program tokens
    this.addToken(this.t.file_token);
    this.addToken(this.t.program_token);

    // If token is added without function, the token is always consumed by other tokens
    // Yes, it could be simpler just to split first tokens using regexp.
    // But I want to keep full control about tokenazion using just plain javascript. It's actually pretty convenient
    textLoop: for (this.textPos; this.textPos < this.text.length; ) {
      let disableImplicitReturn = false;

      if (this.processTemplateLiterals()) {
        continue textLoop;
      }

      switch (this.text.charAt(this.textPos)) {
        case " ":
          break;
        case ",":
          this.addToken("comma_token", ",");
          break;
        case "@":
          this.addToken(this.t.this_token, "@");
          this.addToken(this.t.member_expression_token, ".");
          break;
        case "[":
          let token = this.addToken(this.t.array_token, "[");
          if (this.text.charAt(this.textPos - 1) != " ") {
            token.props.noWhitespace = true;
          }
          break;
        case "]":
          this.addToken("array_token", "]");
          break;
        case "(":
          let prevChar = this.text.charAt(this.textPos - 1);
          // This "whiteSpace / nonWhiteSpace" used to allow creation of named functions like "export default a() => b"
          this.addToken(this.t.parenthesis_open_token, "(", { type: prevChar == " " || prevChar == "" || prevChar == "\n" || prevChar == "(" ? "whiteSpace" : "nonWhiteSpace" });
          break;
        case ")":
          this.addToken("parenthesis_close_token", ")");
          break;
        case "{":
          this.addToken(this.t.block_token, "{");
          break;
        case "}":
          this.addToken(this.t.block_token, "}");
          break;
        case "+":
          this.addToken(this.t.operator_add_token, "+");
          break;
        case "~":
          this.addToken(this.t.unary_expression_token, "~");
          break;
        case "^":
          this.addToken(this.t.binary_expression_token, "^");
          break;
        case "*":
          if (this.testAndEatFoundChar(this.text, "*")) {
            this.addToken(this.t.operator_exp_token, "**");
          } else {
            this.addToken(this.t.operator_mul_token, "*");
          }
          break;
        case "/":
          // Check that if this is regular expression
          // For performance reasons maximum length for regexp is 50 characters
          if (this.peekChar(this.text) != " ") {
            // Check if this is regular expression using regular expression. Return patter and flags as match groups.
            let regexpMatch = this.text.substring(this.textPos, this.textPos + 50).match(/^\/(.*?)\/([igmsuy]*)/);
            if (regexpMatch) {
              this.addToken(this.t.regexp_literal_token, "/" + regexpMatch[1] + "/" + regexpMatch[2], { pattern: regexpMatch[1], flags: regexpMatch[2] });
              this.textPos += regexpMatch[0].length;
              this.column += regexpMatch[0].length;
              continue textLoop;
            }
          }
          this.addToken(this.t.operator_div_token, "/");
          break;
        case "%":
          this.addToken(this.t.operator_mod_token, "%");
          break;
        case "&":
          if (this.testAndEatFoundChar(this.text, "&")) {
            this.addToken(this.t.logical_expression_token, "&&");
          } else {
            this.addToken(this.t.binary_expression_token, "&");
          }
          break;
        case "|":
          if (this.testAndEatFoundChar(this.text, "|")) {
            this.addToken(this.t.logical_expression_token, "||");
          } else {
            this.addToken(this.t.binary_expression_token, "|");
          }
          break;
        case "!":
          // If this is to prevent function implicit return
          if ((this.peekChar(this.text) == "=" || this.peekChar(this.text) == "-") && this.peekChar(this.text, 2) == ">") {
          } else {
            if (this.testAndEatFoundChar(this.text, "=")) {
              this.addToken(this.t.binary_expression_token, "!==");
            } else {
              this.addToken(this.t.unary_expression_token, "!");
            }
          }
          break;
        case "=":
          disableImplicitReturn = this.peekChar(this.text, -1) == "!";
          // !TODO! refactor this
          if (this.testAndEatFoundChar(this.text, ">")) {
            if (this.text.charAt(this.textPos + 1) == ">") {
              this.addToken("arrow_token", "=>>", { disableImplicitReturn });
              this.advanceString();
            } else {
              this.addToken("arrow_token", "=>", { disableImplicitReturn });
            }
          } else if (this.testAndEatFoundChar(this.text, "=")) {
            this.addToken(this.t.binary_expression_token, "===");
          } else {
            this.addToken(this.t.assignment_expression_token, "=");
          }
          break;
        case "-":
          disableImplicitReturn = this.peekChar(this.text, -1) == "!";
          // !TODO! refactor this
          if (this.testAndEatFoundChar(this.text, ">")) {
            if (this.peekChar(this.text) == ">") {
              this.addToken("arrow_token", "->>", { disableImplicitReturn });
              this.advanceString();
            } else if (this.peekChar(this.text) == "*") {
              this.addToken("arrow_token", "->*", { disableImplicitReturn });
              this.advanceString();
            } else {
              this.addToken("arrow_token", "->", { disableImplicitReturn });
            }
          } else {
            // If next character is a number (test with regexp), then this is a minus operator
            if (this.peekChar(this.text) != " " && this.peekChar(this.text).match(/[0-9]/)) {
              // Create literal token by getting all numbers that follows the minus sign
              let number = this.text.substring(this.textPos).match(/^-?[0-9]+(\.[0-9]+)?/)[0];
              this.addToken(this.t.literal_token, number, { value: parseFloat(number) });
              this.textPos += number.length;
              this.column += number.length;
              continue textLoop;
            } else {
              this.addToken(this.t.operator_sub_token, "-");
            }
          }
          break;
        case "\n":
          this.addToken(this.t.end_token, "\n");
          this.line++;
          this.column = 0;
          break;
        case ";":
          this.addToken(this.t.end_token, ";");
          this.line++;
          this.column = 0;
          break;
        case TERM:
          this.addToken(this.t.end_token, TERM);
          break;
        case '"':
          this.column++;
          this.textPos++;
          this.templatePositions = handleTemplateLiteral(this.text, this.textPos);
          if (this.templatePositions.length > 0) {
            this.addToken(this.t.template_literal_token, "", this.templatePositions);
            this.textPos = this.textPos - 2;
          } else {
            let currentPosition = { line: this.line, column: this.column, textPos: this.textPos };
            this.addToken(this.t.literal_token, this.consumeString(['"'], this.text, true), { type: "string", ...currentPosition });
          }
          this.column++;
          this.textPos++;
          break;
        case "'":
          this.column++;
          this.textPos++;
          let currentPosition = { line: this.line, column: this.column, textPos: this.textPos };
          this.addToken(this.t.literal_token, this.consumeString(["'"], this.text, true), {
            type: "string",
            ...currentPosition,
          });
          this.column++;
          this.textPos++;
          break;
        case INDENT:
          this.addToken(this.t.block_token, "INDENT");
          break;
        case DEDENT:
          this.addToken(this.t.block_token, "DEDENT");
          break;
        case "#":
          this.addComment(this.text);
          break;
        // !!! WARNING !!! This case uses fallthrough to default if ?? is not found. Please do not move this.
        case "?":
          // Only match and break if we have "??"
          if (this.testAndEatFoundChar(this.text, "?")) {
            this.addToken(this.t.logical_expression_token, "??");
            break;
          }
        default:
          // String tokens
          let previousCharacter = this.text.charAt(this.textPos - 1);
          let tmpTokenString = this.consumeString([" ", TERM, INDENT, DEDENT, "\n", ",", ".", ":", ";", "(", ")", "[", "]", "{", "}", "?", "+"], this.text);

          switch (tmpTokenString) {
            // Keywords
            case "let":
              this.addToken(this.t.variable_declarator_token, tmpTokenString, null, true);
              break;
            case "UNSAFE_var":
              this.addToken(this.t.variable_declarator_token, 'var', null, true);
              break;
            case "const":
              this.addToken(this.t.variable_declarator_token, tmpTokenString, null, true);
              break;
            case "if":
              this.addToken(this.t.if_statement_token, tmpTokenString, null, true);
              break;
            case "else":
              this.addToken("else_token", tmpTokenString, null, true);
              break;
            case "then":
              if (previousCharacter != ".") {
                this.addToken("then_token", tmpTokenString, null, true);
              } else {
                this.addToken(this.t.call_expression_token, tmpTokenString, null, true);
              }
              break;
            case "import":
              this.addToken(this.t.import_declaration_token, tmpTokenString, null, true);
              // If next characters are "* as ", then add also ImportNamespaceSpecifier
              if (this.text.substring(this.textPos + 2).startsWith("* as ")) {
                this.addToken(this.t.import_namespace_specifier_token, "* as", null, true);
                this.textPos += 5;
                this.column += 5;
              }
              break;
            case "from":
              this.addToken("from_token", tmpTokenString, null, true);
              break;
            case "do":
              this.addToken(this.t.do_token, tmpTokenString, null, true);
              break;
            case "return":
              this.addToken(this.t.return_statement_token, tmpTokenString, null, true);
              break;
            case "null":
              this.addToken(this.t.literal_token, tmpTokenString, { type: "null" }, true);
              break;
            case "for":
              this.addToken(this.t.for_statement_token, tmpTokenString, null, true);
              break;
            case "switch":
              this.addToken(this.t.switch_statement_token, tmpTokenString, null, true);
              break;
            case "case":
              this.addToken(this.t.switch_case_token, tmpTokenString, null, true);
              break;
            case "when":
              this.addToken(this.t.switch_when_token, tmpTokenString, null, true);
              break;
            case "default":
              this.addToken(this.t.switch_case_token, tmpTokenString, { type: "default" }, true);
              break;
            case "of":
              this.addToken("of_token", tmpTokenString, null, true);
              break;
            case "in":
              this.addToken("in_token", tmpTokenString, null, true);
              break;
            case "not":
              this.addToken(this.t.unary_expression_token, "!", null, true);
              break;
            case "typeof":
              this.addToken(this.t.unary_expression_token, "typeof", null, true);
              break;
            case "new":
              this.addToken(this.t.new_expression_token, "new", null, true);
              break;
            // Binary expressions
            case ">":
              this.addToken(this.t.binary_expression_token, tmpTokenString, null, true);
              break;
            case ">>":
              this.addToken(this.t.binary_expression_token, tmpTokenString, null, true);
              break;
            case ">>>":
              this.addToken(this.t.binary_expression_token, tmpTokenString, null, true);
              break;
            case "<":
              this.addToken(this.t.binary_expression_token, tmpTokenString, null, true);
              break;
            case "<<":
              this.addToken(this.t.binary_expression_token, tmpTokenString, null, true);
              break;
            case ">=":
              this.addToken(this.t.binary_expression_token, tmpTokenString, null, true);
              break;
            case "<=":
              this.addToken(this.t.binary_expression_token, tmpTokenString, null, true);
              break;
            case "export":
              // Check if export_token is default by using regexp if next chars are default
              if (this.text.substr(this.textPos + 1, 8) === " default") {
                this.addToken(this.t.export_token, tmpTokenString, { type: "default" }, true);
                this.column = this.column + 8;
                this.textPos = this.textPos + 8;
              } else {
                this.addToken(this.t.export_token, tmpTokenString, null, true);
              }
              break;
            case "yield":
              this.addToken(this.t.yield_expression_token, tmpTokenString, null, true);
              break;
            case "await":
              this.addToken(this.t.await_expression_token, tmpTokenString, null, true);
              break;
            case "try":
              this.addToken(this.t.try_statement_token, tmpTokenString, null, true);
              break;
            case "catch":
              this.addToken(this.t.catch_clause_token, tmpTokenString, null, true);
              break;
            case "fn":
              this.addToken(this.t.function_declaration_token, tmpTokenString, null, true);
              break;

            // Other cases
            default:
              let nextToken = this.peekChar(this.text);
              if (nextToken === ":") {
                // := operator
                if (this.peekChar(this.text, 2) == "=") {
                  this.addToken(this.t.assignment_expression_token, "=", { doNotAddToScope: true }, true);
                  this.advanceString();
                }
                // We whould skip computed member expression [a]: 1
                else if (this.peekChar(this.text, 0) != "]") {
                  // Allow using reserved words as object property names
                  // Allow literal token pass through.
                  let literalToken = null;
                  if (tmpTokenString.length == 0) {
                    let token = this.tokenArray.splice(this.tokenArray.length - 1, 1);
                    if (token[0].name != "literal_token") {
                      tmpTokenString = token[0].value;
                    } else {
                      literalToken = token[0];
                    }
                  }
                  tmpTokenString = this.addToken(this.t.object_property_token, tmpTokenString, { hasLiteralKey: literalToken != null });
                  if (literalToken) {
                    this.tokenArray.push(literalToken);
                  }
                } else {
                  this.addToken("colon_token", ":");
                }
                this.advanceString();
              } else {
                if (tmpTokenString.length > 0 && isNaN(tmpTokenString[0])) {
                  this.addToken(this.t.identifier_token, tmpTokenString, {}, true);
                  break;
                } else if (tmpTokenString.length > 0) {
                  // Check decimal numbers
                  if (!isNaN(tmpTokenString[0])) {
                    tmpTokenString = tmpTokenString.replaceAll("_", "");
                    if (this.peekChar(this.text) === ".") {
                      this.advanceString();
                      tmpTokenString += ".";
                      // Loop this.text until we find a non-number
                      while (this.text[this.textPos + 1]?.match(/[0-9]/i)) {
                        tmpTokenString += this.text[this.textPos + 1];
                        this.advanceString();
                      }
                    }
                  }
                  this.addToken(this.t.literal_token, tmpTokenString, {}, true);
                  break;
                }
                if (nextToken === "?") {
                  if (this.peekChar(this.text, 2) == ".") {
                    this.addToken(this.t.member_expression_token, "?.", {}, true);
                  }
                  this.advanceString();
                  this.advanceString();
                }
                if (nextToken === ".") {
                  // Spread element
                  if (this.peekChar(this.text, 1) == "." && this.peekChar(this.text, 2) == ".") {
                    this.addToken(this.t.spread_element_token, "...", {}, true);
                    this.advanceString();
                    this.advanceString();
                    this.advanceString();
                  }
                  // Member expression
                  else {
                    this.addToken(this.t.member_expression_token, ".", {}, true);
                    this.advanceString();
                  }
                }
              }
              break;
          }
      }
      this.column++;
      this.textPos++;
    }

    // Add EOF, if no term has already set
    if (this.tokenArray[this.tokenArray.length - 1].name != "end_token") {
      this.addToken(this.t.end_token, "EOF");
    }

    return this.tokenArray;
  }

  ///
  // Helper functions
  ///
  peekChar(myText, advance = 1) {
    return myText[this.textPos + advance];
  }

  testAndEatFoundChar(myText, char) {
    if (myText[this.textPos + 1] == char) {
      this.advanceString();
      return true;
    } else {
      return false;
    }
  }

  advanceString() {
    this.column++;
    this.textPos++;
  }

  consumeString(findChars, myText, allowEscape = false) {
    let result = "";
    let i;
    for (i = this.textPos; i < myText.length; i++) {
      let letter = myText.charAt(i);
      // Allow escape characters in strings
      if (allowEscape && i > 0 && letter == "\\") {
        this.column++;
        this.textPos++;
        i++;
        letter = myText.charAt(i);
      } else {
        for (let char of findChars) {
          if (letter == char) {
            this.column--;
            this.textPos--;
            return result;
          }
        }
      }
      result = result + letter;
      this.column++;
      this.textPos++;
    }
    if (i == myText.length) {
      return result;
    } else {
      throw `Cannot find tokens ${findChars}`;
    }
  }

  addComment(myText) {
    let tmpTokenString = this.consumeString([TERM, INDENT, DEDENT, "\n"], myText);
    let comment = {
      type: "CommentLine",
      value: tmpTokenString,
      start: this.textPos - tmpTokenString.length + 1,
      end: this.textPos,
      loc: {
        start: {
          line: this.line,
          column: this.column - tmpTokenString.length + 1,
        },
        end: {
          line: this.line,
          column: this.column,
        },
      },
    };
    this.commentArray.push(comment);

    // Check if there is only comment in this line. If yes, we also consume the newline
    let lastToken = this.tokenArray[this.tokenArray.length - 1];
    if (lastToken != "program_token" && lastToken.props.line != this.line) {
      this.advanceString();
      if ([TERM, INDENT, DEDENT, "\n"].includes(myText[this.textPos])) {
        // We should change line if we have line change in commet
        this.line++;
        this.column = 0;
      }
    }
  }

  addToken(fn, token, options = {}, isTextPosConsumed = false) {
    let props = {};
    if (token !== null && typeof token !== "undefined") {
      if (isTextPosConsumed) {
        props = {
          start: this.textPos + 1 - token.length,
          end: this.textPos + 1,
          line: this.line,
          column: this.column + 1 - token.length,
          length: token.length,
          type: options?.type,
          options: options,
        };
      } else {
        props = {
          start: options?.textPos || this.textPos,
          end: (options?.textPos || this.textPos) + token.length,
          line: options?.line || this.line,
          column: options?.column || this.column,
          length: token.length,
          type: options?.type,
          options: options,
        };
      }
    }

    let myToken;
    if (typeof fn == "function") {
      myToken = fn(token, props);
    } else {
      myToken = { name: fn, value: token, props: props };
    }
    this.tokenArray.push(myToken);
    return myToken;
  }

  processTokens() {
    return processTokens(this.t, this.tokenArray);
  }

  getTokenFunction() {
    return this.t;
  }

  processTemplateLiterals() {
    let isInsideTemplate;
    // Template literals are quite hard, so here we check should we use literal expressions or not
    if (this.templatePositions.length > 0) {
      if (this.templatePositions[this.templatePositions.length - 1].end < this.textPos) {
        this.templatePositions = [];
        isInsideTemplate = false;
      }
      for (let index in this.templatePositions) {
        let pos = this.templatePositions[index];
        if (this.textPos >= pos.start && this.textPos <= pos.end) {
          isInsideTemplate = true;
          if (pos.type == "first") {
            this.addToken(this.t.template_element_token, "");
          } else if (pos.type == "quasis") {
            this.addToken(this.t.template_element_token, this.text.substring(pos.start, pos.end + 1));
            this.textPos = pos.end + 1;
            return true;
          } else if (pos.type == "empty_quasis") {
            this.addToken(this.t.template_element_token, "");
            continue;
          } else if (pos.type == "expression") {
            if (this.text[this.textPos] == "#") {
              this.addToken(this.t.template_expression_token, "#{");
              this.textPos = this.textPos + 2;
              return true;
            }
          } else if (pos.type == "last") {
            let quasis = this.text.substring(pos.start, pos.end + 1);
            if (quasis == '"') {
              this.addToken(this.t.template_element_token, "", { tail: true });
              this.textPos = pos.end + 1;
            } else {
              this.addToken(this.t.template_element_token, quasis, { tail: true });
              this.textPos = pos.end + 2;
            }
            return true;
          }
        }
      }
    } else {
      isInsideTemplate = false;
    }
    return false;
  }
};
