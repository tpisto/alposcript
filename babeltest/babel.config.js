const babelParser = require("@babel/parser/lib");
const alpoScriptParser = require("../index.js");

module.exports = {
  plugins: [
    {
      parserOverride(code, opts) {
        let fileName = opts.sourceFileName;
        let fileType = fileName.substr(fileName.lastIndexOf(".") + 1, fileName.length);
        if (fileType == "as") {
          return alpoScriptParser(code, opts);
        } else {
          return babelParser.parse(code, opts);
        }
      },
    },
  ],
};
