import {afterEach} from 'vitest';
import {cleanup,configure} from '@testing-library/react';
configure({getElementError:(message)=>new Error(message?.split('\n')[0]||'DOM assertion failed')});
afterEach(cleanup);
Object.defineProperty(window,'matchMedia',{writable:true,value:(query:string)=>({matches:false,media:query,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false;}})});
globalThis.ResizeObserver=class {observe(){} unobserve(){} disconnect(){}};
Element.prototype.scrollIntoView=()=>{};
const original=window.getComputedStyle;
window.getComputedStyle=(element:Element)=>original(element);
