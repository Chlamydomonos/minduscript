import { IRNodeType, type IRNode, type Value } from '../../ir/ir';
import type { OptimizerPass } from '../types';

const cloneValue = (value: Value): Value => {
    if (value.isLiteral) {
        return {
            isLiteral: true,
            value: value.value,
        };
    }

    return {
        isLiteral: false,
        name: value.name,
        isMindustry: value.isMindustry,
    };
};

const resolveValue = (value: Value, env: Map<string, Value>): Value => {
    if (value.isLiteral || value.isMindustry) {
        return value;
    }

    let current: Value = value;
    const visited = new Set<string>();
    while (!current.isLiteral && !current.isMindustry) {
        if (visited.has(current.name)) {
            break;
        }
        visited.add(current.name);

        const replacement = env.get(current.name);
        if (!replacement) {
            break;
        }

        current = replacement;
    }

    return cloneValue(current);
};

const invalidateDependentMappings = (env: Map<string, Value>, changedName: string) => {
    for (const [name, value] of [...env.entries()]) {
        if (!value.isLiteral && !value.isMindustry && value.name === changedName) {
            env.delete(name);
        }
    }
};

const DEF_KEYS = new Set(['target', 'output', 'result', 'outType', 'building', 'floor', 'returnTarget']);

const mapValuesDeep = (input: unknown, env: Map<string, Value>, changedRef: { changed: boolean }): unknown => {
    if (!input || typeof input !== 'object') {
        return input;
    }

    if (Array.isArray(input)) {
        let arrayChanged = false;
        const next = input.map((item) => {
            const mapped = mapValuesDeep(item, env, changedRef);
            if (mapped !== item) {
                arrayChanged = true;
            }
            return mapped;
        });
        if (arrayChanged) {
            changedRef.changed = true;
            return next;
        }
        return input;
    }

    const maybeValue = input as {
        isLiteral?: unknown;
        name?: unknown;
        isMindustry?: unknown;
    };

    if (typeof maybeValue.isLiteral === 'boolean' && typeof maybeValue.name === 'string') {
        const resolved = resolveValue(input as Value, env);
        const original = input as Value;
        if (
            resolved.isLiteral !== original.isLiteral ||
            (resolved.isLiteral && original.isLiteral && resolved.value !== original.value) ||
            (!resolved.isLiteral &&
                !original.isLiteral &&
                (resolved.name !== original.name || resolved.isMindustry !== original.isMindustry))
        ) {
            changedRef.changed = true;
            return resolved;
        }

        return input;
    }

    const source = input as Record<string, unknown>;
    let objectChanged = false;
    const output: Record<string, unknown> = {};
    for (const key in source) {
        const mapped = mapValuesDeep(source[key], env, changedRef);
        output[key] = mapped;
        if (mapped !== source[key]) {
            objectChanged = true;
        }
    }

    return objectChanged ? output : input;
};

const removeDefsFromEnv = (node: IRNode, env: Map<string, Value>) => {
    const temp = node as Record<string, unknown>;
    for (const key in temp) {
        if (!DEF_KEYS.has(key)) {
            continue;
        }
        const value = temp[key];
        if (typeof value === 'string') {
            env.delete(value);
            invalidateDependentMappings(env, value);
        }
    }
};

const isBlockBoundary = (node: IRNode): boolean => {
    return node.type === IRNodeType.LABEL || node.type === IRNodeType.JUMP || node.type === IRNodeType.CONDITIONAL_JUMP;
};

export const propagateAssignValues: OptimizerPass = (program) => {
    const env = new Map<string, Value>();
    const changedRef = { changed: false };

    const body: IRNode[] = program.body.map((node) => {
        if (node.type === IRNodeType.LABEL) {
            // 标签可能有多个前驱，跨块传播会破坏正确性。
            env.clear();
            return node;
        }

        const mappedNode = mapValuesDeep(node, env, changedRef) as IRNode;

        removeDefsFromEnv(mappedNode, env);

        if (mappedNode.type === IRNodeType.ASSIGN) {
            const resolved = mappedNode.value;
            if (!resolved.isLiteral && !resolved.isMindustry && resolved.name === mappedNode.target) {
                return mappedNode;
            }

            env.set(mappedNode.target, cloneValue(resolved));
        }

        if (isBlockBoundary(mappedNode)) {
            env.clear();
        }

        return mappedNode;
    });

    return {
        program: {
            body,
            boundVariables: program.boundVariables,
        },
        changed: changedRef.changed,
    };
};
