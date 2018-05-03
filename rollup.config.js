import resolve from "rollup-plugin-node-resolve";
import cjs from "rollup-plugin-cjs-es";
import json from "rollup-plugin-json";
import esInfo from "rollup-plugin-es-info";
import re from "rollup-plugin-re";
import fs from "fs";
import path from "path";

const {PREFER_DEFAULT, DUMP_ES_INFO} = process.env;

const esInfoTable = readJSON(".es-info.json") || {};

const plugins = [
  {
    init: resolve,
    options: {
      module: !PREFER_DEFAULT,
      extensions: [".js", ".json"],
      preferBuiltins: true
    }
  },
  {
    init: json
  },
  {
    init: re,
    options: {
      patterns: [{
        include: ["node_modules\\@glimmer\\syntax\\dist\\modules\\es2017\\lib\\parser\\tokenizer-event-handlers.js"],
        test: 'import * as handlebars from "handlebars";',
        replace: 'import handlebars from "handlebars";'
      }, {
        include: ["node_modules\\source-map\\lib\\source-map\\*.js"],
        test: /if \(typeof define !== 'function'\) \{[\s\S]+?define\(.+/g,
        replace: ""
      }, {
        include: ["node_modules\\source-map\\lib\\source-map\\*.js"],
        test: /\}\);\s*$/g,
        replace: ""
      }]
    }
  },
  {
    init: cjs,
    options: {
      include: ["**/*.js"],
      nested: true,
      exportType: moduleId => {
        const id = path.relative(process.cwd(), moduleId);
        if (!esInfoTable[id]) {
          return PREFER_DEFAULT ? "default" : "named";
        }
        if (esInfoTable[id].export.named.length || esInfoTable[id].export.all) {
          return "named";
        }
        if (esInfoTable[id].export.default) {
          return "default";
        }
        console.error(`${moduleId} doesn't export anything`);
      },
      splitCode: true
    }
  },
  {
    init: esInfo,
    enabled: Boolean(DUMP_ES_INFO),
    options: {
      file: ".es-info.json",
      strip: true
    }
  }
];

export default {
	input: ["index.js"],
	output: {
		dir: "dist",
		format: "cjs"
	},
	plugins: plugins
    .filter(p => p.enabled !== false)
    .map(p => p.init(p.options)),
	experimentalCodeSplitting: true,
	experimentalDynamicImport: true,
	external: [
    "assert",
    "fs",
    "module",
    "read-pkg-up",
    "resolve"
  ]
};

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    // pass
  }
}
