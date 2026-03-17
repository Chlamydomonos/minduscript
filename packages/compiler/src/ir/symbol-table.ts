import type {
    ASTNode,
    BindStatementNode,
    ControlStatementNode,
    DocumentNode,
    ExpressionChildNode,
    ExpressionNode,
    ForStatementNode,
    IdentifierExpressionNode,
    IfElseStatementNode,
    IfStatementNode,
    ImportStatementNode,
    MacroCallExpressionNode,
    MacroCallStatementNode,
    MacroDefineStatementNode,
    MinduscriptIdentifierExpressionNode,
    StatementNode,
    VariableDefineStatementNode,
    WhileStatementNode,
} from '@minduscript/parser';
import { IdentifierType, NodeType, StatementType } from '@minduscript/parser';

export type VarSymbolSource = VariableDefineStatementNode | BindStatementNode | MinduscriptIdentifierExpressionNode;
export type MacroSymbolSource = MacroDefineStatementNode | ImportStatementNode;

// 符号表，记录符号名称以及来源
export type SymbolTable = {
    vars: Record<string, VarSymbolSource>;
    consts: Record<string, VarSymbolSource>;
    macros: Record<string, MacroSymbolSource>;
};

export type WithSymbolTable<T extends ASTNode> = T extends ASTNode
    ? {
          [K in keyof T]: T[K] extends ASTNode
              ? WithSymbolTable<T[K]>
              : T[K] extends (infer N extends ASTNode)[]
                ? WithSymbolTable<N>[]
                : T[K];
      } & { symbolTable: SymbolTable }
    : never;

export class BuildSymbolTableError extends Error {
    constructor(
        readonly node: ASTNode,
        message: string,
    ) {
        super(message);
    }
}

// 拷贝符号表，只拷贝2层，以节省内存以及保证引用的一致性
const copySymbolTable = (source: SymbolTable): SymbolTable => ({
    vars: { ...source.vars },
    consts: { ...source.consts },
    macros: { ...source.macros },
});

type BuildContext = {
    globalTable: SymbolTable;
    inLoop: number;
    inMacro: number;
    isTopLevel: boolean;
};

const hasOwn = (record: Record<string, unknown>, name: string): boolean =>
    Object.prototype.hasOwnProperty.call(record, name);

const hasAnySymbol = (table: SymbolTable, name: string): boolean =>
    hasOwn(table.vars, name) || hasOwn(table.consts, name) || hasOwn(table.macros, name);

const findVarOrConst = (scope: SymbolTable, globalTable: SymbolTable, name: string): VarSymbolSource | undefined => {
    if (hasOwn(scope.vars, name)) {
        return scope.vars[name];
    }
    if (hasOwn(scope.consts, name)) {
        return scope.consts[name];
    }
    if (hasOwn(globalTable.vars, name)) {
        return globalTable.vars[name];
    }
    if (hasOwn(globalTable.consts, name)) {
        return globalTable.consts[name];
    }
    return undefined;
};

const isConstSymbol = (scope: SymbolTable, globalTable: SymbolTable, name: string): boolean => {
    if (hasOwn(scope.consts, name)) {
        return true;
    }
    if (hasOwn(scope.vars, name)) {
        return false;
    }
    return hasOwn(globalTable.consts, name);
};

const createSyntheticIdentifier = (
    name: string,
    identifierType: IdentifierType,
): MinduscriptIdentifierExpressionNode => ({
    type: NodeType.IDENTIFIER_EXPRESSION,
    tokens: [],
    value: name,
    identifierType,
    isMindustry: false,
});

const ensureMindustryGlobal = (
    identifier: IdentifierExpressionNode,
    scope: SymbolTable,
    globalTable: SymbolTable,
): void => {
    if (!identifier.isMindustry) {
        return;
    }
    if (hasAnySymbol(globalTable, identifier.value)) {
        return;
    }
    const source = createSyntheticIdentifier(identifier.value, IdentifierType.SIMPLE);
    globalTable.vars[identifier.value] = source;
    if (!hasAnySymbol(scope, identifier.value)) {
        scope.vars[identifier.value] = source;
    }
};

const defineVariable = (
    name: string,
    isConst: boolean,
    source: VarSymbolSource,
    node: ASTNode,
    scope: SymbolTable,
    context: BuildContext,
): void => {
    if (hasAnySymbol(scope, name)) {
        throw new BuildSymbolTableError(node, `Symbol "${name}" is already defined in current scope`);
    }
    if (!context.isTopLevel && hasAnySymbol(context.globalTable, name)) {
        throw new BuildSymbolTableError(node, `Local symbol "${name}" conflicts with global symbol`);
    }
    if (isConst) {
        scope.consts[name] = source;
    } else {
        scope.vars[name] = source;
    }
};

const defineMacro = (name: string, source: MacroSymbolSource, node: ASTNode, scope: SymbolTable): void => {
    if (hasAnySymbol(scope, name)) {
        throw new BuildSymbolTableError(node, `Symbol "${name}" is already defined in current scope`);
    }
    scope.macros[name] = source;
};

const attachSymbolTable = <T extends ASTNode>(node: T, scope: SymbolTable, patch?: Partial<T>): WithSymbolTable<T> => {
    return {
        ...node,
        ...(patch ?? {}),
        symbolTable: copySymbolTable(scope),
    } as WithSymbolTable<T>;
};

const buildSymbolTable = (document: DocumentNode): WithSymbolTable<DocumentNode> => {
    const globalTable: SymbolTable = {
        vars: {},
        consts: {},
        macros: {},
    };

    const processExpression = (
        expression: ExpressionNode,
        scope: SymbolTable,
        context: BuildContext,
    ): WithSymbolTable<ExpressionNode> => {
        const processOutputIdentifier = (
            identifier: IdentifierExpressionNode,
            localScope: SymbolTable,
            localContext: BuildContext,
        ): WithSymbolTable<IdentifierExpressionNode> => {
            const transformed = attachSymbolTable(identifier, localScope);
            if (identifier.isMindustry) {
                ensureMindustryGlobal(identifier, localScope, localContext.globalTable);
                return transformed;
            }
            if (
                identifier.identifierType === IdentifierType.LET ||
                identifier.identifierType === IdentifierType.CONST
            ) {
                defineVariable(
                    identifier.value,
                    identifier.identifierType === IdentifierType.CONST,
                    identifier,
                    identifier,
                    localScope,
                    localContext,
                );
                return transformed;
            }
            const symbol = findVarOrConst(localScope, localContext.globalTable, identifier.value);
            if (!symbol) {
                throw new BuildSymbolTableError(identifier, `Undefined variable or constant "${identifier.value}"`);
            }
            if (isConstSymbol(localScope, localContext.globalTable, identifier.value)) {
                throw new BuildSymbolTableError(identifier, `Cannot assign to constant "${identifier.value}"`);
            }
            return transformed;
        };

        const processExpressionChild = (
            child: ExpressionChildNode,
            localScope: SymbolTable,
            localContext: BuildContext,
        ): WithSymbolTable<ExpressionChildNode> => {
            switch (child.type) {
                case NodeType.UNARY_OP_EXPRESSION:
                    return attachSymbolTable(child, localScope, {
                        child: processExpressionChild(child.child, localScope, localContext),
                    });
                case NodeType.BINARY_OP_EXPRESSION:
                    return attachSymbolTable(child, localScope, {
                        lChild: processExpressionChild(child.lChild, localScope, localContext),
                        rChild: processExpressionChild(child.rChild, localScope, localContext),
                    });
                case NodeType.FUNCTION_CALL_EXPRESSION:
                    return attachSymbolTable(child, localScope, {
                        args: child.args.map((arg) => processExpressionChild(arg, localScope, localContext)),
                    });
                case NodeType.MACRO_CALL_EXPRESSION: {
                    const macroCall = child as MacroCallExpressionNode;
                    if (
                        !hasOwn(localScope.macros, macroCall.name) &&
                        !hasOwn(localContext.globalTable.macros, macroCall.name)
                    ) {
                        throw new BuildSymbolTableError(child, `Undefined macro "${macroCall.name}"`);
                    }
                    return attachSymbolTable(child, localScope, {
                        inputArgs: macroCall.inputArgs.map((arg) =>
                            processExpressionChild(arg, localScope, localContext),
                        ),
                        outputArgs: macroCall.outputArgs.map((arg) =>
                            processOutputIdentifier(arg, localScope, localContext),
                        ),
                    });
                }
                case NodeType.LITERAL_EXPRESSION:
                    return attachSymbolTable(child, localScope);
                case NodeType.IDENTIFIER_EXPRESSION:
                    if (child.isMindustry) {
                        ensureMindustryGlobal(child, localScope, localContext.globalTable);
                        return attachSymbolTable(child, localScope);
                    }
                    if (!findVarOrConst(localScope, localContext.globalTable, child.value)) {
                        throw new BuildSymbolTableError(child, `Undefined variable or constant "${child.value}"`);
                    }
                    return attachSymbolTable(child, localScope);
                default:
                    return child as never;
            }
        };

        return attachSymbolTable(expression, scope, {
            child: processExpressionChild(expression.child, scope, context),
        });
    };

    const processStatementList = (
        statements: StatementNode[],
        scope: SymbolTable,
        context: BuildContext,
    ): WithSymbolTable<StatementNode>[] => {
        const output: WithSymbolTable<StatementNode>[] = [];
        for (const statement of statements) {
            output.push(processStatement(statement, scope, context));
        }
        return output;
    };

    const processControlStatement = (
        statement: ControlStatementNode,
        scope: SymbolTable,
        context: BuildContext,
    ): WithSymbolTable<ControlStatementNode> => {
        const patch: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(statement)) {
            if (key === 'type' || key === 'statementType' || key === 'controlType' || key === 'tokens') {
                continue;
            }
            if (!value || typeof value !== 'object') {
                continue;
            }
            const maybeNode = value as ASTNode;
            if (maybeNode.type === NodeType.EXPRESSION) {
                patch[key] = processExpression(value as ExpressionNode, scope, context);
            }
        }

        for (const [key, value] of Object.entries(statement)) {
            if (key in patch) {
                continue;
            }
            if (!value || typeof value !== 'object') {
                continue;
            }
            const maybeNode = value as ASTNode;
            if (maybeNode.type !== NodeType.IDENTIFIER_EXPRESSION) {
                continue;
            }
            const identifier = value as IdentifierExpressionNode;
            patch[key] = attachSymbolTable(identifier, scope);
            if (identifier.isMindustry) {
                ensureMindustryGlobal(identifier, scope, context.globalTable);
                continue;
            }
            if (
                identifier.identifierType === IdentifierType.LET ||
                identifier.identifierType === IdentifierType.CONST
            ) {
                defineVariable(
                    identifier.value,
                    identifier.identifierType === IdentifierType.CONST,
                    identifier,
                    statement,
                    scope,
                    context,
                );
                continue;
            }
            const symbol = findVarOrConst(scope, context.globalTable, identifier.value);
            if (!symbol) {
                throw new BuildSymbolTableError(statement, `Undefined variable or constant "${identifier.value}"`);
            }
            if (isConstSymbol(scope, context.globalTable, identifier.value)) {
                throw new BuildSymbolTableError(statement, `Cannot assign to constant "${identifier.value}"`);
            }
        }

        return attachSymbolTable(statement, scope, patch as Partial<ControlStatementNode>);
    };

    const processStatement = (
        statement: StatementNode,
        scope: SymbolTable,
        context: BuildContext,
    ): WithSymbolTable<StatementNode> => {
        switch (statement.statementType) {
            case StatementType.EMPTY:
                return attachSymbolTable(statement, scope);
            case StatementType.VARIABLE_DEFINE: {
                const variableStatement = statement as VariableDefineStatementNode;
                const expression = processExpression(variableStatement.expression, scope, context);
                const output = attachSymbolTable(statement, scope, {
                    expression,
                });
                defineVariable(
                    variableStatement.variableName,
                    variableStatement.isConst,
                    variableStatement,
                    statement,
                    scope,
                    context,
                );
                return output;
            }
            case StatementType.ASSIGN: {
                const expression = processExpression(statement.expression, scope, context);
                if (!findVarOrConst(scope, context.globalTable, statement.variableName)) {
                    throw new BuildSymbolTableError(
                        statement,
                        `Undefined variable or constant "${statement.variableName}"`,
                    );
                }
                if (isConstSymbol(scope, context.globalTable, statement.variableName)) {
                    throw new BuildSymbolTableError(statement, `Cannot assign to constant "${statement.variableName}"`);
                }
                return attachSymbolTable(statement, scope, { expression });
            }
            case StatementType.CONTROL:
                return processControlStatement(statement as ControlStatementNode, scope, context);
            case StatementType.MACRO_CALL: {
                const macroCall = statement as MacroCallStatementNode;
                if (!hasOwn(scope.macros, macroCall.name) && !hasOwn(context.globalTable.macros, macroCall.name)) {
                    throw new BuildSymbolTableError(statement, `Undefined macro "${macroCall.name}"`);
                }
                const inputArgs = macroCall.inputArgs.map((arg) => processExpression(arg, scope, context));
                const outputArgs = macroCall.outputArgs.map((identifier) => {
                    const transformed = attachSymbolTable(identifier, scope);
                    if (identifier.isMindustry) {
                        ensureMindustryGlobal(identifier, scope, context.globalTable);
                        return transformed;
                    }
                    if (
                        identifier.identifierType === IdentifierType.LET ||
                        identifier.identifierType === IdentifierType.CONST
                    ) {
                        defineVariable(
                            identifier.value,
                            identifier.identifierType === IdentifierType.CONST,
                            identifier,
                            statement,
                            scope,
                            context,
                        );
                        return transformed;
                    }
                    if (!findVarOrConst(scope, context.globalTable, identifier.value)) {
                        throw new BuildSymbolTableError(
                            statement,
                            `Undefined variable or constant "${identifier.value}"`,
                        );
                    }
                    if (isConstSymbol(scope, context.globalTable, identifier.value)) {
                        throw new BuildSymbolTableError(statement, `Cannot assign to constant "${identifier.value}"`);
                    }
                    return transformed;
                });
                return attachSymbolTable(statement, scope, { inputArgs, outputArgs });
            }
            case StatementType.MACRO_DEFINE: {
                const macroDefine = statement as MacroDefineStatementNode;
                if (!context.isTopLevel) {
                    throw new BuildSymbolTableError(statement, 'Macro definition is only allowed at top level');
                }
                defineMacro(macroDefine.name, macroDefine, statement, scope);

                const macroScope = copySymbolTable(scope);
                const macroContext: BuildContext = {
                    ...context,
                    inLoop: 0,
                    inMacro: context.inMacro + 1,
                    isTopLevel: false,
                };

                for (const inputName of macroDefine.inputParams) {
                    defineVariable(
                        inputName,
                        true,
                        createSyntheticIdentifier(inputName, IdentifierType.CONST),
                        statement,
                        macroScope,
                        macroContext,
                    );
                }
                for (const outputName of macroDefine.outputParams) {
                    defineVariable(
                        outputName,
                        false,
                        createSyntheticIdentifier(outputName, IdentifierType.LET),
                        statement,
                        macroScope,
                        macroContext,
                    );
                }

                const body = processStatementList(macroDefine.body, macroScope, macroContext);
                return attachSymbolTable(statement, scope, { body });
            }
            case StatementType.IF: {
                const ifStatement = statement as IfStatementNode;
                const condition = processExpression(ifStatement.condition, scope, context);
                const ifBody = processStatementList(ifStatement.ifBody, copySymbolTable(scope), {
                    ...context,
                    isTopLevel: false,
                });
                return attachSymbolTable(statement, scope, { condition, ifBody });
            }
            case StatementType.IF_ELSE: {
                const ifElse = statement as IfElseStatementNode;
                const condition = processExpression(ifElse.condition, scope, context);
                const ifBody = processStatementList(ifElse.ifBody, copySymbolTable(scope), {
                    ...context,
                    isTopLevel: false,
                });
                const elseBody = processStatementList(ifElse.elseBody, copySymbolTable(scope), {
                    ...context,
                    isTopLevel: false,
                });
                return attachSymbolTable(statement, scope, { condition, ifBody, elseBody });
            }
            case StatementType.FOR: {
                const forStatement = statement as ForStatementNode;
                const forScope = copySymbolTable(scope);
                const loopContext: BuildContext = {
                    ...context,
                    isTopLevel: false,
                };
                const init = processStatement(forStatement.init, forScope, loopContext);
                const condition = processExpression(forStatement.condition, forScope, loopContext);
                const increment = forStatement.increment
                    ? processStatement(forStatement.increment, forScope, loopContext)
                    : undefined;
                const body = processStatementList(forStatement.body, copySymbolTable(forScope), {
                    ...loopContext,
                    inLoop: loopContext.inLoop + 1,
                });
                return attachSymbolTable(statement, scope, { init, condition, increment, body });
            }
            case StatementType.WHILE: {
                const whileStatement = statement as WhileStatementNode;
                const condition = processExpression(whileStatement.condition, scope, context);
                const body = processStatementList(whileStatement.body, copySymbolTable(scope), {
                    ...context,
                    isTopLevel: false,
                    inLoop: context.inLoop + 1,
                });
                return attachSymbolTable(statement, scope, { condition, body });
            }
            case StatementType.LOOP_CONTROL:
                if (context.inLoop <= 0) {
                    throw new BuildSymbolTableError(statement, 'break/continue can only be used inside loops');
                }
                return attachSymbolTable(statement, scope);
            case StatementType.RETURN:
                if (context.inMacro <= 0) {
                    throw new BuildSymbolTableError(statement, 'return can only be used inside macros');
                }
                return attachSymbolTable(statement, scope, {
                    expression: processExpression(statement.expression, scope, context),
                });
            case StatementType.BIND: {
                const bindStatement = statement as BindStatementNode;
                if (!context.isTopLevel) {
                    throw new BuildSymbolTableError(statement, 'bind can only be used at top level');
                }
                const output = attachSymbolTable(statement, scope);
                defineVariable(bindStatement.variableName, true, bindStatement, statement, scope, context);
                return output;
            }
            default:
                return statement as never;
        }
    };

    const importList = document.importList.map((importStatement) => {
        const transformedImport = attachSymbolTable(importStatement, globalTable);
        defineMacro(importStatement.asName, importStatement, importStatement, globalTable);
        return transformedImport;
    });

    const statementList = processStatementList(document.statementList, globalTable, {
        globalTable,
        inLoop: 0,
        inMacro: 0,
        isTopLevel: true,
    });

    return {
        ...document,
        importList,
        statementList,
        symbolTable: copySymbolTable(globalTable),
    };
};

export { buildSymbolTable };
