const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'rollup', 'dist', 'native.js');
if (fs.existsSync(target)) {
  let content = fs.readFileSync(target, 'utf8');
  if (content.includes("if (error instanceof Error && error.code === 'ERR_DLOPEN_FAILED') {\n\t\t\tthrow error;\n\t\t}")) {
    content = content.replace(
      "if (error instanceof Error && error.code === 'ERR_DLOPEN_FAILED') {\n\t\t\tthrow error;\n\t\t}",
      "if (error instanceof Error && error.code === 'ERR_DLOPEN_FAILED') {\n\t\t\treturn require('@rollup/wasm-node/dist/native.js');\n\t\t}"
    );
    fs.writeFileSync(target, content, 'utf8');
  } else if (content.includes("if (error instanceof Error && error.code === 'ERR_DLOPEN_FAILED') {\r\n\t\t\tthrow error;\r\n\t\t}")) {
    content = content.replace(
      "if (error instanceof Error && error.code === 'ERR_DLOPEN_FAILED') {\r\n\t\t\tthrow error;\r\n\t\t}",
      "if (error instanceof Error && error.code === 'ERR_DLOPEN_FAILED') {\r\n\t\t\treturn require('@rollup/wasm-node/dist/native.js');\r\n\t\t}"
    );
    fs.writeFileSync(target, content, 'utf8');
  }
}
