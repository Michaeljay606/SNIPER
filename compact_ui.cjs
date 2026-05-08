const fs = require('fs');

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Function to compact classes within a specific component
function compactComponent(componentName, text) {
    const startIndex = text.indexOf(`const ${componentName} =`);
    if (startIndex === -1) {
        console.log(`Component ${componentName} not found.`);
        return text;
    }
    
    // Find the end of the component (heuristic: look for the next top-level const or // ---)
    let endIndex = text.indexOf('// ---', startIndex + 10);
    if (endIndex === -1) {
        endIndex = text.indexOf('export default function App', startIndex);
    }
    if (endIndex === -1) {
        endIndex = text.length;
    }

    let componentCode = text.substring(startIndex, endIndex);

    // Replacements
    // Paddings & Margins
    componentCode = componentCode.replace(/\bp-6\b/g, 'p-4');
    componentCode = componentCode.replace(/\bp-5\b/g, 'p-3');
    componentCode = componentCode.replace(/\bp-8\b/g, 'p-4');
    componentCode = componentCode.replace(/\bpy-6\b/g, 'py-3');
    componentCode = componentCode.replace(/\bpy-4\b/g, 'py-2');
    componentCode = componentCode.replace(/\bpy-8\b/g, 'py-4');
    componentCode = componentCode.replace(/\bpy-[0-9]+px\b/g, 'py-3');
    componentCode = componentCode.replace(/\bpx-6\b/g, 'px-4');
    componentCode = componentCode.replace(/\bpx-8\b/g, 'px-4');
    
    // Gaps
    componentCode = componentCode.replace(/\bgap-6\b/g, 'gap-3');
    componentCode = componentCode.replace(/\bgap-4\b/g, 'gap-2');
    componentCode = componentCode.replace(/\bgap-8\b/g, 'gap-4');
    componentCode = componentCode.replace(/\bspace-y-8\b/g, 'space-y-4');
    componentCode = componentCode.replace(/\bspace-y-6\b/g, 'space-y-3');
    componentCode = componentCode.replace(/\bspace-y-4\b/g, 'space-y-2');
    
    // Font Sizes
    componentCode = componentCode.replace(/\btext-3xl\b/g, 'text-xl');
    componentCode = componentCode.replace(/\btext-2xl\b/g, 'text-lg');
    componentCode = componentCode.replace(/\btext-xl\b/g, 'text-base');
    componentCode = componentCode.replace(/\btext-lg\b/g, 'text-sm');
    componentCode = componentCode.replace(/\btext-sm\b/g, 'text-xs');
    // Reduce text-xs to text-[10px] is risky because we might do it twice, let's keep it safe.
    // componentCode = componentCode.replace(/\btext-xs\b/g, 'text-[10px]');
    
    // Header heights
    componentCode = componentCode.replace(/\bpt-\[140px\]\b/g, 'pt-[100px]');
    componentCode = componentCode.replace(/\bpt-\[100px\]\b/g, 'pt-20');
    
    return text.substring(0, startIndex) + componentCode + text.substring(endIndex);
}

['DashboardTab', 'AcademyTab', 'ProfileTab', 'AdminTab'].forEach(comp => {
    content = compactComponent(comp, content);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.tsx compacted.');
