import { counter } from '../counter';
import { NodeType, StatementType } from '@minduscript/parser';
import type { ExpressionChildNode, ExpressionNode, MacroDefineStatementNode, StatementNode } from '@minduscript/parser';
import path from 'path';
import type { Project } from './project';

export type MacroName = { name: string; filePath: string };

// 用法：MacroNameMap[源文件路径][宏名称]={name:[新名称], filePath:[声明该宏的文件路径]}
export type MacroNameMap = Record<string, Record<string, MacroName>>;

const gatherMacros = (project: Project): MacroNameMap => {
    counter.reset();
    const nameMap: MacroNameMap = {};

    const entrySource = project.sources[project.entryPath];
    if (!entrySource) {
        return nameMap;
    }

    const ensureSourceMap = (sourcePath: string): Record<string, MacroName> => {
        if (!nameMap[sourcePath]) {
            nameMap[sourcePath] = {};
        }
        return nameMap[sourcePath];
    };

    const resolveSourcePath = (fromPath: string, importerPath: string): string | undefined => {
        const basePath = path.dirname(importerPath);
        const candidate = path.isAbsolute(fromPath)
            ? fromPath
            : fromPath.startsWith('.')
              ? path.resolve(basePath, fromPath)
              : path.resolve(project.rootPath, fromPath);

        const normalized = path.normalize(candidate);
        const candidates = path.extname(normalized) ? [normalized] : [normalized, `${normalized}.minduscript`];

        for (const sourcePath of candidates) {
            if (project.sources[sourcePath]) {
                return sourcePath;
            }
        }
        return undefined;
    };

    type SourceContext = {
        localMacroMap: Map<string, MacroDefineStatementNode>;
        importMacroMap: Map<string, { sourcePath: string; macroName: string }>;
    };

    const sourceContextMap = new Map<string, SourceContext>();

    const getSourceContext = (sourcePath: string): SourceContext => {
        const existing = sourceContextMap.get(sourcePath);
        if (existing) {
            return existing;
        }

        const source = project.sources[sourcePath];
        const context: SourceContext = {
            localMacroMap: new Map(),
            importMacroMap: new Map(),
        };

        if (source) {
            for (const statement of source.ast.statementList) {
                if (statement.statementType !== StatementType.MACRO_DEFINE) {
                    continue;
                }
                context.localMacroMap.set(statement.name, statement);
            }

            for (const importStatement of source.ast.importList) {
                const importedSourcePath = resolveSourcePath(importStatement.from, sourcePath);
                if (!importedSourcePath) {
                    continue;
                }
                context.importMacroMap.set(importStatement.asName, {
                    sourcePath: importedSourcePath,
                    macroName: importStatement.name,
                });
            }
        }

        sourceContextMap.set(sourcePath, context);
        return context;
    };

    type MacroAlias = { sourcePath: string; macroName: string };

    const resolveMacroDefinition = (
        sourcePath: string,
        macroName: string,
        aliasChain: MacroAlias[] = [],
    ):
        | { sourcePath: string; macroName: string; macro: MacroDefineStatementNode; aliases: MacroAlias[] }
        | undefined => {
        const nextAliasChain = [...aliasChain, { sourcePath, macroName }];
        const sourceContext = getSourceContext(sourcePath);
        const localMacro = sourceContext.localMacroMap.get(macroName);
        if (localMacro) {
            return {
                sourcePath,
                macroName,
                macro: localMacro,
                aliases: nextAliasChain,
            };
        }

        const imported = sourceContext.importMacroMap.get(macroName);
        if (!imported) {
            return undefined;
        }

        return resolveMacroDefinition(imported.sourcePath, imported.macroName, nextAliasChain);
    };

    const collectMacroCallsFromExpressionChild = (child: ExpressionChildNode, output: string[]): void => {
        switch (child.type) {
            case NodeType.UNARY_OP_EXPRESSION:
                collectMacroCallsFromExpressionChild(child.child, output);
                break;
            case NodeType.BINARY_OP_EXPRESSION:
                collectMacroCallsFromExpressionChild(child.lChild, output);
                collectMacroCallsFromExpressionChild(child.rChild, output);
                break;
            case NodeType.FUNCTION_CALL_EXPRESSION:
                child.args.forEach((arg) => collectMacroCallsFromExpressionChild(arg, output));
                break;
            case NodeType.MACRO_CALL_EXPRESSION:
                output.push(child.name);
                child.inputArgs.forEach((arg) => collectMacroCallsFromExpressionChild(arg, output));
                break;
            case NodeType.LITERAL_EXPRESSION:
            case NodeType.IDENTIFIER_EXPRESSION:
                break;
            default:
                child satisfies never;
        }
    };

    const collectMacroCallsFromExpression = (expression: ExpressionNode, output: string[]): void => {
        collectMacroCallsFromExpressionChild(expression.child, output);
    };

    const collectMacroCallsFromStatement = (statement: StatementNode, output: string[]): void => {
        switch (statement.statementType) {
            case StatementType.EMPTY:
            case StatementType.LOOP_CONTROL:
            case StatementType.BIND:
                break;
            case StatementType.VARIABLE_DEFINE:
            case StatementType.ASSIGN:
            case StatementType.RETURN:
                collectMacroCallsFromExpression(statement.expression, output);
                break;
            case StatementType.CONTROL:
                for (const value of Object.values(statement)) {
                    if (value && typeof value === 'object' && 'type' in value && value.type === NodeType.EXPRESSION) {
                        collectMacroCallsFromExpression(value as ExpressionNode, output);
                    }
                }
                break;
            case StatementType.MACRO_CALL:
                output.push(statement.name);
                statement.inputArgs.forEach((arg) => collectMacroCallsFromExpression(arg, output));
                break;
            case StatementType.MACRO_DEFINE:
                break;
            case StatementType.IF:
                collectMacroCallsFromExpression(statement.condition, output);
                statement.ifBody.forEach((child) => collectMacroCallsFromStatement(child, output));
                break;
            case StatementType.IF_ELSE:
                collectMacroCallsFromExpression(statement.condition, output);
                statement.ifBody.forEach((child) => collectMacroCallsFromStatement(child, output));
                statement.elseBody.forEach((child) => collectMacroCallsFromStatement(child, output));
                break;
            case StatementType.FOR:
                collectMacroCallsFromStatement(statement.init, output);
                collectMacroCallsFromExpression(statement.condition, output);
                if (statement.increment) {
                    collectMacroCallsFromStatement(statement.increment, output);
                }
                statement.body.forEach((child) => collectMacroCallsFromStatement(child, output));
                break;
            case StatementType.WHILE:
                collectMacroCallsFromExpression(statement.condition, output);
                statement.body.forEach((child) => collectMacroCallsFromStatement(child, output));
                break;
            default:
                statement satisfies never;
        }
    };

    const visited = new Set<string>();
    const visiting = new Set<string>();

    const toMacroKey = (sourcePath: string, macroName: string): string => `${sourcePath}\u0000${macroName}`;

    const visitMacro = (sourcePath: string, macroName: string): void => {
        const resolved = resolveMacroDefinition(sourcePath, macroName);
        if (!resolved) {
            return;
        }

        const key = toMacroKey(resolved.sourcePath, resolved.macroName);
        if (visited.has(key)) {
            return;
        }

        // 递归宏调用在 parseProject 阶段已被校验，这里只做保护以避免异常输入导致死循环。
        if (visiting.has(key)) {
            return;
        }

        const existingRenamed = resolved.aliases
            .map((alias) => nameMap[alias.sourcePath]?.[alias.macroName]?.name)
            .find((renamed): renamed is string => typeof renamed === 'string');
        const renamed = existingRenamed ?? `${counter.next()}`;

        for (const alias of resolved.aliases) {
            const sourceMap = ensureSourceMap(alias.sourcePath);
            sourceMap[alias.macroName] = {
                name: renamed,
                filePath: resolved.sourcePath,
            };
        }

        visiting.add(key);

        const calledMacros: string[] = [];
        resolved.macro.body.forEach((statement) => collectMacroCallsFromStatement(statement, calledMacros));
        calledMacros.forEach((calledMacroName) => visitMacro(resolved.sourcePath, calledMacroName));

        visiting.delete(key);
        visited.add(key);
    };

    const entryCalls: string[] = [];
    entrySource.ast.statementList.forEach((statement) => collectMacroCallsFromStatement(statement, entryCalls));
    entryCalls.forEach((macroName) => visitMacro(project.entryPath, macroName));

    return nameMap;
};

export { gatherMacros };
