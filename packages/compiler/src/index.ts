import { genASM } from './asm/gen-asm';
import { buildIR } from './ir/build-ir';
import { parseProject } from './ir/project';
import { expandMacros } from './macro/expand-macros';
import { optimizeIR } from './optimizer/optimizer';

export const compile = (entryFilePath: string, projectRoot?: string) => {
    const project = parseProject(entryFilePath, projectRoot);
    const ir = buildIR(project);
    const optimized = optimizeIR(expandMacros(ir));
    const asm = genASM(optimized.body);
    return asm;
};
