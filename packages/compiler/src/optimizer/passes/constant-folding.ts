import { IRNodeType, type IRNode, type Value } from '../../ir/ir';
import type { OptimizerPass } from '../types';

const literal = (value: number | string | boolean | null): Value => ({
    isLiteral: true,
    value,
});

const asNumber = (value: Value): number | undefined => {
    if (!value.isLiteral || typeof value.value !== 'number') {
        return undefined;
    }
    return value.value;
};

const foldUnary = (node: IRNode): IRNode | undefined => {
    if (node.type === IRNodeType.ASSIGN) {
        if (node.value.isLiteral) {
            return node;
        }
        return undefined;
    }

    if (
        node.type !== IRNodeType.FLIP &&
        node.type !== IRNodeType.ABS &&
        node.type !== IRNodeType.LOG &&
        node.type !== IRNodeType.LOG10 &&
        node.type !== IRNodeType.FLOOR &&
        node.type !== IRNodeType.CEIL &&
        node.type !== IRNodeType.SQRT &&
        node.type !== IRNodeType.SIN &&
        node.type !== IRNodeType.COS &&
        node.type !== IRNodeType.TAN &&
        node.type !== IRNodeType.ASIN &&
        node.type !== IRNodeType.ACOS &&
        node.type !== IRNodeType.ATAN
    ) {
        return undefined;
    }

    const n = asNumber(node.value);
    if (n === undefined) {
        return undefined;
    }

    let output: number;
    switch (node.type) {
        case IRNodeType.FLIP:
            output = -n;
            break;
        case IRNodeType.ABS:
            output = Math.abs(n);
            break;
        case IRNodeType.LOG:
            output = Math.log(n);
            break;
        case IRNodeType.LOG10:
            output = Math.log10(n);
            break;
        case IRNodeType.FLOOR:
            output = Math.floor(n);
            break;
        case IRNodeType.CEIL:
            output = Math.ceil(n);
            break;
        case IRNodeType.SQRT:
            output = Math.sqrt(n);
            break;
        case IRNodeType.SIN:
            output = Math.sin(n);
            break;
        case IRNodeType.COS:
            output = Math.cos(n);
            break;
        case IRNodeType.TAN:
            output = Math.tan(n);
            break;
        case IRNodeType.ASIN:
            output = Math.asin(n);
            break;
        case IRNodeType.ACOS:
            output = Math.acos(n);
            break;
        default:
            output = Math.atan(n);
            break;
    }

    return {
        type: IRNodeType.ASSIGN,
        target: node.target,
        value: literal(output),
    };
};

const foldBinary = (node: IRNode): IRNode | undefined => {
    if (
        node.type !== IRNodeType.ADD &&
        node.type !== IRNodeType.SUB &&
        node.type !== IRNodeType.MUL &&
        node.type !== IRNodeType.DIV &&
        node.type !== IRNodeType.IDIV &&
        node.type !== IRNodeType.MOD &&
        node.type !== IRNodeType.POW
    ) {
        return undefined;
    }

    const left = asNumber(node.left);
    const right = asNumber(node.right);
    if (left === undefined || right === undefined) {
        return undefined;
    }

    let output: number;
    switch (node.type) {
        case IRNodeType.ADD:
            output = left + right;
            break;
        case IRNodeType.SUB:
            output = left - right;
            break;
        case IRNodeType.MUL:
            output = left * right;
            break;
        case IRNodeType.DIV:
            output = left / right;
            break;
        case IRNodeType.IDIV:
            output = Math.trunc(left / right);
            break;
        case IRNodeType.MOD:
            output = left % right;
            break;
        default:
            output = left ** right;
            break;
    }

    return {
        type: IRNodeType.ASSIGN,
        target: node.target,
        value: literal(output),
    };
};

export const foldConstants: OptimizerPass = (program) => {
    let changed = false;
    const body = program.body.map((node) => {
        const unaryFolded = foldUnary(node);
        if (unaryFolded) {
            if (unaryFolded !== node) {
                changed = true;
            }
            return unaryFolded;
        }

        const binaryFolded = foldBinary(node);
        if (binaryFolded) {
            changed = true;
            return binaryFolded;
        }

        return node;
    });

    return {
        program: {
            body,
            boundVariables: program.boundVariables,
        },
        changed,
    };
};
