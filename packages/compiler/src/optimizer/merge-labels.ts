import { SimplifiedIRProgram } from '../macro/expand-macros';
import { type IRNode, IRNodeType } from '../ir/ir';

export const mergeLabels = (ir: SimplifiedIRProgram): SimplifiedIRProgram => {
    const labelAlias = new Map<string, string>();
    const merged: IRNode[] = [];

    for (const node of ir.body) {
        if (node.type === IRNodeType.LABEL) {
            const prev = merged[merged.length - 1];
            if (prev && prev.type === IRNodeType.LABEL) {
                labelAlias.set(node.name, prev.name);
                continue;
            }
        }

        merged.push(node);
    }

    const resolveLabel = (name: string): string => {
        let resolved = name;
        while (labelAlias.has(resolved)) {
            resolved = labelAlias.get(resolved)!;
        }
        return resolved;
    };

    return {
        body: merged.map((node) => {
            if (node.type === IRNodeType.JUMP) {
                return {
                    ...node,
                    label: resolveLabel(node.label),
                };
            }

            if (node.type === IRNodeType.CONDITIONAL_JUMP) {
                return {
                    ...node,
                    label: resolveLabel(node.label),
                };
            }

            return node;
        }),
        boundVariables: ir.boundVariables,
    };
};
