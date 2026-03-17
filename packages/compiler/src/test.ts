import { buildIR } from './ir/build-ir';
import { expandMacros } from './macro/expand-macros';
import { IRNodeType } from './ir/ir';
import { optimizeIR } from './optimizer/optimizer';
import { parseProject } from './ir/project';
import { genASM } from './asm/gen-asm';

const project = parseProject('test.minduscript');
const ir = buildIR(project);
const expanded = expandMacros(ir);
const optimized = optimizeIR(expanded);
const asm = genASM(optimized.body);

console.log(asm);
