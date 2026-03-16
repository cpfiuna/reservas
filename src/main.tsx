import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Easter egg ASCII art
console.log(`
            88                       .o88o.        
   .dP     .8'                       888 \`" Yb     
 .dP      .8'   .ooooo.  oo.ooooo.  o888oo   \`Yb   
dP       .8'   d88' \`"Y8  888' \`88b  888       \`Yb 
Yb      .8'    888        888   888  888       .dP 
 \`Yb   .8'     888   .o8  888   888  888     .dP   
   \`Yb 88      \`Y8bod8P'  888bod8P' o888o   dP     
                          888                      
                         o888o                     
`);

createRoot(document.getElementById("root")!).render(<App />);
