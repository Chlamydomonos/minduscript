import {
    IRNodeType,
    JumpCondition,
    type BinaryOpNode,
    type ConditionalJumpNode,
    type IRNode,
    type Value,
} from '../../ir/ir';
import type { OptimizerPass } from '../types';

// Comparison binary op types whose results are 0 or 1
const COMPARISON_OP_TYPES = new Set<IRNodeType>([
    IRNodeType.EQ,
    IRNodeType.NE,
    IRNodeType.LESS,
    IRNodeType.LE,
    IRNodeType.GREATER,
    IRNodeType.GE,
    IRNodeType.STRICT_EQ,
]);

// Map from comparison op type to the equivalent jump condition
const OP_TO_CONDITION: Partial<Record<IRNodeType, JumpCondition>> = {
    [IRNodeType.EQ]: JumpCondition.EQ,
    [IRNodeType.NE]: JumpCondition.NE,
    [IRNodeType.LESS]: JumpCondition.LESS,
    [IRNodeType.LE]: JumpCondition.LE,
    [IRNodeType.GREATER]: JumpCondition.GREATER,
    [IRNodeType.GE]: JumpCondition.GE,
    [IRNodeType.STRICT_EQ]: JumpCondition.STRICT_EQ,
};

// Logical negation of each jump condition
const NEGATE_CONDITION: Partial<Record<JumpCondition, JumpCondition>> = {
    [JumpCondition.EQ]: JumpCondition.NE,
    [JumpCondition.NE]: JumpCondition.EQ,
    [JumpCondition.LESS]: JumpCondition.GE,
    [JumpCondition.LE]: JumpCondition.GREATER,
    [JumpCondition.GREATER]: JumpCondition.LE,
    [JumpCondition.GE]: JumpCondition.LESS,
    // STRICT_EQ has no proper negation in JumpCondition, so it is intentionally omitted
};

const isFalsyLiteral = (v: Value): boolean => v.isLiteral && (v.value === 0 || v.value === false || v.value === null);

const isTruthyLiteral = (v: Value): boolean => v.isLiteral && (v.value === 1 || v.value === true);

// Collect all variable names that are *used* (referenced as non-literal Values) in a node.
// Definition-position fields (target, output, result, ...) are plain strings, not Value objects,
// so they are naturally excluded by this walk.
const collectUsedVarNames = (node: IRNode): Set<string> => {
    const used = new Set<string>();
    const walk = (obj: unknown): void => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            for (const item of obj) walk(item);
            return;
        }
        const o = obj as Record<string, unknown>;
        // Value objects always have an `isLiteral` boolean property
        if (typeof o.isLiteral === 'boolean') {
            if (!o.isLiteral && typeof o.name === 'string') {
                used.add(o.name);
            }
            return;
        }
        for (const key of Object.keys(o)) {
            if (key === 'type') continue;
            walk(o[key]);
        }
    };
    walk(node);
    return used;
};

type PendingEntry = {
    nodeIndex: number;
    compNode: BinaryOpNode;
};

type MergeResult =
    | { merged: false }
    | { merged: true; varName: string; replacement: ConditionalJumpNode; removedIndex: number };

// Try to merge a pending comparison op into a conditional jump.
// Returns the merge result without mutating `pending`.
const tryMerge = (jumpNode: ConditionalJumpNode, pending: Map<string, PendingEntry>): MergeResult => {
    // Only handle EQ / NE jump conditions (comparing a bool result to 0 or 1)
    if (jumpNode.condition !== JumpCondition.EQ && jumpNode.condition !== JumpCondition.NE) {
        return { merged: false };
    }

    let varName: string | undefined;
    let constValue: Value | undefined;

    if (!jumpNode.left.isLiteral && jumpNode.right.isLiteral) {
        varName = jumpNode.left.name;
        constValue = jumpNode.right;
    } else if (jumpNode.left.isLiteral && !jumpNode.right.isLiteral) {
        varName = jumpNode.right.name;
        constValue = jumpNode.left;
    }

    if (varName === undefined || constValue === undefined) {
        return { merged: false };
    }

    const isFalsy = isFalsyLiteral(constValue);
    const isTruthy = isTruthyLiteral(constValue);
    if (!isFalsy && !isTruthy) {
        return { merged: false };
    }

    const entry = pending.get(varName);
    if (!entry) {
        return { merged: false };
    }

    const baseCondition = OP_TO_CONDITION[entry.compNode.type];
    if (baseCondition === undefined) {
        return { merged: false };
    }

    // Determine whether the jump condition must be negated:
    //   jump equal   $tmp 0  → jump if NOT (cmp result) → negate
    //   jump notEqual $tmp 0 → jump if     (cmp result) → keep
    //   jump equal   $tmp 1  → jump if     (cmp result) → keep
    //   jump notEqual $tmp 1 → jump if NOT (cmp result) → negate
    const needNegate = jumpNode.condition === JumpCondition.EQ ? isFalsy : isTruthy;

    let finalCondition: JumpCondition;
    if (needNegate) {
        const neg = NEGATE_CONDITION[baseCondition];
        if (neg === undefined) {
            // Cannot negate (e.g. STRICT_EQ has no negation in JumpCondition)
            return { merged: false };
        }
        finalCondition = neg;
    } else {
        finalCondition = baseCondition;
    }

    return {
        merged: true,
        varName,
        replacement: {
            type: IRNodeType.CONDITIONAL_JUMP,
            condition: finalCondition,
            left: entry.compNode.left,
            right: entry.compNode.right,
            label: jumpNode.label,
        },
        removedIndex: entry.nodeIndex,
    };
};

/**
 * When a conditional jump tests a variable against a constant 0/1 and that variable
 * was just produced by a comparison op (with no intermediate uses), fold the two
 * instructions into a single conditional jump.
 *
 * Example:
 *   op equal $t $a 0      →  (removed)
 *   jump L equal $t 0     →  jump L notEqual $a 0
 */
export const foldComparisonIntoJump: OptimizerPass = (program) => {
    const { body } = program;

    // varName → the most-recent comparison op that defined it (not yet consumed by a use)
    const pending = new Map<string, PendingEntry>();

    const removedIndices = new Set<number>();
    const replacedNodes = new Map<number, IRNode>();

    for (let i = 0; i < body.length; i++) {
        const node = body[i];

        // Labels are control-flow merge points: any variable defined before the label
        // may not be defined on the path that jumps to the label.
        if (node.type === IRNodeType.LABEL) {
            pending.clear();
            continue;
        }

        // Unconditional jumps also bound the range (code after them is unreachable
        // or belongs to a different basic block).
        if (node.type === IRNodeType.JUMP) {
            pending.clear();
            continue;
        }

        if (COMPARISON_OP_TYPES.has(node.type)) {
            const bNode = node as BinaryOpNode;
            // A new comparison definition supersedes any previous pending entry for the same variable.
            pending.delete(bNode.target);
            pending.set(bNode.target, { nodeIndex: i, compNode: bNode });
            continue;
        }

        if (node.type === IRNodeType.CONDITIONAL_JUMP) {
            const result = tryMerge(node, pending);
            if (result.merged) {
                replacedNodes.set(i, result.replacement);
                removedIndices.add(result.removedIndex);
                pending.delete(result.varName);
            }
            // Whether merged or not, the variables used in the jump are consumed.
            for (const v of collectUsedVarNames(node)) {
                pending.delete(v);
            }
            continue;
        }

        // For all other nodes: invalidate pending entries for variables that are
        // used or redefined by this node.
        for (const v of collectUsedVarNames(node)) {
            pending.delete(v);
        }
        // Invalidate the variable defined by this node (if any).
        const temp = node as Record<string, unknown>;
        for (const key of ['target', 'output', 'result', 'outType', 'returnTarget'] as const) {
            if (typeof temp[key] === 'string') {
                pending.delete(temp[key] as string);
            }
        }
    }

    if (removedIndices.size === 0) {
        return { program, changed: false };
    }

    const result: IRNode[] = [];
    for (let i = 0; i < body.length; i++) {
        if (removedIndices.has(i)) continue;
        const replacement = replacedNodes.get(i);
        result.push(replacement ?? body[i]);
    }

    return {
        program: { body: result, boundVariables: program.boundVariables },
        changed: true,
    };
};
