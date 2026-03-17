import type { OptimizerPass } from './types';
import {
    foldConstantConditionalJumps,
    removeJumpToNextLabel,
    removeUnreachableAfterJump,
    removeUnusedLabels,
} from './passes/control-flow';
import { propagateAssignValues } from './passes/copy-propagation';
import { foldConstants } from './passes/constant-folding';
import { removeDeadCode } from './passes/dead-code';
import { mergeLabelsPass } from './passes/merge-labels-pass';
import { foldComparisonIntoJump } from './passes/fold-comparison-into-jump';

export const DEFAULT_PASSES: OptimizerPass[] = [
    mergeLabelsPass,
    foldConstantConditionalJumps,
    removeJumpToNextLabel,
    removeUnreachableAfterJump,
    propagateAssignValues,
    foldConstants,
    foldComparisonIntoJump,
    removeDeadCode,
    mergeLabelsPass,
    removeUnusedLabels,
];
