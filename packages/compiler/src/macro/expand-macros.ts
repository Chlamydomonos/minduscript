import { counter } from '../counter';
import { IRMacro, IRNodeType, IRProgram, Value, type IRNode } from '../ir/ir';

const deepCopy = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
};

const expandSingleMacro = (
    body: IRNode[],
    inputParams: string[],
    outputParams: string[],
    inputArgs: Value[],
    outputArgs: string[],
    returnTarget?: string,
) => {
    const macroCallId = counter.next();
    const varNameMap: Record<string, string> = {};
    const labelNameMap: Record<string, string> = {};
    const inputArgVars: Record<number, Value> = {};
    const inputArgLiterals: Record<number, Value> = {};
    for (let i = 0; i < inputArgs.length; i++) {
        const arg = inputArgs[i];
        if (arg.isLiteral) {
            inputArgLiterals[i] = arg;
            continue;
        }
        inputArgVars[i] = arg;
    }

    const getVarName = (original: string): string => {
        if (!original.startsWith('$')) {
            return original;
        }

        if (!varNameMap[original]) {
            if (inputParams.includes(original)) {
                const index = inputParams.indexOf(original);
                varNameMap[original] = (inputArgs[index] as { name: string }).name;
            } else if (outputParams.includes(original)) {
                const index = outputParams.indexOf(original);
                varNameMap[original] = outputArgs[index];
            } else if (returnTarget && original === '$return') {
                varNameMap[original] = returnTarget;
            } else {
                varNameMap[original] = `$$${macroCallId}_${original}`;
            }
        }
        return varNameMap[original];
    };

    const getLabelName = (original: string): string => {
        if (!labelNameMap[original]) {
            labelNameMap[original] = `_${macroCallId}_${original}`;
        }

        return labelNameMap[original];
    };

    const transformValue = (original: Value): Value => {
        if (original.isLiteral || original.isMindustry) {
            return original;
        }

        if (inputParams.includes(original.name)) {
            const index = inputParams.indexOf(original.name);
            if (inputArgVars[index]) {
                return { ...inputArgVars[index] };
            } else {
                return { ...inputArgLiterals[index] };
            }
        }

        return {
            ...original,
            name: getVarName(original.name),
        };
    };

    const outputBody = [];
    for (const node of body) {
        const newNode = deepCopy(node);
        if (newNode.type == IRNodeType.JUMP) {
            newNode.label = getLabelName(newNode.label);
        } else if (newNode.type == IRNodeType.CONDITIONAL_JUMP) {
            newNode.left = transformValue(newNode.left);
            newNode.right = transformValue(newNode.right);
            newNode.label = getLabelName(newNode.label);
        } else if (newNode.type == IRNodeType.LABEL) {
            newNode.name = getLabelName(newNode.name);
        } else {
            const temp = newNode as Record<string, any>;
            for (const key in temp) {
                if (typeof temp[key] == 'string') {
                    temp[key] = getVarName(temp[key]);
                } else if (typeof temp[key] == 'object' && 'isLiteral' in temp[key]) {
                    temp[key] = transformValue(temp[key]);
                }
            }
        }
        outputBody.push(newNode);
    }
    return outputBody;
};

const expandMacrosInBody = (body: IRNode[], macroDefinitions: Record<string, IRMacro>): IRNode[] => {
    const output: IRNode[] = [];
    for (const node of body) {
        if (node.type == IRNodeType.MACRO_CALL) {
            const macroDef = macroDefinitions[node.name];
            output.push(
                ...expandSingleMacro(
                    macroDef.body,
                    macroDef.inputParams,
                    macroDef.outputParams,
                    node.inputArgs,
                    node.outputArgs,
                ),
            );
        } else if (node.type == IRNodeType.MACRO_CALL_ASSIGN) {
            const macroDef = macroDefinitions[node.name];
            const expanded = expandSingleMacro(
                macroDef.body,
                macroDef.inputParams,
                macroDef.outputParams,
                node.inputArgs,
                node.outputArgs,
                node.returnTarget,
            );
            output.push(...expanded);
        } else {
            output.push(deepCopy(node));
        }
    }
    return output;
};

const simplifyNames = (body: IRNode[], inputParams: string[], outputParams: string[]): void => {
    counter.reset();
    const varNameMap: Record<string, string> = {};
    const labelNameMap: Record<string, string> = {};

    const getVarName = (original: string): string => {
        if (!original.startsWith('$') || original == '$return') {
            return original;
        }
        if (!varNameMap[original]) {
            if (inputParams.includes(original) || outputParams.includes(original)) {
                varNameMap[original] = original;
            } else {
                varNameMap[original] = `$${counter.next()}`;
            }
        }
        return varNameMap[original];
    };

    const getLabelName = (original: string): string => {
        if (!labelNameMap[original]) {
            labelNameMap[original] = `${counter.next()}`;
        }
        return labelNameMap[original];
    };

    const transformValue = (original: Value): Value => {
        if (original.isLiteral || original.isMindustry) {
            return original;
        }
        return {
            ...original,
            name: getVarName(original.name),
        };
    };

    for (const node of body) {
        if (node.type == IRNodeType.JUMP) {
            node.label = getLabelName(node.label);
        } else if (node.type == IRNodeType.CONDITIONAL_JUMP) {
            node.left = transformValue(node.left);
            node.right = transformValue(node.right);
            node.label = getLabelName(node.label);
        } else if (node.type == IRNodeType.LABEL) {
            node.name = getLabelName(node.name);
        } else {
            const temp = node as Record<string, any>;
            for (const key in temp) {
                if (typeof temp[key] == 'string') {
                    temp[key] = getVarName(temp[key]);
                } else if (typeof temp[key] == 'object' && 'isLiteral' in temp[key]) {
                    temp[key] = transformValue(temp[key]);
                }
            }
        }
    }
};

const expandAllMacros = (macroDefinitions: IRMacro[]): Record<string, IRMacro> => {
    const result: Record<string, IRMacro> = {};
    const macroMap: Record<string, IRMacro> = {};

    // 创建宏定义的映射表
    for (const macro of macroDefinitions) {
        macroMap[macro.name] = {
            ...deepCopy(macro),
            dependencies: new Set(macro.dependencies),
        };
    }

    // 拓扑排序状态
    const visited = new Set<string>();
    const order: string[] = [];

    // DFS 拓扑排序
    const dfs = (name: string): void => {
        if (visited.has(name)) {
            return;
        }
        visited.add(name);

        const macro = macroMap[name];
        if (macro && macro.dependencies) {
            for (const dep of macro.dependencies) {
                dfs(dep);
            }
        }

        order.push(name);
    };

    // 获取拓扑排序后的遍历顺序
    for (const macro of macroDefinitions) {
        dfs(macro.name);
    }

    // 按顺序展开宏
    for (const macroName of order) {
        const macro = macroMap[macroName];

        // 展开宏体中的所有宏调用
        const expandedBody = expandMacrosInBody(macro.body, result);
        simplifyNames(expandedBody, macro.inputParams, macro.outputParams);

        // 保存展开后的宏
        result[macroName] = {
            ...macro,
            body: expandedBody,
        };
    }

    return result;
};

export type SimplifiedIRProgram = {
    body: IRNode[];
    boundVariables: Set<string>;
};

const simplifyMainNames = (body: IRNode[], boundVariables: Set<string>): SimplifiedIRProgram => {
    counter.reset();
    const varNameMap: Record<string, string> = {};
    const labelNameMap: Record<string, string> = {};

    const shouldKeepVarName = (name: string): boolean => {
        return name.startsWith('@') || boundVariables.has(name);
    };

    const getVarName = (original: string): string => {
        if (shouldKeepVarName(original)) {
            return original;
        }

        if (!varNameMap[original]) {
            varNameMap[original] = `$${counter.next()}`;
        }

        return varNameMap[original];
    };

    const getLabelName = (original: string): string => {
        if (!labelNameMap[original]) {
            labelNameMap[original] = `${counter.next()}`;
        }
        return labelNameMap[original];
    };

    const transformValue = (original: Value): Value => {
        if (original.isLiteral || original.isMindustry) {
            return original;
        }

        return {
            ...original,
            name: getVarName(original.name),
        };
    };

    for (const node of body) {
        if (node.type == IRNodeType.JUMP) {
            node.label = getLabelName(node.label);
        } else if (node.type == IRNodeType.CONDITIONAL_JUMP) {
            node.left = transformValue(node.left);
            node.right = transformValue(node.right);
            node.label = getLabelName(node.label);
        } else if (node.type == IRNodeType.LABEL) {
            node.name = getLabelName(node.name);
        } else {
            const temp = node as Record<string, any>;
            for (const key in temp) {
                if (typeof temp[key] == 'string') {
                    temp[key] = getVarName(temp[key]);
                } else if (typeof temp[key] == 'object' && 'isLiteral' in temp[key]) {
                    temp[key] = transformValue(temp[key]);
                }
            }
        }
    }

    return {
        body,
        boundVariables,
    };
};

export const expandMacros = (program: IRProgram): SimplifiedIRProgram => {
    const expandedMacros = expandAllMacros(Object.values(program.macros));
    const expandedBody = expandMacrosInBody(program.main, expandedMacros);
    return simplifyMainNames(expandedBody, program.boundVariables);
};
