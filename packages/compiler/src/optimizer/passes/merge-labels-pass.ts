import { mergeLabels } from '../merge-labels';
import type { OptimizerPass } from '../types';

export const mergeLabelsPass: OptimizerPass = (program) => {
    const merged = mergeLabels(program);
    const changed = merged.body.length !== program.body.length;
    return {
        program: merged,
        changed,
    };
};
