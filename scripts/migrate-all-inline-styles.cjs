const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const UNITLESS_PROPERTIES = new Set([
  'animationIterationCount', 'borderImageOutset', 'borderImageSlice', 'borderImageWidth',
  'boxFlex', 'boxFlexGroup', 'boxOrdinalGroup', 'columnCount', 'columns',
  'flex', 'flexGrow', 'flexPositive', 'flexShrink', 'flexNegative', 'flexOrder',
  'gridArea', 'gridRow', 'gridRowEnd', 'gridRowSpan', 'gridRowStart',
  'gridColumn', 'gridColumnEnd', 'gridColumnSpan', 'gridColumnStart',
  'fontWeight', 'lineClamp', 'lineHeight', 'opacity', 'order', 'orphans',
  'tabSize', 'widows', 'zIndex', 'zoom', 'fillOpacity', 'floodOpacity',
  'stopOpacity', 'strokeDasharray', 'strokeDashoffset', 'strokeMiterlimit',
  'strokeOpacity', 'strokeWidth'
]);

function camelToKebab(str) {
  if (str.startsWith('--')) return str;
  if (/^Webkit[A-Z]/.test(str)) {
    const rest = str.slice(6);
    return '-webkit-' + rest.charAt(0).toLowerCase() + rest.slice(1).replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  }
  if (/^ms[A-Z]/.test(str)) {
    const rest = str.slice(2);
    return '-ms-' + rest.charAt(0).toLowerCase() + rest.slice(1).replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  }
  return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

function formatValue(propName, val) {
  if (typeof val === 'number') {
    if (val === 0 || UNITLESS_PROPERTIES.has(propName)) return String(val);
    return val + 'px';
  }
  return String(val);
}

// Existing CSS files that must NEVER be overwritten or modified (Rule 9)
const PROTECTED_CSS_FILES = new Set([
  'src/styles.css',
  'src/styles/atomic-design-system.css',
  'src/styles/liquid-glass-tokens.css',
  'src/styles/liquid-glass-components.css',
  'src/components/AIChat/AIChat.css',
  'src/components/organisms/StorageManager.css',
  'src/components/organisms/InPortalDocumentViewer.css',
  'src/components/organisms/WorkDistributionList.css',
  'src/mobile.css'
]);

function getAllJsxFiles(dir) {
  const files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files.push(...getAllJsxFiles(full));
    } else if (full.endsWith('.jsx') && !full.endsWith('.test.jsx') && !full.endsWith('.spec.jsx')) {
      files.push(full);
    }
  }
  return files;
}

function migrateComponent(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  if (!code.includes('style=')) return null;

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'importAssertions']
    });
  } catch (err) {
    console.error(`Error parsing ${filePath}:`, err.message);
    return null;
  }

  const baseName = path.basename(filePath, '.jsx');
  const dirName = path.dirname(filePath);
  
  // Decide CSS file name
  let targetCssName = `${baseName}.css`;
  const potentialCssPath = path.join(dirName, targetCssName);
  if (PROTECTED_CSS_FILES.has(potentialCssPath) || (fs.existsSync(potentialCssPath) && !fs.readFileSync(potentialCssPath, 'utf8').includes('Extracted styles from ' + path.basename(filePath)))) {
    targetCssName = `${baseName}Extracted.css`;
  }
  const cssFilePath = path.join(dirName, targetCssName);

  // Kebab base for classes
  const kebabBase = baseName.replace(/([A-Z])/g, (m, c, i) => (i > 0 ? '-' : '') + c.toLowerCase());

  const rulesMap = new Map(); // cssBody -> className
  let classCounter = 1;
  const edits = [];
  let lastImport = null;
  let hasCssImport = code.includes(targetCssName);
  let staticStylesCount = 0;
  let dynamicStylesCount = 0;

  traverse(ast, {
    ImportDeclaration(p) {
      lastImport = p.node;
    },
    JSXOpeningElement(p) {
      const classAttr = p.node.attributes.find(a => a.type === 'JSXAttribute' && a.name && a.name.name === 'className');
      const styleAttr = p.node.attributes.find(a => a.type === 'JSXAttribute' && a.name && a.name.name === 'style');
      if (!styleAttr || !styleAttr.value || styleAttr.value.type !== 'JSXExpressionContainer') return;

      const expr = styleAttr.value.expression;
      if (expr.type !== 'ObjectExpression') {
        dynamicStylesCount++;
        return; // Runtime style variable like style={style}
      }

      const staticProps = [];
      const dynamicProps = [];

      expr.properties.forEach(prop => {
        if (prop.type === 'ObjectProperty' && !prop.computed) {
          const keyName = prop.key.name || prop.key.value;
          const valNode = prop.value;
          if (valNode.type === 'StringLiteral' || valNode.type === 'NumericLiteral' || valNode.type === 'BooleanLiteral') {
            staticProps.push({ key: keyName, value: valNode.value });
          } else if (valNode.type === 'UnaryExpression' && (valNode.operator === '-' || valNode.operator === '+') && valNode.argument.type === 'NumericLiteral') {
            const num = valNode.operator === '-' ? -valNode.argument.value : valNode.argument.value;
            staticProps.push({ key: keyName, value: num });
          } else {
            dynamicProps.push(prop);
          }
        } else {
          dynamicProps.push(prop);
        }
      });

      if (staticProps.length === 0) {
        dynamicStylesCount++;
        return;
      }

      staticStylesCount += staticProps.length;
      if (dynamicProps.length > 0) dynamicStylesCount += dynamicProps.length;

      // Build CSS declarations
      const cssLines = staticProps.map(p => `  ${camelToKebab(p.key)}: ${formatValue(p.key, p.value)};`);
      const cssBody = cssLines.join('\n');

      let assignedClass = rulesMap.get(cssBody);
      if (!assignedClass) {
        assignedClass = `${kebabBase}-s${classCounter++}`;
        rulesMap.set(cssBody, assignedClass);
      }

      if (!classAttr) {
        if (dynamicProps.length === 0) {
          // Replace styleAttr with className="..."
          edits.push({
            start: styleAttr.start,
            end: styleAttr.end,
            text: `className="${assignedClass}"`
          });
        } else {
          // Retain dynamic style, add className
          const dynCode = dynamicProps.map(p => code.slice(p.start, p.end)).join(', ');
          edits.push({
            start: styleAttr.start,
            end: styleAttr.end,
            text: `className="${assignedClass}" style={{ ${dynCode} }}`
          });
        }
      } else {
        // Element already has classAttr
        const val = classAttr.value;
        if (val.type === 'StringLiteral') {
          const merged = (val.value + ' ' + assignedClass).trim();
          edits.push({
            start: classAttr.start,
            end: classAttr.end,
            text: `className="${merged}"`
          });
        } else if (val.type === 'JSXExpressionContainer') {
          if (val.expression.type === 'TemplateLiteral') {
            const rawExpr = code.slice(val.expression.start, val.expression.end);
            const inner = rawExpr.slice(1, -1);
            edits.push({
              start: classAttr.start,
              end: classAttr.end,
              text: `className={\`${inner} ${assignedClass}\`}`
            });
          } else {
            const rawExpr = code.slice(val.expression.start, val.expression.end);
            edits.push({
              start: classAttr.start,
              end: classAttr.end,
              text: `className={\`\${${rawExpr}} ${assignedClass}\`}`
            });
          }
        }

        // Handle styleAttr
        if (dynamicProps.length === 0) {
          let cutStart = styleAttr.start;
          while (cutStart > 0 && (code[cutStart - 1] === ' ' || code[cutStart - 1] === '\t' || code[cutStart - 1] === '\n')) {
            cutStart--;
          }
          edits.push({
            start: cutStart,
            end: styleAttr.end,
            text: ''
          });
        } else {
          const dynCode = dynamicProps.map(p => code.slice(p.start, p.end)).join(', ');
          edits.push({
            start: styleAttr.start,
            end: styleAttr.end,
            text: `style={{ ${dynCode} }}`
          });
        }
      }
    }
  });

  if (edits.length === 0 && rulesMap.size === 0) {
    return null;
  }

  // Apply edits in descending order
  edits.sort((a, b) => b.start - a.start);
  let newCode = code;
  for (const edit of edits) {
    newCode = newCode.slice(0, edit.start) + edit.text + newCode.slice(edit.end);
  }

  // Add CSS import if needed
  if (!hasCssImport) {
    const importStmt = `import './${targetCssName}';\n`;
    if (lastImport) {
      newCode = newCode.slice(0, lastImport.end) + '\n' + importStmt + newCode.slice(lastImport.end);
    } else {
      newCode = importStmt + newCode;
    }
  }

  // Generate CSS file content
  let cssContent = `/**\n * ${targetCssName}\n * Extracted styles from ${path.basename(filePath)}\n * Generated according to Atomic Design and zero-inline-style architecture.\n */\n\n`;
  for (const [body, cls] of rulesMap.entries()) {
    cssContent += `.${cls} {\n${body}\n}\n\n`;
  }

  return {
    filePath,
    cssFilePath,
    targetCssName,
    newCode,
    cssContent,
    classesCount: rulesMap.size,
    staticStylesCount,
    dynamicStylesCount
  };
}

module.exports = {
  getAllJsxFiles,
  migrateComponent
};
