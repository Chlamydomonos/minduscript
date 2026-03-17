import {
    ControlType,
    ExpressionChildNode,
    ExpressionNode,
    IdentifierExpressionNode,
    IdentifierType,
    LoopControlType,
    MacroDefineStatementNode,
    NodeType,
    StatementNode,
    StatementType,
    UnitLocateCategory,
} from '@minduscript/parser';
import { counter } from '../counter';
import { gatherMacros, type MacroNameMap } from './gather-macros';
import { IRMacro, IRNodeType, JumpCondition, type IRNode, type IRProgram } from './ir';
import type { Project } from './project';
import { TokenType } from '@minduscript/lexer';

type IRBuildContext = {
    filePath: string;
    parent?: IRBuildContext;
    varNameMap: Record<string, string>;
    breakLabel?: string;
    continueLabel?: string;
    returnLabel?: string;
    macroDependencies?: Set<string>;
    boundVariables?: Set<string>;
};

const getVarName = (context: IRBuildContext, variable: string) => {
    let current = context as IRBuildContext | undefined;
    while (current) {
        if (variable in current.varNameMap) {
            return current.varNameMap[variable];
        }
        current = current.parent;
    }
    return variable;
};

const buildIdentifier = (name: string): { isLiteral: false; isMindustry: boolean; name: string } => ({
    isLiteral: false,
    isMindustry: name.startsWith('@'),
    name,
});

const buildLiteral = (
    value: number | boolean | string | null,
): { isLiteral: true; value: number | boolean | string | null } => ({
    isLiteral: true,
    value,
});

const buildDeclaredIdentifier = (context: IRBuildContext, identifier: string): string => {
    if (context.parent) {
        const newName = `$${counter.next()}`;
        context.varNameMap[identifier] = newName;
        return newName;
    } else {
        return identifier;
    }
};

const buildOutputIdentifier = (context: IRBuildContext, identifier: IdentifierExpressionNode): string => {
    if (identifier.isMindustry) {
        return identifier.value;
    }

    if (identifier.identifierType != IdentifierType.SIMPLE && context.parent) {
        context.varNameMap[identifier.value] = `$${counter.next()}`;
        return context.varNameMap[identifier.value];
    }

    return getVarName(context, identifier.value);
};

const expandExpression = (
    macroNameMap: MacroNameMap,
    context: IRBuildContext,
    expression: ExpressionNode,
    ir: IRNode[],
) => {
    const visit = (node: ExpressionChildNode): string => {
        switch (node.type) {
            case NodeType.UNARY_OP_EXPRESSION: {
                const childName = visit(node.child);
                const newName = `$${counter.next()}`;
                switch (node.opType) {
                    case TokenType.NOT:
                        ir.push({
                            type: IRNodeType.EQ,
                            target: newName,
                            left: buildIdentifier(childName),
                            right: buildLiteral(0),
                        });
                        break;
                    default:
                        ir.push({
                            type: IRNodeType.FLIP,
                            target: newName,
                            value: buildIdentifier(childName),
                        });
                }
                return newName;
            }
            case NodeType.BINARY_OP_EXPRESSION: {
                const lChildName = visit(node.lChild);
                const rChildName = visit(node.rChild);
                const newName = `$${counter.next()}`;
                if (node.opType == TokenType.OR) {
                    const tempName1 = `$${counter.next()}`;
                    const tempName2 = `$${counter.next()}`;
                    ir.push({
                        type: IRNodeType.NE,
                        target: tempName1,
                        left: buildIdentifier(lChildName),
                        right: buildLiteral(0),
                    });
                    ir.push({
                        type: IRNodeType.NE,
                        target: tempName2,
                        left: buildIdentifier(rChildName),
                        right: buildLiteral(0),
                    });
                    ir.push({
                        type: IRNodeType.BITOR,
                        target: newName,
                        left: buildIdentifier(tempName1),
                        right: buildIdentifier(tempName2),
                    });
                } else {
                    const temp = {
                        type: undefined as any as IRNodeType,
                        target: newName,
                        left: buildIdentifier(lChildName),
                        right: buildIdentifier(rChildName),
                    };
                    switch (node.opType) {
                        case TokenType.AND:
                            temp.type = IRNodeType.AND;
                            break;
                        case TokenType.EQ:
                            temp.type = IRNodeType.EQ;
                            break;
                        case TokenType.NE:
                            temp.type = IRNodeType.NE;
                            break;
                        case TokenType.LESS:
                            temp.type = IRNodeType.LESS;
                            break;
                        case TokenType.LE:
                            temp.type = IRNodeType.LE;
                            break;
                        case TokenType.GREATER:
                            temp.type = IRNodeType.GREATER;
                            break;
                        case TokenType.GE:
                            temp.type = IRNodeType.GE;
                            break;
                        case TokenType.STRICT_EQ:
                            temp.type = IRNodeType.STRICT_EQ;
                            break;
                        case TokenType.BITOR:
                            temp.type = IRNodeType.BITOR;
                            break;
                        case TokenType.XOR:
                            temp.type = IRNodeType.XOR;
                            break;
                        case TokenType.BITAND:
                            temp.type = IRNodeType.BITAND;
                            break;
                        case TokenType.SHL:
                            temp.type = IRNodeType.SHL;
                            break;
                        case TokenType.SHR:
                            temp.type = IRNodeType.SHR;
                            break;
                        case TokenType.ADD:
                            temp.type = IRNodeType.ADD;
                            break;
                        case TokenType.SUB:
                            temp.type = IRNodeType.SUB;
                            break;
                        case TokenType.MUL:
                            temp.type = IRNodeType.MUL;
                            break;
                        case TokenType.DIV:
                            temp.type = IRNodeType.DIV;
                            break;
                        case TokenType.IDIV:
                            temp.type = IRNodeType.IDIV;
                            break;
                        case TokenType.MOD:
                            temp.type = IRNodeType.MOD;
                            break;
                        default:
                            temp.type = IRNodeType.POW;
                    }
                    ir.push(temp as any);
                }
                return newName;
            }
            case NodeType.FUNCTION_CALL_EXPRESSION: {
                const argCount = node.args.length;
                if (argCount == 1) {
                    const argName = visit(node.args[0]);
                    const newName = `$${counter.next()}`;
                    const temp = {
                        type: undefined as any as IRNodeType,
                        target: newName,
                        value: buildIdentifier(argName),
                    };
                    switch (node.function) {
                        case TokenType.ABS:
                            temp.type = IRNodeType.ABS;
                            break;
                        case TokenType.LOG:
                            temp.type = IRNodeType.LOG;
                            break;
                        case TokenType.LOG10:
                            temp.type = IRNodeType.LOG10;
                            break;
                        case TokenType.FLOOR:
                            temp.type = IRNodeType.FLOOR;
                            break;
                        case TokenType.CEIL:
                            temp.type = IRNodeType.CEIL;
                            break;
                        case TokenType.SQRT:
                            temp.type = IRNodeType.SQRT;
                            break;
                        case TokenType.RAND:
                            temp.type = IRNodeType.RAND;
                            break;
                        case TokenType.SIN:
                            temp.type = IRNodeType.SIN;
                            break;
                        case TokenType.COS:
                            temp.type = IRNodeType.COS;
                            break;
                        case TokenType.TAN:
                            temp.type = IRNodeType.TAN;
                            break;
                        case TokenType.ASIN:
                            temp.type = IRNodeType.ASIN;
                            break;
                        case TokenType.ACOS:
                            temp.type = IRNodeType.ACOS;
                            break;
                        default:
                            temp.type = IRNodeType.ATAN;
                    }
                    ir.push(temp as any);
                    return newName;
                } else {
                    const leftArgName = visit(node.args[0]);
                    const rightArgName = visit(node.args[1]);
                    const newName = `$${counter.next()}`;
                    const temp = {
                        type: undefined as any as IRNodeType,
                        target: newName,
                        left: buildIdentifier(leftArgName),
                        right: buildIdentifier(rightArgName),
                    };
                    switch (node.function) {
                        case TokenType.MAX:
                            temp.type = IRNodeType.MAX;
                            break;
                        case TokenType.MIN:
                            temp.type = IRNodeType.MIN;
                            break;
                        case TokenType.ANGLE:
                            temp.type = IRNodeType.ANGLE;
                            break;
                        case TokenType.ANGLE_DIFF:
                            temp.type = IRNodeType.ANGLE_DIFF;
                            break;
                        case TokenType.LEN:
                            temp.type = IRNodeType.LEN;
                            break;
                        default:
                            temp.type = IRNodeType.NOISE;
                    }
                    ir.push(temp as any);
                    return newName;
                }
            }
            case NodeType.MACRO_CALL_EXPRESSION: {
                const inputNames: string[] = [];
                for (const arg of node.inputArgs) {
                    inputNames.push(visit(arg));
                }
                const macroName = macroNameMap[context.filePath][node.name];
                const name = macroName.name;
                if (context.macroDependencies) {
                    context.macroDependencies.add(name);
                }
                const newName = `$${counter.next()}`;
                ir.push({
                    type: IRNodeType.MACRO_CALL_ASSIGN,
                    name,
                    returnTarget: newName,
                    inputArgs: inputNames.map((n) => buildIdentifier(n)),
                    outputArgs: node.outputArgs.map((n) => buildOutputIdentifier(context, n)),
                });
                return newName;
            }
            case NodeType.LITERAL_EXPRESSION: {
                const newName = `$${counter.next()}`;
                ir.push({
                    type: IRNodeType.ASSIGN,
                    target: newName,
                    value: buildLiteral(node.value),
                });
                return newName;
            }
            default: {
                if (node.isMindustry) {
                    return node.value;
                }
                return getVarName(context, node.value);
            }
        }
    };

    return visit(expression.child);
};

const buildStatement = (macroNameMap: MacroNameMap, context: IRBuildContext, statement: StatementNode): IRNode[] => {
    const result: IRNode[] = [];

    switch (statement.statementType) {
        case StatementType.EMPTY:
            break;
        case StatementType.VARIABLE_DEFINE: {
            result.push({
                type: IRNodeType.ASSIGN,
                target: buildDeclaredIdentifier(context, statement.variableName),
                value: buildIdentifier(expandExpression(macroNameMap, context, statement.expression, result)),
            });
            break;
        }
        case StatementType.ASSIGN: {
            result.push({
                type: IRNodeType.ASSIGN,
                target: getVarName(context, statement.variableName),
                value: buildIdentifier(expandExpression(macroNameMap, context, statement.expression, result)),
            });
            break;
        }
        case StatementType.CONTROL: {
            switch (statement.controlType) {
                case ControlType.READ: {
                    result.push({
                        type: IRNodeType.READ,
                        output: buildOutputIdentifier(context, statement.output),
                        memoryName: buildIdentifier(
                            expandExpression(macroNameMap, context, statement.memoryName, result),
                        ),
                        memoryIndex: buildIdentifier(
                            expandExpression(macroNameMap, context, statement.memoryIndex, result),
                        ),
                    });
                    break;
                }
                case ControlType.WRITE: {
                    result.push({
                        type: IRNodeType.WRITE,
                        value: buildIdentifier(expandExpression(macroNameMap, context, statement.value, result)),
                        memoryName: buildIdentifier(
                            expandExpression(macroNameMap, context, statement.memoryName, result),
                        ),
                        memoryIndex: buildIdentifier(
                            expandExpression(macroNameMap, context, statement.memoryIndex, result),
                        ),
                    });
                    break;
                }
                case ControlType.DRAW_CLEAR: {
                    result.push({
                        type: IRNodeType.DRAW_CLEAR,
                        r: buildIdentifier(expandExpression(macroNameMap, context, statement.r, result)),
                        g: buildIdentifier(expandExpression(macroNameMap, context, statement.g, result)),
                        b: buildIdentifier(expandExpression(macroNameMap, context, statement.b, result)),
                    });
                    break;
                }
                case ControlType.DRAW_COLOR: {
                    result.push({
                        type: IRNodeType.DRAW_COLOR,
                        r: buildIdentifier(expandExpression(macroNameMap, context, statement.r, result)),
                        g: buildIdentifier(expandExpression(macroNameMap, context, statement.g, result)),
                        b: buildIdentifier(expandExpression(macroNameMap, context, statement.b, result)),
                        a: buildIdentifier(expandExpression(macroNameMap, context, statement.a, result)),
                    });
                    break;
                }
                case ControlType.DRAW_COL: {
                    result.push({
                        type: IRNodeType.DRAW_COL,
                        color: buildIdentifier(expandExpression(macroNameMap, context, statement.color, result)),
                    });
                    break;
                }
                case ControlType.DRAW_STROKE: {
                    result.push({
                        type: IRNodeType.DRAW_STROKE,
                        width: buildIdentifier(expandExpression(macroNameMap, context, statement.width, result)),
                    });
                    break;
                }
                case ControlType.DRAW_LINE: {
                    result.push({
                        type: IRNodeType.DRAW_LINE,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        x2: buildIdentifier(expandExpression(macroNameMap, context, statement.x2, result)),
                        y2: buildIdentifier(expandExpression(macroNameMap, context, statement.y2, result)),
                    });
                    break;
                }
                case ControlType.DRAW_RECT: {
                    result.push({
                        type: IRNodeType.DRAW_RECT,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        width: buildIdentifier(expandExpression(macroNameMap, context, statement.width, result)),
                        height: buildIdentifier(expandExpression(macroNameMap, context, statement.height, result)),
                    });
                    break;
                }
                case ControlType.DRAW_LINE_RECT: {
                    result.push({
                        type: IRNodeType.DRAW_LINE_RECT,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        width: buildIdentifier(expandExpression(macroNameMap, context, statement.width, result)),
                        height: buildIdentifier(expandExpression(macroNameMap, context, statement.height, result)),
                    });
                    break;
                }
                case ControlType.DRAW_POLY: {
                    result.push({
                        type: IRNodeType.DRAW_POLY,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        sides: buildIdentifier(expandExpression(macroNameMap, context, statement.sides, result)),
                        radius: buildIdentifier(expandExpression(macroNameMap, context, statement.radius, result)),
                        rotation: buildIdentifier(expandExpression(macroNameMap, context, statement.rotation, result)),
                    });
                    break;
                }
                case ControlType.DRAW_LINE_POLY: {
                    result.push({
                        type: IRNodeType.DRAW_LINE_POLY,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        sides: buildIdentifier(expandExpression(macroNameMap, context, statement.sides, result)),
                        radius: buildIdentifier(expandExpression(macroNameMap, context, statement.radius, result)),
                        rotation: buildIdentifier(expandExpression(macroNameMap, context, statement.rotation, result)),
                    });
                    break;
                }
                case ControlType.DRAW_TRIANGLE: {
                    result.push({
                        type: IRNodeType.DRAW_TRIANGLE,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        x2: buildIdentifier(expandExpression(macroNameMap, context, statement.x2, result)),
                        y2: buildIdentifier(expandExpression(macroNameMap, context, statement.y2, result)),
                        x3: buildIdentifier(expandExpression(macroNameMap, context, statement.x3, result)),
                        y3: buildIdentifier(expandExpression(macroNameMap, context, statement.y3, result)),
                    });
                    break;
                }
                case ControlType.DRAW_IMAGE: {
                    result.push({
                        type: IRNodeType.DRAW_IMAGE,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        image: buildIdentifier(expandExpression(macroNameMap, context, statement.image, result)),
                        size: buildIdentifier(expandExpression(macroNameMap, context, statement.size, result)),
                        rotation: buildIdentifier(expandExpression(macroNameMap, context, statement.rotation, result)),
                    });
                    break;
                }
                case ControlType.PRINT: {
                    result.push({
                        type: IRNodeType.PRINT,
                        value: buildIdentifier(expandExpression(macroNameMap, context, statement.value, result)),
                    });
                    break;
                }
                case ControlType.DRAW_FLUSH: {
                    result.push({
                        type: IRNodeType.DRAW_FLUSH,
                        target: buildIdentifier(expandExpression(macroNameMap, context, statement.target, result)),
                    });
                    break;
                }
                case ControlType.PRINT_FLUSH: {
                    result.push({
                        type: IRNodeType.PRINT_FLUSH,
                        target: buildIdentifier(expandExpression(macroNameMap, context, statement.target, result)),
                    });
                    break;
                }
                case ControlType.GET_LINK: {
                    result.push({
                        type: IRNodeType.GET_LINK,
                        result: buildOutputIdentifier(context, statement.result),
                        id: buildIdentifier(expandExpression(macroNameMap, context, statement.id, result)),
                    });
                    break;
                }
                case ControlType.SET_ENABLED: {
                    result.push({
                        type: IRNodeType.SET_ENABLED,
                        building: buildIdentifier(expandExpression(macroNameMap, context, statement.building, result)),
                        enabled: buildIdentifier(expandExpression(macroNameMap, context, statement.value, result)),
                    });
                    break;
                }
                case ControlType.SET_SHOOT: {
                    result.push({
                        type: IRNodeType.SET_SHOOT,
                        building: buildIdentifier(expandExpression(macroNameMap, context, statement.building, result)),
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        shoot: buildIdentifier(expandExpression(macroNameMap, context, statement.shoot, result)),
                    });
                    break;
                }
                case ControlType.SET_SHOOT_P: {
                    result.push({
                        type: IRNodeType.SET_SHOOT_P,
                        building: buildIdentifier(expandExpression(macroNameMap, context, statement.building, result)),
                        unit: buildIdentifier(expandExpression(macroNameMap, context, statement.unit, result)),
                        shoot: buildIdentifier(expandExpression(macroNameMap, context, statement.shoot, result)),
                    });
                    break;
                }
                case ControlType.SET_CONFIG: {
                    result.push({
                        type: IRNodeType.SET_CONFIG,
                        building: buildIdentifier(expandExpression(macroNameMap, context, statement.building, result)),
                        config: buildIdentifier(expandExpression(macroNameMap, context, statement.config, result)),
                    });
                    break;
                }
                case ControlType.SET_COLOR: {
                    result.push({
                        type: IRNodeType.SET_COLOR,
                        building: buildIdentifier(expandExpression(macroNameMap, context, statement.building, result)),
                        color: buildIdentifier(expandExpression(macroNameMap, context, statement.color, result)),
                    });
                    break;
                }
                case ControlType.RADAR: {
                    result.push({
                        type: IRNodeType.RADAR,
                        building: buildIdentifier(expandExpression(macroNameMap, context, statement.building, result)),
                        condition1: statement.condition1,
                        condition2: statement.condition2,
                        condition3: statement.condition3,
                        order: buildIdentifier(expandExpression(macroNameMap, context, statement.order, result)),
                        sort: statement.sort,
                        result: buildOutputIdentifier(context, statement.result),
                    });
                    break;
                }
                case ControlType.SENSOR: {
                    result.push({
                        type: IRNodeType.SENSOR,
                        target: buildIdentifier(expandExpression(macroNameMap, context, statement.target, result)),
                        building: buildIdentifier(expandExpression(macroNameMap, context, statement.building, result)),
                        result: buildOutputIdentifier(context, statement.result),
                    });
                    break;
                }
                case ControlType.PACK_COLOR: {
                    result.push({
                        type: IRNodeType.PACK_COLOR,
                        result: buildOutputIdentifier(context, statement.result),
                        r: buildIdentifier(expandExpression(macroNameMap, context, statement.r, result)),
                        g: buildIdentifier(expandExpression(macroNameMap, context, statement.g, result)),
                        b: buildIdentifier(expandExpression(macroNameMap, context, statement.b, result)),
                        a: buildIdentifier(expandExpression(macroNameMap, context, statement.a, result)),
                    });
                    break;
                }
                case ControlType.WAIT: {
                    result.push({
                        type: IRNodeType.WAIT,
                        time: buildIdentifier(expandExpression(macroNameMap, context, statement.time, result)),
                    });
                    break;
                }
                case ControlType.CPU_STOP: {
                    result.push({ type: IRNodeType.CPU_STOP });
                    break;
                }
                case ControlType.UNIT_BIND: {
                    result.push({
                        type: IRNodeType.UNIT_BIND,
                        unit: buildIdentifier(expandExpression(macroNameMap, context, statement.unit, result)),
                    });
                    break;
                }
                case ControlType.UNIT_RADAR: {
                    result.push({
                        type: IRNodeType.UNIT_RADAR,
                        condition1: statement.condition1,
                        condition2: statement.condition2,
                        condition3: statement.condition3,
                        order: buildIdentifier(expandExpression(macroNameMap, context, statement.order, result)),
                        sort: statement.sort,
                        result: buildOutputIdentifier(context, statement.result),
                    });
                    break;
                }
                case ControlType.UNIT_LOCATE: {
                    switch (statement.category) {
                        case UnitLocateCategory.ORE: {
                            result.push({
                                type: IRNodeType.UNIT_LOCATE_ORE,
                                target: buildIdentifier(
                                    expandExpression(macroNameMap, context, statement.target, result),
                                ),
                                outX: buildOutputIdentifier(context, statement.outX),
                                outY: buildOutputIdentifier(context, statement.outY),
                                found: buildOutputIdentifier(context, statement.found),
                            });
                            break;
                        }
                        case UnitLocateCategory.BUILDING: {
                            result.push({
                                type: IRNodeType.UNIT_LOCATE_BUILDING,
                                group: statement.group,
                                enemy: buildIdentifier(
                                    expandExpression(macroNameMap, context, statement.enemy, result),
                                ),
                                outX: buildOutputIdentifier(context, statement.outX),
                                outY: buildOutputIdentifier(context, statement.outY),
                                found: buildOutputIdentifier(context, statement.found),
                                building: buildOutputIdentifier(context, statement.building),
                            });
                            break;
                        }
                        case UnitLocateCategory.SPAWN: {
                            result.push({
                                type: IRNodeType.UNIT_LOCATE_SPAWN,
                                outX: buildOutputIdentifier(context, statement.outX),
                                outY: buildOutputIdentifier(context, statement.outY),
                                found: buildOutputIdentifier(context, statement.found),
                                building: buildOutputIdentifier(context, statement.building),
                            });
                            break;
                        }
                        case UnitLocateCategory.DAMAGED: {
                            result.push({
                                type: IRNodeType.UNIT_LOCATE_DAMAGED,
                                outX: buildOutputIdentifier(context, statement.outX),
                                outY: buildOutputIdentifier(context, statement.outY),
                                found: buildOutputIdentifier(context, statement.found),
                                building: buildOutputIdentifier(context, statement.building),
                            });
                            break;
                        }
                    }
                    break;
                }
                case ControlType.IDLE: {
                    result.push({ type: IRNodeType.IDLE });
                    break;
                }
                case ControlType.STOP: {
                    result.push({ type: IRNodeType.STOP });
                    break;
                }
                case ControlType.MOVE: {
                    result.push({
                        type: IRNodeType.MOVE,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                    });
                    break;
                }
                case ControlType.APPROACH: {
                    result.push({
                        type: IRNodeType.APPROACH,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        distance: buildIdentifier(expandExpression(macroNameMap, context, statement.distance, result)),
                    });
                    break;
                }
                case ControlType.PATH_FIND: {
                    result.push({
                        type: IRNodeType.PATH_FIND,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                    });
                    break;
                }
                case ControlType.AUTO_PATH_FIND: {
                    result.push({ type: IRNodeType.AUTO_PATH_FIND });
                    break;
                }
                case ControlType.BOOST: {
                    result.push({
                        type: IRNodeType.BOOST,
                        enabled: buildIdentifier(expandExpression(macroNameMap, context, statement.enabled, result)),
                    });
                    break;
                }
                case ControlType.TARGET: {
                    result.push({
                        type: IRNodeType.TARGET,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        shoot: buildIdentifier(expandExpression(macroNameMap, context, statement.shoot, result)),
                    });
                    break;
                }
                case ControlType.TARGET_P: {
                    result.push({
                        type: IRNodeType.TARGET_P,
                        unit: buildIdentifier(expandExpression(macroNameMap, context, statement.unit, result)),
                        shoot: buildIdentifier(expandExpression(macroNameMap, context, statement.shoot, result)),
                    });
                    break;
                }
                case ControlType.ITEM_DROP: {
                    result.push({
                        type: IRNodeType.ITEM_DROP,
                        building: buildIdentifier(expandExpression(macroNameMap, context, statement.building, result)),
                        amount: buildIdentifier(expandExpression(macroNameMap, context, statement.amount, result)),
                    });
                    break;
                }
                case ControlType.ITEM_TAKE: {
                    result.push({
                        type: IRNodeType.ITEM_TAKE,
                        building: buildIdentifier(expandExpression(macroNameMap, context, statement.building, result)),
                        item: buildIdentifier(expandExpression(macroNameMap, context, statement.item, result)),
                        amount: buildIdentifier(expandExpression(macroNameMap, context, statement.amount, result)),
                    });
                    break;
                }
                case ControlType.PAY_DROP: {
                    result.push({ type: IRNodeType.PAY_DROP });
                    break;
                }
                case ControlType.PAY_TAKE: {
                    result.push({
                        type: IRNodeType.PAY_TAKE,
                        takeUnits: buildIdentifier(
                            expandExpression(macroNameMap, context, statement.takeUnits, result),
                        ),
                    });
                    break;
                }
                case ControlType.PAY_ENTER: {
                    result.push({ type: IRNodeType.PAY_ENTER });
                    break;
                }
                case ControlType.MINE: {
                    result.push({
                        type: IRNodeType.MINE,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                    });
                    break;
                }
                case ControlType.FLAG: {
                    result.push({
                        type: IRNodeType.FLAG,
                        flag: buildIdentifier(expandExpression(macroNameMap, context, statement.flag, result)),
                    });
                    break;
                }
                case ControlType.BUILD: {
                    result.push({
                        type: IRNodeType.BUILD,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        block: buildIdentifier(expandExpression(macroNameMap, context, statement.block, result)),
                        rotation: buildIdentifier(expandExpression(macroNameMap, context, statement.rotation, result)),
                        config: buildIdentifier(expandExpression(macroNameMap, context, statement.config, result)),
                    });
                    break;
                }
                case ControlType.GET_BLOCK: {
                    result.push({
                        type: IRNodeType.GET_BLOCK,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        outType: buildOutputIdentifier(context, statement.outType),
                        building: buildOutputIdentifier(context, statement.building),
                        floor: buildOutputIdentifier(context, statement.floor),
                    });
                    break;
                }
                case ControlType.WITHIN: {
                    result.push({
                        type: IRNodeType.WITHIN,
                        x: buildIdentifier(expandExpression(macroNameMap, context, statement.x, result)),
                        y: buildIdentifier(expandExpression(macroNameMap, context, statement.y, result)),
                        radius: buildIdentifier(expandExpression(macroNameMap, context, statement.radius, result)),
                        result: buildOutputIdentifier(context, statement.result),
                    });
                    break;
                }
                case ControlType.UNBIND: {
                    result.push({ type: IRNodeType.UNBIND });
                    break;
                }
            }
            break;
        }
        case StatementType.MACRO_CALL: {
            const macroName = macroNameMap[context.filePath][statement.name];
            const name = macroName.name;
            if (context.macroDependencies) {
                context.macroDependencies.add(name);
            }
            result.push({
                type: IRNodeType.MACRO_CALL,
                name,
                inputArgs: statement.inputArgs.map((arg) =>
                    buildIdentifier(expandExpression(macroNameMap, context, arg, result)),
                ),
                outputArgs: statement.outputArgs.map((arg) => buildOutputIdentifier(context, arg)),
            });
            break;
        }
        case StatementType.IF_ELSE: {
            const elseLabel = `${counter.next()}`;
            const endLabel = `${counter.next()}`;
            const conditionName = expandExpression(macroNameMap, context, statement.condition, result);
            result.push({
                type: IRNodeType.CONDITIONAL_JUMP,
                condition: JumpCondition.EQ,
                left: buildIdentifier(conditionName),
                right: buildLiteral(0),
                label: elseLabel,
            });
            const newContext1: IRBuildContext = {
                ...context,
                parent: context,
                varNameMap: {},
            };
            result.push(...buildStatementList(macroNameMap, newContext1, statement.ifBody));
            result.push({
                type: IRNodeType.JUMP,
                label: endLabel,
            });
            result.push({
                type: IRNodeType.LABEL,
                name: elseLabel,
            });
            const newContext2: IRBuildContext = {
                ...context,
                parent: context,
                varNameMap: {},
            };
            result.push(...buildStatementList(macroNameMap, newContext2, statement.elseBody));
            result.push({
                type: IRNodeType.LABEL,
                name: endLabel,
            });
            break;
        }
        case StatementType.IF: {
            const endLabel = `${counter.next()}`;
            const conditionName = expandExpression(macroNameMap, context, statement.condition, result);
            result.push({
                type: IRNodeType.CONDITIONAL_JUMP,
                condition: JumpCondition.EQ,
                left: buildIdentifier(conditionName),
                right: buildLiteral(0),
                label: endLabel,
            });
            const newContext: IRBuildContext = {
                ...context,
                parent: context,
                varNameMap: {},
            };
            result.push(...buildStatementList(macroNameMap, newContext, statement.ifBody));
            result.push({
                type: IRNodeType.LABEL,
                name: endLabel,
            });
            break;
        }
        case StatementType.FOR: {
            const conditionLabel = `${counter.next()}`;
            const incrementLabel = `${counter.next()}`;
            const endLabel = `${counter.next()}`;
            const forContext: IRBuildContext = {
                ...context,
                parent: context,
                varNameMap: {},
            };
            result.push(...buildStatement(macroNameMap, forContext, statement.init));
            result.push({
                type: IRNodeType.LABEL,
                name: conditionLabel,
            });
            const forConditionName = expandExpression(macroNameMap, forContext, statement.condition, result);
            result.push({
                type: IRNodeType.CONDITIONAL_JUMP,
                condition: JumpCondition.EQ,
                left: buildIdentifier(forConditionName),
                right: buildLiteral(0),
                label: endLabel,
            });
            const forBodyContext: IRBuildContext = {
                ...forContext,
                parent: forContext,
                varNameMap: {},
                breakLabel: endLabel,
                continueLabel: incrementLabel,
            };
            result.push(...buildStatementList(macroNameMap, forBodyContext, statement.body));
            result.push({
                type: IRNodeType.LABEL,
                name: incrementLabel,
            });
            if (statement.increment) {
                result.push(...buildStatement(macroNameMap, forContext, statement.increment));
            }
            result.push({
                type: IRNodeType.JUMP,
                label: conditionLabel,
            });
            result.push({
                type: IRNodeType.LABEL,
                name: endLabel,
            });
            break;
        }
        case StatementType.WHILE: {
            const conditionLabel = `${counter.next()}`;
            const endLabel = `${counter.next()}`;
            result.push({
                type: IRNodeType.LABEL,
                name: conditionLabel,
            });
            const conditionName = expandExpression(macroNameMap, context, statement.condition, result);
            result.push({
                type: IRNodeType.CONDITIONAL_JUMP,
                condition: JumpCondition.EQ,
                left: buildIdentifier(conditionName),
                right: buildLiteral(0),
                label: endLabel,
            });
            const newContext: IRBuildContext = {
                ...context,
                parent: context,
                varNameMap: {},
                breakLabel: endLabel,
                continueLabel: conditionLabel,
            };
            result.push(...buildStatementList(macroNameMap, newContext, statement.body));
            result.push({
                type: IRNodeType.JUMP,
                label: conditionLabel,
            });
            result.push({
                type: IRNodeType.LABEL,
                name: endLabel,
            });
            break;
        }
        case StatementType.LOOP_CONTROL: {
            if (statement.controlType == LoopControlType.BREAK) {
                result.push({
                    type: IRNodeType.JUMP,
                    label: context.breakLabel!,
                });
            } else {
                result.push({
                    type: IRNodeType.JUMP,
                    label: context.continueLabel!,
                });
            }
            break;
        }
        case StatementType.RETURN: {
            const returnValueName = expandExpression(macroNameMap, context, statement.expression, result);
            result.push({
                type: IRNodeType.ASSIGN,
                target: '$return',
                value: buildIdentifier(returnValueName),
            });
            result.push({
                type: IRNodeType.JUMP,
                label: context.returnLabel!,
            });
            break;
        }
        case StatementType.BIND: {
            if (context.boundVariables) {
                context.boundVariables.add(statement.variableName);
            }
            break;
        }
        default:
            break;
    }

    return result;
};

const buildStatementList = (
    macroNameMap: MacroNameMap,
    context: IRBuildContext,
    statements: StatementNode[],
): IRNode[] => {
    const result: IRNode[] = [];
    for (const statement of statements) {
        result.push(...buildStatement(macroNameMap, context, statement));
    }
    return result;
};

const buildMacro = (macroNameMap: MacroNameMap, filePath: string, macro: MacroDefineStatementNode): IRMacro => {
    const returnLabel = `${counter.next()}`;

    const context: IRBuildContext = {
        filePath,
        parent: {
            filePath,
            varNameMap: {},
        },
        varNameMap: {},
        returnLabel,
        macroDependencies: new Set(),
    };

    const inputParams: string[] = [];

    for (const param of macro.inputParams) {
        const newName = `$input_${counter.next()}`;
        context.varNameMap[param] = newName;
        inputParams.push(newName);
    }

    const outputParams: string[] = [];
    for (const param of macro.outputParams) {
        const newName = `$output_${counter.next()}`;
        context.varNameMap[param] = newName;
        outputParams.push(newName);
    }

    const ir = buildStatementList(macroNameMap, context, macro.body);
    ir.push({
        type: IRNodeType.ASSIGN,
        target: '$return',
        value: buildLiteral(null),
    });
    ir.push({
        type: IRNodeType.LABEL,
        name: returnLabel,
    });

    return {
        name: macroNameMap[filePath][macro.name].name,
        inputParams,
        outputParams,
        body: ir,
        dependencies: context.macroDependencies!,
    };
};

const buildMain = (
    macroNameMap: MacroNameMap,
    filePath: string,
    mainBody: StatementNode[],
    boundVariables: Set<string>,
): IRNode[] => {
    const context: IRBuildContext = {
        filePath,
        varNameMap: {},
        boundVariables,
    };

    return buildStatementList(macroNameMap, context, mainBody);
};

export const buildIR = (project: Project): IRProgram => {
    const macroNameMap = gatherMacros(project);
    counter.reset();

    const macros: IRMacro[] = [];

    const visitedMacros = new Set<string>();
    for (const filePath in macroNameMap) {
        for (const macroName in macroNameMap[filePath]) {
            const macroMetadata = macroNameMap[filePath][macroName];
            const macroId = macroMetadata.name;
            if (!visitedMacros.has(macroId)) {
                const declarationSource = project.sources[macroMetadata.filePath];
                if (!declarationSource) {
                    continue;
                }

                const hasSameMacroId = (name: string) => macroNameMap[macroMetadata.filePath]?.[name]?.name === macroId;

                let macroNode: MacroDefineStatementNode | undefined = declarationSource.macros.find((m) =>
                    hasSameMacroId(m.name),
                );
                if (!macroNode) {
                    macroNode = declarationSource.internalMacros.find((m) => hasSameMacroId(m.name));
                }
                if (!macroNode) {
                    continue;
                }
                visitedMacros.add(macroId);
                macros.push(buildMacro(macroNameMap, macroMetadata.filePath, macroNode));
            }
        }
    }

    const boundVariables = new Set<string>();

    return {
        macros,
        boundVariables,
        main: buildMain(
            macroNameMap,
            project.entryPath,
            project.sources[project.entryPath].ast.statementList,
            boundVariables,
        ),
    };
};
