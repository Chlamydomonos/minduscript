import { type SimplifiedIRProgram } from '../macro/expand-macros';
import { DEFAULT_PASSES } from './default-passes';
import type { OptimizeOptions } from './types';

export type { OptimizerPass, OptimizeOptions } from './types';

export const optimizeIR = (program: SimplifiedIRProgram, options: OptimizeOptions = {}): SimplifiedIRProgram => {
    const maxIterations = options.maxIterations ?? 5;
    const passes = options.passes ?? DEFAULT_PASSES;

    let current: SimplifiedIRProgram = {
        body: [...program.body],
        boundVariables: program.boundVariables,
    };

    for (let i = 0; i < maxIterations; i++) {
        let changedInIteration = false;

        for (const pass of passes) {
            const result = pass(current);
            current = result.program;
            changedInIteration = changedInIteration || result.changed;
        }

        if (!changedInIteration) {
            break;
        }
    }

    return current;
};
