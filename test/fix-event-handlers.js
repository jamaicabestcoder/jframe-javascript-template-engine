import { Tokenizer } from '../src/tokenizer.js';
import { Parser } from '../src/parser.js';
import { Compiler } from '../src/compiler.js';
import { jframe } from '../index.js';

export function debugTemplateProcessing() {
    console.group('🔧 Template Processing Debug');
    
    const template = '{{#each items}}<button onclick="remove({{@index}})">{{this}}</button>{{/each}}';
    const data = { items: ['Apple', 'Banana', 'Cherry'] };
    
    console.log('Input:', { template, data });
    
    try {
        // Step 1: Tokenization
        console.group('1. Tokenization');
        const tokenizer = new Tokenizer();
        const tokens = tokenizer.tokenize(template);
        console.log('Tokens:', tokens);
        console.groupEnd();
        
        // Step 2: Parsing
        console.group('2. Parsing');
        const parser = new Parser();
        const ast = parser.parse(tokens);
        console.log('AST:', JSON.stringify(ast, null, 2));
        
        // Check if EACH node has correct children
        const eachNode = ast.children.find(child => child.type === 'Each');
        if (eachNode) {
            console.log('Each Node Details:', {
                itemsExpression: eachNode.items,
                childrenCount: eachNode.children.length,
                children: eachNode.children
            });
        }
        console.groupEnd();
        
        // Step 3: Compilation
        console.group('3. Compilation');
        const compiler = new Compiler();
        const renderFn = compiler.compile(ast);
        console.log('Generated Code:');
        console.log(renderFn.toString());
        console.groupEnd();
        
        // Step 4: Execution
        console.group('4. Execution');
        const result = renderFn(data);
        console.log('Render Result:', result);
        
        // Create DOM element to inspect
        const testElement = document.createElement('div');
        testElement.innerHTML = result;
        const buttons = testElement.querySelectorAll('button');
        
        console.log(`Generated ${buttons.length} buttons (expected 3)`);
        buttons.forEach((button, index) => {
            console.log(`Button ${index}:`, {
                onclick: button.getAttribute('onclick'),
                text: button.textContent,
                outerHTML: button.outerHTML
            });
        });
        console.groupEnd();
        
        return { tokens, ast, renderFn, result, buttons: buttons.length };
        
    } catch (error) {
        console.error('❌ Processing failed:', error);
        return { error: error.message };
    }
    
    console.groupEnd();
}

export function testFixedManualRendering() {
    console.group('🛠️ Fixed Manual Rendering Test');
    
    const template = '{{#each items}}<button onclick="remove({{@index}})">{{this}}</button>{{/each}}';
    const data = { items: ['Apple', 'Banana', 'Cherry'] };
    
    console.log('Template:', template);
    console.log('Data:', data);
    
    // FIXED manual rendering approach
    let result = '';
    
    // Simulate what the template engine SHOULD do:
    // 1. Process the each loop
    data.items.forEach((item, index) => {
        // For each item, create the button HTML with proper replacements
        let buttonHtml = '<button onclick="remove({{@index}})">{{this}}</button>';
        
        // Replace {{@index}} with actual index
        buttonHtml = buttonHtml.replace('{{@index}}', index);
        
        // Replace {{this}} with the actual item
        buttonHtml = buttonHtml.replace('{{this}}', item);
        
        result += buttonHtml;
    });
    
    console.log('Fixed Manual Result:', result);
    
    // Test the result
    const testElement = document.createElement('div');
    testElement.innerHTML = result;
    const buttons = testElement.querySelectorAll('button');
    
    console.log(`Created ${buttons.length} buttons`);
    buttons.forEach((button, index) => {
        console.log(`Button ${index}:`, {
            onclick: button.getAttribute('onclick'),
            text: button.textContent
        });
        
        // Test if button works
        button.addEventListener('click', () => {
            const onclick = button.getAttribute('onclick');
            console.log(`Button ${index} clicked! onclick: ${onclick}`);
        });
    });
    
    // Add to DOM for visual testing
    testElement.style.border = '2px solid green';
    testElement.style.padding = '10px';
    testElement.style.margin = '10px 0';
    document.body.appendChild(testElement);
    
    console.groupEnd();
    return { result, buttons: buttons.length };
}

// Critical fix for the compiler
export function getCriticalCompilerFix() {
    return `
// URGENT FIX FOR compiler.js - Update _generateEachCode method:

_generateEachCode(node, parentLoopContext) {
    const lines = [];
    const itemsCode = this._generateAccessCode(node.items, parentLoopContext);

    // Generate unique variable names
    const loopId = Math.random().toString(36).substr(2, 9);
    const itemName = \`item_\${loopId}\`;
    const indexName = \`index_\${loopId}\`;
    const arrayName = \`items_\${loopId}\`;
    
    // CRITICAL: Create loop context with both itemName and indexName
    const loopContext = { 
        itemName, 
        indexName, 
        parent: parentLoopContext 
    };

    lines.push(\`var \${arrayName} = \${itemsCode};\`);
    lines.push(\`if (Array.isArray(\${arrayName})) {\`);
    lines.push(\`  for (var \${indexName} = 0; \${indexName} < \${arrayName}.length; \${indexName}++) {\`);
    lines.push(\`    var \${itemName} = \${arrayName}[\${indexName}];\`);

    // PASS THE LOOP CONTEXT TO CHILD NODES
    node.children.forEach(child => {
        const childLines = this._generateNodeCode(child, loopContext);
        childLines.forEach(line => lines.push('      ' + line));
    });

    lines.push('  }');
    lines.push('}');

    return lines;
}

// ALSO UPDATE _compileComplexExpression method:

_compileComplexExpression(expression, loopContext) {
    let jsExpr = expression;

    console.log('🔧 Compiling expression:', expression, 'LoopContext:', loopContext);

    // CRITICAL FIX: Handle @index in event handlers
    if (jsExpr.includes('@index')) {
        if (loopContext && loopContext.indexName) {
            jsExpr = jsExpr.replace(/@index/g, loopContext.indexName);
            console.log('✅ Replaced @index with:', loopContext.indexName);
        } else {
            jsExpr = jsExpr.replace(/@index/g, '0');
            console.log('⚠️ Replaced @index with 0 (no loop context)');
        }
    }

    // Handle 'this' in loop context  
    if (loopContext && jsExpr.includes('this')) {
        if (jsExpr === 'this') {
            jsExpr = loopContext.itemName;
        } else if (jsExpr.startsWith('this.')) {
            jsExpr = loopContext.itemName + '.' + jsExpr.slice(5);
        }
    }

    // Validate the expression
    try {
        new Function('return ' + jsExpr);
        return jsExpr;
    } catch (error) {
        console.error('❌ Invalid expression:', jsExpr, error);
        throw new Error(\`Invalid expression: "\${expression}" -> "\${jsExpr}". Error: \${error.message}\`);
    }
}
`;
}