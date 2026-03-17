import { lexer } from '@minduscript/lexer';
import { TokenType } from '@minduscript/lexer';
import type {
    DocumentNode,
    ExpressionChildNode,
    ExpressionNode,
    IdentifierExpressionNode,
    ImportStatementNode,
    MacroDefineStatementNode,
    StatementNode,
} from '@minduscript/parser';
import { IdentifierType, NodeType, StatementType, parser } from '@minduscript/parser';
import fs from 'fs';
import path from 'path';
import type { WithSymbolTable } from './symbol-table';
import { buildSymbolTable } from './symbol-table';

export type Source = {
    path: string; // 文件的绝对路径
    ast: WithSymbolTable<DocumentNode>;
    macros: MacroDefineStatementNode[]; // 可导出的宏
    internalMacros: MacroDefineStatementNode[]; // 不可导出的宏（使用了全局变量）
};

export type Project = {
    rootPath: string; // 项目根目录路径
    entryPath: string; // 入口文件的绝对路径
    sources: Record<string, Source>;
};

export class MacroRecursionError extends Error {
    constructor(
        readonly chain: {
            macroName: string;
            sourceFile: string;
        }[],
    ) {
        super(`发生宏递归调用：${chain.map((item) => item.macroName).join('->')}`);
    }
}

type ResolvedImport = {
    sourcePath: string;
    macroName: string;
    asName: string;
};

type ResolvedSource = Source & {
    exportMap: Record<string, MacroDefineStatementNode>;
    localMacroMap: Record<string, MacroDefineStatementNode>;
    importAliasMap: Record<string, ResolvedImport>;
    resolvedImports: ResolvedImport[];
    globalVariableNames: Set<string>;
};

type AnalyzableStatement = StatementNode | WithSymbolTable<StatementNode>;

const hasOwn = (record: Record<string, unknown>, name: string): boolean =>
    Object.prototype.hasOwnProperty.call(record, name);

const tryResolveFile = (candidatePath: string): string | undefined => {
    const normalizedPath = path.normalize(candidatePath);
    const candidates = path.extname(normalizedPath)
        ? [normalizedPath]
        : [normalizedPath, `${normalizedPath}.minduscript`];

    for (const current of candidates) {
        if (!fs.existsSync(current)) {
            continue;
        }
        if (!fs.statSync(current).isFile()) {
            continue;
        }
        return current;
    }

    return undefined;
};

const resolveImportPath = (
    importStatement: ImportStatementNode,
    importerPath: string,
    rootPath: string | undefined,
): string => {
    const { from } = importStatement;
    const basePath = path.dirname(importerPath);

    const candidate = path.isAbsolute(from)
        ? from
        : from.startsWith('.')
          ? path.resolve(basePath, from)
          : rootPath
            ? path.resolve(rootPath, from)
            : undefined;

    if (!candidate) {
        throw new Error(`Import "${from}" in "${importerPath}" requires an explicit project root path`);
    }

    const resolvedPath = tryResolveFile(candidate);
    if (!resolvedPath) {
        throw new Error(`Cannot resolve import "${from}" in "${importerPath}"`);
    }

    return resolvedPath;
};

const getGlobalVariableNames = (ast: WithSymbolTable<DocumentNode>): Set<string> => {
    return new Set([...Object.keys(ast.symbolTable.vars), ...Object.keys(ast.symbolTable.consts)]);
};

const isIdentifierUsingGlobalVariable = (
    identifier: IdentifierExpressionNode,
    globalVariableNames: Set<string>,
): boolean => {
    return (
        !identifier.isMindustry &&
        identifier.identifierType === IdentifierType.SIMPLE &&
        globalVariableNames.has(identifier.value)
    );
};

const expressionUsesGlobalVariable = (
    expression: ExpressionNode,
    globalVariableNames: Set<string>,
    macroCallUsesGlobalVariable: (macroName: string) => boolean,
): boolean => {
    const childUsesGlobalVariable = (child: ExpressionChildNode): boolean => {
        switch (child.type) {
            case NodeType.UNARY_OP_EXPRESSION:
                return childUsesGlobalVariable(child.child);
            case NodeType.BINARY_OP_EXPRESSION:
                return childUsesGlobalVariable(child.lChild) || childUsesGlobalVariable(child.rChild);
            case NodeType.FUNCTION_CALL_EXPRESSION:
                return child.args.some(childUsesGlobalVariable);
            case NodeType.MACRO_CALL_EXPRESSION:
                return (
                    macroCallUsesGlobalVariable(child.name) ||
                    child.inputArgs.some(childUsesGlobalVariable) ||
                    child.outputArgs.some((identifier) =>
                        isIdentifierUsingGlobalVariable(identifier, globalVariableNames),
                    )
                );
            case NodeType.IDENTIFIER_EXPRESSION:
                return isIdentifierUsingGlobalVariable(child, globalVariableNames);
            case NodeType.LITERAL_EXPRESSION:
                return false;
            default:
                return child as never;
        }
    };

    return childUsesGlobalVariable(expression.child);
};

const statementUsesGlobalVariable = (
    statement: AnalyzableStatement,
    globalVariableNames: Set<string>,
    macroCallUsesGlobalVariable: (macroName: string) => boolean,
): boolean => {
    switch (statement.statementType) {
        case StatementType.EMPTY:
            return false;
        case StatementType.VARIABLE_DEFINE:
            return expressionUsesGlobalVariable(statement.expression, globalVariableNames, macroCallUsesGlobalVariable);
        case StatementType.ASSIGN:
            return (
                expressionUsesGlobalVariable(statement.expression, globalVariableNames, macroCallUsesGlobalVariable) ||
                (statement.tokens[0]?.type !== TokenType.MINDUSTRY_IDENTIFIER &&
                    globalVariableNames.has(statement.variableName))
            );
        case StatementType.CONTROL:
            return Object.values(statement).some((value) => {
                if (!value || typeof value !== 'object') {
                    return false;
                }

                const maybeNode = value as ExpressionNode | IdentifierExpressionNode;
                if (maybeNode.type === NodeType.EXPRESSION) {
                    return expressionUsesGlobalVariable(
                        maybeNode as ExpressionNode,
                        globalVariableNames,
                        macroCallUsesGlobalVariable,
                    );
                }
                if (maybeNode.type === NodeType.IDENTIFIER_EXPRESSION) {
                    return isIdentifierUsingGlobalVariable(maybeNode as IdentifierExpressionNode, globalVariableNames);
                }
                return false;
            });
        case StatementType.MACRO_CALL:
            return (
                macroCallUsesGlobalVariable(statement.name) ||
                statement.inputArgs.some((expression) =>
                    expressionUsesGlobalVariable(expression, globalVariableNames, macroCallUsesGlobalVariable),
                ) ||
                statement.outputArgs.some((identifier) =>
                    isIdentifierUsingGlobalVariable(identifier, globalVariableNames),
                )
            );
        case StatementType.MACRO_DEFINE:
            return statement.body.some((child) =>
                statementUsesGlobalVariable(child, globalVariableNames, macroCallUsesGlobalVariable),
            );
        case StatementType.IF:
            return (
                expressionUsesGlobalVariable(statement.condition, globalVariableNames, macroCallUsesGlobalVariable) ||
                statement.ifBody.some((child) =>
                    statementUsesGlobalVariable(child, globalVariableNames, macroCallUsesGlobalVariable),
                )
            );
        case StatementType.IF_ELSE:
            return (
                expressionUsesGlobalVariable(statement.condition, globalVariableNames, macroCallUsesGlobalVariable) ||
                statement.ifBody.some((child) =>
                    statementUsesGlobalVariable(child, globalVariableNames, macroCallUsesGlobalVariable),
                ) ||
                statement.elseBody.some((child) =>
                    statementUsesGlobalVariable(child, globalVariableNames, macroCallUsesGlobalVariable),
                )
            );
        case StatementType.FOR:
            return (
                statementUsesGlobalVariable(statement.init, globalVariableNames, macroCallUsesGlobalVariable) ||
                expressionUsesGlobalVariable(statement.condition, globalVariableNames, macroCallUsesGlobalVariable) ||
                (statement.increment
                    ? statementUsesGlobalVariable(statement.increment, globalVariableNames, macroCallUsesGlobalVariable)
                    : false) ||
                statement.body.some((child) =>
                    statementUsesGlobalVariable(child, globalVariableNames, macroCallUsesGlobalVariable),
                )
            );
        case StatementType.WHILE:
            return (
                expressionUsesGlobalVariable(statement.condition, globalVariableNames, macroCallUsesGlobalVariable) ||
                statement.body.some((child) =>
                    statementUsesGlobalVariable(child, globalVariableNames, macroCallUsesGlobalVariable),
                )
            );
        case StatementType.LOOP_CONTROL:
            return false;
        case StatementType.RETURN:
            return expressionUsesGlobalVariable(statement.expression, globalVariableNames, macroCallUsesGlobalVariable);
        default:
            return statement as never;
    }
};

const collectLocalMacroMap = (ast: WithSymbolTable<DocumentNode>): Record<string, MacroDefineStatementNode> => {
    const macroMap: Record<string, MacroDefineStatementNode> = {};

    for (const statement of ast.statementList) {
        if (statement.statementType !== StatementType.MACRO_DEFINE) {
            continue;
        }
        macroMap[statement.name] = statement;
    }

    return macroMap;
};

const createReExportedMacro = (macro: MacroDefineStatementNode, exportName: string): MacroDefineStatementNode => {
    if (macro.name === exportName) {
        return macro;
    }
    return {
        ...macro,
        name: exportName,
    };
};

export const parseProject = (entryPath: string, rootPath?: string): Project => {
    const resolvedEntryPath = tryResolveFile(path.resolve(entryPath));
    if (!resolvedEntryPath) {
        throw new Error(`Entry file "${entryPath}" does not exist`);
    }

    const resolvedRootPath = rootPath ? path.resolve(rootPath) : path.dirname(resolvedEntryPath);
    const sourceMap: Record<string, ResolvedSource> = {};
    const visitingStack: string[] = [];

    const loadSource = (filePath: string): ResolvedSource => {
        if (hasOwn(sourceMap, filePath)) {
            return sourceMap[filePath];
        }

        const cycleStartIndex = visitingStack.indexOf(filePath);
        if (cycleStartIndex >= 0) {
            const cyclePath = [...visitingStack.slice(cycleStartIndex), filePath].join(' -> ');
            throw new Error(`Circular dependency detected: ${cyclePath}`);
        }

        visitingStack.push(filePath);

        try {
            const tokens = lexer.lexFile(filePath);
            const ast = buildSymbolTable(parser.parse(tokens));
            const source: ResolvedSource = {
                path: filePath,
                ast,
                macros: [],
                internalMacros: [],
                exportMap: {},
                localMacroMap: collectLocalMacroMap(ast),
                importAliasMap: {},
                resolvedImports: [],
                globalVariableNames: getGlobalVariableNames(ast),
            };

            sourceMap[filePath] = source;

            for (const importStatement of ast.importList) {
                const importedPath = resolveImportPath(
                    importStatement,
                    filePath,
                    rootPath ? resolvedRootPath : undefined,
                );
                loadSource(importedPath);

                const resolvedImport: ResolvedImport = {
                    sourcePath: importedPath,
                    macroName: importStatement.name,
                    asName: importStatement.asName,
                };
                source.resolvedImports.push(resolvedImport);
                source.importAliasMap[importStatement.asName] = resolvedImport;
            }

            return source;
        } finally {
            visitingStack.pop();
        }
    };

    loadSource(resolvedEntryPath);

    type MacroAlias = { sourcePath: string; macroName: string };
    type MacroResolution = {
        sourcePath: string;
        macroName: string;
        macro: MacroDefineStatementNode;
        aliases: MacroAlias[];
    };

    const resolveMacroDefinition = (
        sourcePath: string,
        macroName: string,
        aliasChain: MacroAlias[] = [],
    ): MacroResolution | undefined => {
        const source = sourceMap[sourcePath];
        if (!source) {
            return undefined;
        }

        const nextAliasChain = [...aliasChain, { sourcePath, macroName }];
        const localMacro = source.localMacroMap[macroName];
        if (localMacro) {
            return {
                sourcePath,
                macroName,
                macro: localMacro,
                aliases: nextAliasChain,
            };
        }

        const imported = source.importAliasMap[macroName];
        if (!imported) {
            return undefined;
        }

        return resolveMacroDefinition(imported.sourcePath, imported.macroName, nextAliasChain);
    };

    type MacroKey = string;

    const toMacroKey = (sourcePath: string, macroName: string): MacroKey => `${sourcePath}\u0000${macroName}`;

    const parseMacroKey = (key: MacroKey): { sourcePath: string; macroName: string } => {
        const separator = key.indexOf('\u0000');
        return {
            sourcePath: key.slice(0, separator),
            macroName: key.slice(separator + 1),
        };
    };

    const macroState = new Map<MacroKey, 'visiting' | 'done'>();
    const macroUsesGlobalVariableMap = new Map<MacroKey, boolean>();
    const macroStack: MacroKey[] = [];

    const analyzeMacroUsesGlobalVariable = (sourcePath: string, macroName: string): boolean => {
        const resolved = resolveMacroDefinition(sourcePath, macroName);
        if (!resolved) {
            return false;
        }

        const key = toMacroKey(resolved.sourcePath, resolved.macroName);
        const currentState = macroState.get(key);

        if (currentState === 'done') {
            return macroUsesGlobalVariableMap.get(key) ?? false;
        }

        if (currentState === 'visiting') {
            const cycleStart = macroStack.indexOf(key);
            const cycleKeys = [...macroStack.slice(cycleStart), key];
            throw new MacroRecursionError(
                cycleKeys.map((item) => {
                    const parsed = parseMacroKey(item);
                    return {
                        macroName: parsed.macroName,
                        sourceFile: parsed.sourcePath,
                    };
                }),
            );
        }

        const ownerSource = sourceMap[resolved.sourcePath];
        macroState.set(key, 'visiting');
        macroStack.push(key);

        try {
            const usesGlobalVariable = resolved.macro.body.some((statement) =>
                statementUsesGlobalVariable(statement, ownerSource.globalVariableNames, (calledMacroName) =>
                    analyzeMacroUsesGlobalVariable(resolved.sourcePath, calledMacroName),
                ),
            );
            macroUsesGlobalVariableMap.set(key, usesGlobalVariable);
            macroState.set(key, 'done');
            return usesGlobalVariable;
        } finally {
            macroStack.pop();
        }
    };

    const localExportMapBySource: Record<string, Record<string, MacroDefineStatementNode>> = {};

    for (const source of Object.values(sourceMap)) {
        const localExportMap: Record<string, MacroDefineStatementNode> = {};
        const internalMacros: MacroDefineStatementNode[] = [];

        for (const [macroName, macroNode] of Object.entries(source.localMacroMap)) {
            if (analyzeMacroUsesGlobalVariable(source.path, macroName)) {
                internalMacros.push(macroNode);
                continue;
            }
            localExportMap[macroName] = macroNode;
        }

        localExportMapBySource[source.path] = localExportMap;
        source.internalMacros = internalMacros;
    }

    const sourceExportState = new Map<string, 'visiting' | 'done'>();

    const buildSourceExportMap = (sourcePath: string): Record<string, MacroDefineStatementNode> => {
        const source = sourceMap[sourcePath];
        const currentState = sourceExportState.get(sourcePath);

        if (currentState === 'done') {
            return source.exportMap;
        }

        if (currentState === 'visiting') {
            throw new Error(`Unexpected import cycle while building exports: ${sourcePath}`);
        }

        sourceExportState.set(sourcePath, 'visiting');

        const exportMap: Record<string, MacroDefineStatementNode> = {
            ...localExportMapBySource[sourcePath],
        };

        for (const resolvedImport of source.resolvedImports) {
            const importedExportMap = buildSourceExportMap(resolvedImport.sourcePath);
            const importedMacro = importedExportMap[resolvedImport.macroName];

            if (!importedMacro) {
                throw new Error(
                    `Macro "${resolvedImport.macroName}" imported by "${sourcePath}" was not exported from "${resolvedImport.sourcePath}"`,
                );
            }

            exportMap[resolvedImport.asName] = createReExportedMacro(importedMacro, resolvedImport.asName);
        }

        source.exportMap = exportMap;
        source.macros = Object.values(exportMap);
        sourceExportState.set(sourcePath, 'done');
        return exportMap;
    };

    for (const sourcePath of Object.keys(sourceMap)) {
        buildSourceExportMap(sourcePath);
    }

    const sources: Record<string, Source> = {};
    for (const [filePath, source] of Object.entries(sourceMap)) {
        sources[filePath] = {
            path: source.path,
            ast: source.ast,
            macros: source.macros,
            internalMacros: source.internalMacros,
        };
    }

    return {
        rootPath: resolvedRootPath,
        entryPath: resolvedEntryPath,
        sources,
    };
};
