import {defineConfig} from 'vite';
// Test-only export injection; the frozen baseline source is never edited.
export default defineConfig({root:'C:/Sites/MyWebsite/vector-pni-5.0-completeness-baseline',base:'/',plugins:[{name:'qa-assembly-export',transform(code,id){if(id.endsWith('/engineering-inspector.jsx'))return {code:code+'\nexport {createEngineeringAssembly,createStudioEnvironment,configureStudioLighting};\n',map:null};}}],build:{outDir:'pages-qa-dist'}});
