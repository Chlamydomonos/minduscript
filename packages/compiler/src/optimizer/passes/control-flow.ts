import { IRNodeType, JumpCondition, type ConditionalJumpNode, type IRNode } from '../../ir/ir';
import type { OptimizerPass } from '../types';

const evaluateCondition = (node: ConditionalJumpNode): boolean | undefined => {
    if (!node.left.isLiteral || !node.right.isLiteral) {
        return undefined;
    }

    const left = node.left.value;
    const right = node.right.value;
    switch (node.condition) {
        case JumpCondition.EQ:
            return left == right;
        case JumpCondition.NE:
            return left != right;
        case JumpCondition.LESS:
            return (left as any) < (right as any);
        case JumpCondition.LE:
            return (left as any) <= (right as any);
        case JumpCondition.GREATER:
            return (left as any) > (right as any);
        case JumpCondition.GE:
            return (left as any) >= (right as any);
        case JumpCondition.STRICT_EQ:
            return left === right;
        default:
            return undefined;
    }
};

export const foldConstantConditionalJumps: OptimizerPass = (program) => {
    let changed = false;
    const body: IRNode[] = [];

    for (const node of program.body) {
        if (node.type !== IRNodeType.CONDITIONAL_JUMP) {
            body.push(node);
            continue;
        }

        const result = evaluateCondition(node);
        if (result === undefined) {
            body.push(node);
            continue;
        }

        changed = true;
        if (result) {
            body.push({
                type: IRNodeType.JUMP,
                label: node.label,
            });
        }
    }

    return {
        program: {
            body,
            boundVariables: program.boundVariables,
        },
        changed,
    };
};

export const removeJumpToNextLabel: OptimizerPass = (program) => {
    let changed = false;
    const body: IRNode[] = [];

    for (let i = 0; i < program.body.length; i++) {
        const node = program.body[i];
        if (node.type === IRNodeType.JUMP) {
            const next = program.body[i + 1];
            if (next && next.type === IRNodeType.LABEL && next.name === node.label) {
                changed = true;
                continue;
            }
        }
        body.push(node);
    }

    return {
        program: {
            body,
            boundVariables: program.boundVariables,
        },
        changed,
    };
};

export const removeUnreachableAfterJump: OptimizerPass = (program) => {
    let changed = false;
    const body: IRNode[] = [];
    let inUnreachableRegion = false;

    for (const node of program.body) {
        if (node.type === IRNodeType.LABEL) {
            inUnreachableRegion = false;
            body.push(node);
            continue;
        }

        if (inUnreachableRegion) {
            changed = true;
            continue;
        }

        body.push(node);
        if (node.type === IRNodeType.JUMP) {
            inUnreachableRegion = true;
        }
    }

    return {
        program: {
            body,
            boundVariables: program.boundVariables,
        },
        changed,
    };
};

export const removeUnusedLabels: OptimizerPass = (program) => {
    const usedLabels = new Set<string>();
    for (const node of program.body) {
        if (node.type === IRNodeType.JUMP || node.type === IRNodeType.CONDITIONAL_JUMP) {
            usedLabels.add(node.label);
        }
    }

    let changed = false;
    const body = program.body.filter((node) => {
        if (node.type !== IRNodeType.LABEL) {
            return true;
        }

        const keep = usedLabels.has(node.name);
        if (!keep) {
            changed = true;
        }
        return keep;
    });

    return {
        program: {
            body,
            boundVariables: program.boundVariables,
        },
        changed,
    };
};
