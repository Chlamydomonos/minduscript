import type {
    ExpressionChildNode,
    ExpressionNode,
    MacroCallExpressionNode,
    MacroCallStatementNode,
    MacroDefineStatementNode,
    StatementNode,
} from '@minduscript/parser';
import { NodeType, StatementType } from '@minduscript/parser';
import type { Project } from '../ir/project';

export enum ErrorPosition {
    INPUT,
    OUTPUT,
}

export class CheckMacroError extends Error {
    constructor(
        readonly node: MacroCallExpressionNode | MacroCallStatementNode,
        readonly position: ErrorPosition,
        readonly expectedArgs: number,
        readonly actualArgs: number,
    ) {
        super(
            `宏参数错误：${node.name}的${expectedArgs == ErrorPosition.OUTPUT ? '输出' : '输入'}参数应为${expectedArgs}个，实为${actualArgs}个`,
        );
    }
}

export const checkMacro = (project: Project) => {
    for (const source of Object.values(project.sources)) {
        const macroMap = new Map<string, MacroDefineStatementNode>();
        for (const macro of [...source.macros, ...source.internalMacros]) {
            macroMap.set(macro.name, macro);
        }

        const checkExpressionChild = (child: ExpressionChildNode): void => {
            switch (child.type) {
                case NodeType.UNARY_OP_EXPRESSION:
                    checkExpressionChild(child.child);
                    break;
                case NodeType.BINARY_OP_EXPRESSION:
                    checkExpressionChild(child.lChild);
                    checkExpressionChild(child.rChild);
                    break;
                case NodeType.FUNCTION_CALL_EXPRESSION:
                    child.args.forEach(checkExpressionChild);
                    break;
                case NodeType.MACRO_CALL_EXPRESSION: {
                    const macroDef = macroMap.get(child.name);
                    if (macroDef) {
                        if (child.inputArgs.length !== macroDef.inputParams.length) {
                            throw new CheckMacroError(
                                child,
                                ErrorPosition.INPUT,
                                macroDef.inputParams.length,
                                child.inputArgs.length,
                            );
                        }
                        if (child.outputArgs.length !== macroDef.outputParams.length) {
                            throw new CheckMacroError(
                                child,
                                ErrorPosition.OUTPUT,
                                macroDef.outputParams.length,
                                child.outputArgs.length,
                            );
                        }
                    }
                    child.inputArgs.forEach(checkExpressionChild);
                    break;
                }
                case NodeType.LITERAL_EXPRESSION:
                case NodeType.IDENTIFIER_EXPRESSION:
                    break;
                default:
                    child satisfies never;
            }
        };

        const checkExpression = (expression: ExpressionNode): void => {
            checkExpressionChild(expression.child);
        };

        const checkStatement = (statement: StatementNode): void => {
            switch (statement.statementType) {
                case StatementType.EMPTY:
                case StatementType.LOOP_CONTROL:
                case StatementType.BIND:
                    break;
                case StatementType.VARIABLE_DEFINE:
                    checkExpression(statement.expression);
                    break;
                case StatementType.ASSIGN:
                    checkExpression(statement.expression);
                    break;
                case StatementType.CONTROL:
                    for (const value of Object.values(statement)) {
                        if (
                            value &&
                            typeof value === 'object' &&
                            'type' in value &&
                            value.type === NodeType.EXPRESSION
                        ) {
                            checkExpression(value as ExpressionNode);
                        }
                    }
                    break;
                case StatementType.MACRO_CALL: {
                    const macroDef = macroMap.get(statement.name);
                    if (macroDef) {
                        if (statement.inputArgs.length !== macroDef.inputParams.length) {
                            throw new CheckMacroError(
                                statement,
                                ErrorPosition.INPUT,
                                macroDef.inputParams.length,
                                statement.inputArgs.length,
                            );
                        }
                        if (statement.outputArgs.length !== macroDef.outputParams.length) {
                            throw new CheckMacroError(
                                statement,
                                ErrorPosition.OUTPUT,
                                macroDef.outputParams.length,
                                statement.outputArgs.length,
                            );
                        }
                    }
                    statement.inputArgs.forEach(checkExpression);
                    break;
                }
                case StatementType.MACRO_DEFINE:
                    statement.body.forEach(checkStatement);
                    break;
                case StatementType.IF:
                    checkExpression(statement.condition);
                    statement.ifBody.forEach(checkStatement);
                    break;
                case StatementType.IF_ELSE:
                    checkExpression(statement.condition);
                    statement.ifBody.forEach(checkStatement);
                    statement.elseBody.forEach(checkStatement);
                    break;
                case StatementType.FOR:
                    checkStatement(statement.init);
                    checkExpression(statement.condition);
                    if (statement.increment) checkStatement(statement.increment);
                    statement.body.forEach(checkStatement);
                    break;
                case StatementType.WHILE:
                    checkExpression(statement.condition);
                    statement.body.forEach(checkStatement);
                    break;
                case StatementType.RETURN:
                    checkExpression(statement.expression);
                    break;
                default:
                    statement satisfies never;
            }
        };

        for (const statement of source.ast.statementList) {
            checkStatement(statement);
        }
    }
};
