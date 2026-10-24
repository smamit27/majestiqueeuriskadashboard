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

function getCssFileName(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, '.jsx');
  // Check if extracted css exists
  const standardCss = path.join(dir, `${base}.css`);
  const extractedCss = path.join(dir, `${base}Extracted.css`);
  if (fs.existsSync(extractedCss)) return extractedCss;
  return standardCss;
}

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

function isStaticLiteral(node) {
  if (!node) return false;
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') return true;
  if (node.type === 'UnaryExpression' && (node.operator === '-' || node.operator === '+') && node.argument.type === 'NumericLiteral') return true;
  return false;
}

function getLiteralValue(node) {
  if (node.type === 'UnaryExpression') {
    return node.operator === '-' ? -node.argument.value : node.argument.value;
  }
  return node.value;
}

function migrateConditionalsInFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  if (!code.includes('style=')) return null;

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'importAssertions']
    });
  } catch (err) {
    return null;
  }

  const cssPath = getCssFileName(filePath);
  if (!fs.existsSync(cssPath)) return null;

  const baseName = path.basename(filePath, '.jsx');
  const kebabBase = baseName.replace(/([A-Z])/g, (m, c, i) => (i > 0 ? '-' : '') + c.toLowerCase());

  let classCounter = 1;
  const newCssRules = []; // { className, cssBlock }
  const edits = [];
  let convertedCount = 0;

  traverse(ast, {
    JSXOpeningElement(p) {
      const classAttr = p.node.attributes.find(a => a.type === 'JSXAttribute' && a.name && a.name.name === 'className');
      const styleAttr = p.node.attributes.find(a => a.type === 'JSXAttribute' && a.name && a.name.name === 'style');
      if (!styleAttr || !styleAttr.value || styleAttr.value.type !== 'JSXExpressionContainer') return;

      const expr = styleAttr.value.expression;
      if (expr.type !== 'ObjectExpression') return;

      // Group conditional properties by their test expression string
      const testGroups = new Map(); // testCode -> { testNode, consProps: [], altProps: [] }
      const remainingProps = [];

      expr.properties.forEach(prop => {
        if (prop.type === 'ObjectProperty' && !prop.computed && prop.value && prop.value.type === 'ConditionalExpression') {
          const cond = prop.value;
          if (isStaticLiteral(cond.consequent) && isStaticLiteral(cond.alternate)) {
            const keyName = prop.key.name || prop.key.value;
            const testCode = code.slice(cond.test.start, cond.test.end);
            if (!testGroups.has(testCode)) {
              testGroups.set(testCode, {
                testNode: cond.test,
                consProps: [],
                altProps: []
              });
            }
            const group = testGroups.get(testCode);
            group.consProps.push({ key: keyName, value: getLiteralValue(cond.consequent) });
            group.altProps.push({ key: keyName, value: getLiteralValue(cond.alternate) });
            return;
          }
        }
        remainingProps.push(prop);
      });

      if (testGroups.size === 0) return;

      // For each test group, build CSS classes and conditional class string
      const condClassExpressions = [];

      for (const [testCode, group] of testGroups.entries()) {
        convertedCount += group.consProps.length;

        // Build consequent CSS
        const consLines = group.consProps.map(pr => `  ${camelToKebab(pr.key)}: ${formatValue(pr.key, pr.value)};`);
        const consBlock = consLines.join('\n');
        const consClass = `${kebabBase}-cond-${classCounter++}-true`;
        newCssRules.push({ className: consClass, cssBlock: consBlock });

        // Build alternate CSS
        const altLines = group.altProps.map(pr => `  ${camelToKebab(pr.key)}: ${formatValue(pr.key, pr.value)};`);
        const altBlock = altLines.join('\n');
        const altClass = `${kebabBase}-cond-${classCounter++}-false`;
        newCssRules.push({ className: altClass, cssBlock: altBlock });

        condClassExpressions.push(`(${testCode} ? '${consClass}' : '${altClass}')`);
      }

      const joinedCondExpr = condClassExpressions.map(e => `\${${e}}`).join(' ');

      // Update className
      if (!classAttr) {
        if (remainingProps.length === 0) {
          edits.push({
            start: styleAttr.start,
            end: styleAttr.end,
            text: `className={\`${joinedCondExpr}\`}`
          });
        } else {
          const remCode = remainingProps.map(pr => code.slice(pr.start, pr.end)).join(', ');
          edits.push({
            start: styleAttr.start,
            end: styleAttr.end,
            text: `className={\`${joinedCondExpr}\`} style={{ ${remCode} }}`
          });
        }
      } else {
        // classAttr already exists
        const val = classAttr.value;
        if (val.type === 'StringLiteral') {
          const baseCls = val.value;
          edits.push({
            start: classAttr.start,
            end: classAttr.end,
            text: `className={\`${baseCls} ${joinedCondExpr}\`}`
          });
        } else if (val.type === 'JSXExpressionContainer') {
          if (val.expression.type === 'TemplateLiteral') {
            const rawExpr = code.slice(val.expression.start, val.expression.end);
            const inner = rawExpr.slice(1, -1);
            edits.push({
              start: classAttr.start,
              end: classAttr.end,
              text: `className={\`${inner} ${joinedCondExpr}\`}`
            });
          } else {
            const rawExpr = code.slice(val.expression.start, val.expression.end);
            edits.push({
              start: classAttr.start,
              end: classAttr.end,
              text: `className={\`\${${rawExpr}} ${joinedCondExpr}\`}`
            });
          }
        }

        // Handle styleAttr
        if (remainingProps.length === 0) {
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
          const remCode = remainingProps.map(pr => code.slice(pr.start, pr.end)).join(', ');
          edits.push({
            start: styleAttr.start,
            end: styleAttr.end,
            text: `style={{ ${remCode} }}`
          });
        }
      }
    }
  });

  if (edits.length === 0) return null;

  // Apply edits descending
  edits.sort((a, b) => b.start - a.start);
  let newCode = code;
  for (const edit of edits) {
    newCode = newCode.slice(0, edit.start) + edit.text + newCode.slice(edit.end);
  }

  // Append new CSS rules to CSS file
  let cssAppend = `\n/* Extracted Conditional Styles */\n`;
  for (const rule of newCssRules) {
    cssAppend += `.${rule.className} {\n${rule.cssBlock}\n}\n\n`;
  }

  return {
    filePath,
    cssPath,
    newCode,
    cssAppend,
    convertedCount,
    classesCreated: newCssRules.length
  };
}

module.exports = {
  getAllJsxFiles,
  migrateConditionalsInFile
};
