import { IRNodeType, type IRNode } from '../../ir/ir';
import type { OptimizerPass } from '../types';

const DCE_REMOVABLE_TYPES = new Set<IRNodeType>([
    IRNodeType.ASSIGN,
    IRNodeType.FLIP,
    IRNodeType.AND,
    IRNodeType.EQ,
    IRNodeType.NE,
    IRNodeType.LESS,
    IRNodeType.LE,
    IRNodeType.GREATER,
    IRNodeType.GE,
    IRNodeType.STRICT_EQ,
    IRNodeType.BITOR,
    IRNodeType.XOR,
    IRNodeType.BITAND,
    IRNodeType.SHL,
    IRNodeType.SHR,
    IRNodeType.ADD,
    IRNodeType.SUB,
    IRNodeType.MUL,
    IRNodeType.DIV,
    IRNodeType.IDIV,
    IRNodeType.MOD,
    IRNodeType.POW,
    IRNodeType.MAX,
    IRNodeType.MIN,
    IRNodeType.ANGLE,
    IRNodeType.ANGLE_DIFF,
    IRNodeType.LEN,
    IRNodeType.PACK_COLOR,
    IRNodeType.ABS,
    IRNodeType.LOG,
    IRNodeType.LOG10,
    IRNodeType.FLOOR,
    IRNodeType.CEIL,
    IRNodeType.SQRT,
    IRNodeType.SIN,
    IRNodeType.COS,
    IRNodeType.TAN,
    IRNodeType.ASIN,
    IRNodeType.ACOS,
    IRNodeType.ATAN,
]);

const addValueUse = (value: unknown, used: Set<string>) => {
    if (!value || typeof value !== 'object') {
        return;
    }

    const temp = value as {
        isLiteral?: unknown;
        name?: unknown;
    };
    if (typeof temp.isLiteral === 'boolean' && temp.isLiteral === false && typeof temp.name === 'string') {
        used.add(temp.name);
    }
};

const collectNodeUses = (node: IRNode): Set<string> => {
    const used = new Set<string>();
    const visited = new Set<unknown>();

    const walk = (value: unknown) => {
        if (!value || typeof value !== 'object') {
            return;
        }

        if (visited.has(value)) {
            return;
        }
        visited.add(value);

        addValueUse(value, used);

        if (Array.isArray(value)) {
            for (const element of value) {
                walk(element);
            }
            return;
        }

        const temp = value as Record<string, unknown>;
        for (const key in temp) {
            walk(temp[key]);
        }
    };

    walk(node);
    return used;
};

const getDefVariable = (node: IRNode): string | undefined => {
    if (!DCE_REMOVABLE_TYPES.has(node.type)) {
        return undefined;
    }

    const temp = node as Record<string, unknown>;
    if (node.type === IRNodeType.PACK_COLOR && typeof temp.result === 'string') {
        return temp.result;
    }

    if (typeof temp.target !== 'string') {
        return undefined;
    }

    return temp.target;
};

const buildLabelIndexMap = (body: IRNode[]): Map<string, number> => {
    const labelIndex = new Map<string, number>();
    for (let i = 0; i < body.length; i++) {
        const node = body[i];
        if (node.type === IRNodeType.LABEL) {
            labelIndex.set(node.name, i);
        }
    }
    return labelIndex;
};

const buildSuccessors = (body: IRNode[], labelIndex: Map<string, number>): number[][] => {
    const successors: number[][] = Array.from({ length: body.length }, () => []);
    for (let i = 0; i < body.length; i++) {
        const node = body[i];
        const nextIndex = i + 1 < body.length ? i + 1 : undefined;

        if (node.type === IRNodeType.JUMP) {
            const target = labelIndex.get(node.label);
            if (target !== undefined) {
                successors[i].push(target);
            }
            continue;
        }

        if (node.type === IRNodeType.CONDITIONAL_JUMP) {
            const target = labelIndex.get(node.label);
            if (target !== undefined) {
                successors[i].push(target);
            }
            if (nextIndex !== undefined) {
                successors[i].push(nextIndex);
            }
            continue;
        }

        if (nextIndex !== undefined) {
            successors[i].push(nextIndex);
        }
    }

    return successors;
};

export const removeDeadCode: OptimizerPass = (program) => {
    const body = program.body;
    if (body.length === 0) {
        return {
            program,
            changed: false,
        };
    }

    const labelIndex = buildLabelIndexMap(body);
    const successors = buildSuccessors(body, labelIndex);
    const useSets = body.map((node) => collectNodeUses(node));
    const defVars = body.map((node) => getDefVariable(node));

    const inSets: Set<string>[] = Array.from({ length: body.length }, () => new Set<string>());
    const outSets: Set<string>[] = Array.from({ length: body.length }, () => new Set<string>());

    let changed = true;
    while (changed) {
        changed = false;
        for (let i = body.length - 1; i >= 0; i--) {
            const nextOut = new Set<string>();
            for (const succ of successors[i]) {
                for (const variable of inSets[succ]) {
                    nextOut.add(variable);
                }
            }

            const nextIn = new Set<string>(useSets[i]);
            const defVar = defVars[i];
            for (const variable of nextOut) {
                if (variable !== defVar) {
                    nextIn.add(variable);
                }
            }

            const outBefore = outSets[i];
            const inBefore = inSets[i];

            if (outBefore.size !== nextOut.size || [...outBefore].some((v) => !nextOut.has(v))) {
                outSets[i] = nextOut;
                changed = true;
            }
            if (inBefore.size !== nextIn.size || [...inBefore].some((v) => !nextIn.has(v))) {
                inSets[i] = nextIn;
                changed = true;
            }
        }
    }

    let removed = false;
    const optimizedBody = body.filter((_, index) => {
        const defVar = defVars[index];
        if (!defVar) {
            return true;
        }

        if (defVar.startsWith('@') || program.boundVariables.has(defVar)) {
            return true;
        }

        if (outSets[index].has(defVar)) {
            return true;
        }

        removed = true;
        return false;
    });

    return {
        program: {
            body: optimizedBody,
            boundVariables: program.boundVariables,
        },
        changed: removed,
    };
};
