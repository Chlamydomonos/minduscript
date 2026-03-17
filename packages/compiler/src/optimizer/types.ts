import type { SimplifiedIRProgram } from '../macro/expand-macros';

export type OptimizerPassResult = {
    program: SimplifiedIRProgram;
    changed: boolean;
};

export type OptimizerPass = (program: SimplifiedIRProgram) => OptimizerPassResult;

export type OptimizeOptions = {
    maxIterations?: number;
    passes?: OptimizerPass[];
};
