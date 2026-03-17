import { createParser } from 'chlamydomonos-parser';
import { TokenType, type Token } from '@minduscript/lexer';
import type {
    ImportStatementNode,
    NodeBase,
    StatementNode,
    Node,
    ImportListNode,
    StatementListNode,
    MacroParamListNode,
    ExpressionNode,
    MacroArgListNode,
    DocumentNode,
    IdentifierExpressionNode,
} from './nodes';
import {
    NodeType,
    StatementType,
    ControlType,
    UnitLocateCategory,
    RadarCondition,
    RadarSortConfig,
    UnitLocateBuildingGroup,
    LoopControlType,
    AssignType,
    IdentifierType,
} from './nodes';
import { expressionParser } from './expression-parser';

type ExpandByKey<Base, Key extends keyof Base> = Base extends infer M
    ? M extends { [K in Key]: infer V }
        ? V extends V
            ? { [K in keyof M]: K extends Key ? V : M[K] }
            : never
        : never
    : never;

type ExpandedToken = ExpandByKey<Token, 'type'>;

const MIN_NODE_TYPE = NodeType.DOCUMENT as number;

const buildNodeBase = (...values: (Token | Node)[]): NodeBase => {
    const tokensOf = (value: Token | Node) => {
        if (value.type < MIN_NODE_TYPE) {
            return [value as Token];
        }
        return (value as Node).tokens;
    };
    return { tokens: values.flatMap((v) => tokensOf(v)) };
};

export const parser = createParser('type')<ExpandedToken, Node>()(
    NodeType.DOCUMENT,
    (g, c) => {
        g.item()
            .target(NodeType.DOCUMENT)
            .source(NodeType.IMPORT_LIST)(NodeType.STATEMENT_LIST)
            .factory((rawImportList, rawStatementList) => {
                const importList: ImportStatementNode[] = [];
                let currentImportList: ImportListNode | undefined = rawImportList;
                while (currentImportList) {
                    importList.push(currentImportList.first);
                    currentImportList = currentImportList.other;
                }
                const statementList: StatementNode[] = [];
                let currentStatementList: StatementListNode | undefined = rawStatementList;
                while (currentStatementList) {
                    statementList.push(currentStatementList.first);
                    currentStatementList = currentStatementList.other;
                }
                return {
                    ...buildNodeBase(rawImportList, rawStatementList),
                    importList,
                    statementList,
                };
            });
        g.item()
            .target(NodeType.DOCUMENT)
            .source(NodeType.IMPORT_LIST)
            .factory((rawImportList) => {
                const importList: ImportStatementNode[] = [];
                let currentImportList: ImportListNode | undefined = rawImportList;
                while (currentImportList) {
                    importList.push(currentImportList.first);
                    currentImportList = currentImportList.other;
                }
                return {
                    ...buildNodeBase(rawImportList),
                    importList,
                    statementList: [],
                };
            });
        g.item()
            .target(NodeType.DOCUMENT)
            .source(NodeType.STATEMENT_LIST)
            .factory((rawStatementList) => {
                const statementList: StatementNode[] = [];
                let currentStatementList: StatementListNode | undefined = rawStatementList;
                while (currentStatementList) {
                    statementList.push(currentStatementList.first);
                    currentStatementList = currentStatementList.other;
                }
                return {
                    ...buildNodeBase(rawStatementList),
                    importList: [],
                    statementList,
                };
            });
        g.item()
            .target(NodeType.IMPORT_LIST)
            .source(NodeType.IMPORT_STATEMENT)(NodeType.IMPORT_LIST)
            .factory((statement, list) => ({
                ...buildNodeBase(statement, list),
                first: statement,
                other: list,
            }));
        g.item()
            .target(NodeType.IMPORT_LIST)
            .source(NodeType.IMPORT_STATEMENT)
            .factory((statement) => ({
                ...buildNodeBase(statement),
                first: statement,
                other: undefined,
            }));
        g.item()
            .target(NodeType.STATEMENT_LIST)
            .source(NodeType.STATEMENT)(NodeType.STATEMENT_LIST)
            .factory((statement, list) => ({
                ...buildNodeBase(statement, list),
                first: statement,
                other: list,
            }));
        g.item()
            .target(NodeType.STATEMENT_LIST)
            .source(NodeType.STATEMENT)
            .factory((statement) => ({
                ...buildNodeBase(statement),
                first: statement,
                other: undefined,
            }));
        g.item()
            .target(NodeType.IMPORT_STATEMENT)
            .source(TokenType.IMPORT)(TokenType.IDENTIFIER)(TokenType.FROM)(TokenType.STRING)(TokenType.SEMICOLON)
            .factory((t1, name, t3, path, t4) => ({
                ...buildNodeBase(t1, name, t3, path, t4),
                name: name.raw,
                asName: name.raw,
                from: JSON.parse(path.raw),
            }));
        g.item()
            .target(NodeType.IMPORT_STATEMENT)
            .source(TokenType.IMPORT)(TokenType.IDENTIFIER)(TokenType.AS)(TokenType.IDENTIFIER)(TokenType.FROM)(
                TokenType.STRING,
            )(TokenType.SEMICOLON)
            .factory((t1, name, t3, asName, t5, path, t7) => ({
                ...buildNodeBase(t1, name, t3, asName, t5, path, t7),
                name: name.raw,
                asName: asName.raw,
                from: JSON.parse(path.raw),
            }));
        g.item()
            .target(NodeType.STATEMENT)
            .source(NodeType.SINGLE_STATEMENT)
            .factory((singleStatement) => singleStatement);
        g.item()
            .target(NodeType.STATEMENT)
            .source(NodeType.BLOCK_STATEMENT)
            .factory((blockStatement) => blockStatement);
        g.item()
            .target(NodeType.SINGLE_STATEMENT)
            .source(NodeType.STATEMENT_BODY)(TokenType.SEMICOLON)
            .factory((statementBody, t) => ({
                ...statementBody,
                ...buildNodeBase(statementBody, t),
            }));
        g.item()
            .target(NodeType.SINGLE_STATEMENT)
            .source(TokenType.SEMICOLON)
            .factory((t) => ({
                ...buildNodeBase(t),
                statementType: StatementType.EMPTY,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.LET)(TokenType.IDENTIFIER)(TokenType.ASSIGN)(NodeType.EXPRESSION)
            .factory((t1, identifier, t3, expression) => ({
                ...buildNodeBase(t1, identifier, t3, expression),
                statementType: StatementType.VARIABLE_DEFINE,
                isConst: false,
                variableName: identifier.raw,
                expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.CONST)(TokenType.IDENTIFIER)(TokenType.ASSIGN)(NodeType.EXPRESSION)
            .factory((t1, identifier, t3, expression) => ({
                ...buildNodeBase(t1, identifier, t3, expression),
                statementType: StatementType.VARIABLE_DEFINE,
                isConst: true,
                variableName: identifier.raw,
                expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.IDENTIFIER)(NodeType.ASSIGN_OP)(NodeType.EXPRESSION)
            .factory((identifier, t, expression) => ({
                ...buildNodeBase(identifier, t, expression),
                statementType: StatementType.ASSIGN,
                assignType: AssignType.SIMPLE,
                variableName: identifier.raw,
                expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.MINDUSTRY_IDENTIFIER)(NodeType.ASSIGN_OP)(NodeType.EXPRESSION)
            .factory((identifier, t, expression) => ({
                ...buildNodeBase(identifier, t, expression),
                statementType: StatementType.ASSIGN,
                assignType: AssignType.SIMPLE,
                variableName: identifier.raw,
                expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.READ)(TokenType.L_PAREN)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, identifier, t4, expression1, t6, expression2, t8) => ({
                ...buildNodeBase(t1, t2, identifier, t4, expression1, t6, expression2, t8),
                statementType: StatementType.CONTROL,
                controlType: ControlType.READ,
                output: identifier,
                memoryName: expression1,
                memoryIndex: expression2,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.WRITE)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8),
                statementType: StatementType.CONTROL,
                controlType: ControlType.WRITE,
                value: expression1,
                memoryName: expression2,
                memoryIndex: expression3,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_CLEAR)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8),
                statementType: StatementType.CONTROL,
                controlType: ControlType.DRAW_CLEAR,
                r: expression1,
                g: expression2,
                b: expression3,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_COLOR)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10),
                statementType: StatementType.CONTROL,
                controlType: ControlType.DRAW_COLOR,
                r: expression1,
                g: expression2,
                b: expression3,
                a: expression4,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_COL)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression, t4) => ({
                ...buildNodeBase(t1, t2, expression, t4),
                statementType: StatementType.CONTROL,
                controlType: ControlType.DRAW_COL,
                color: expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_STROKE)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression, t4) => ({
                ...buildNodeBase(t1, t2, expression, t4),
                statementType: StatementType.CONTROL,
                controlType: ControlType.DRAW_STROKE,
                width: expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_LINE)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10),
                statementType: StatementType.CONTROL,
                controlType: ControlType.DRAW_LINE,
                x: expression1,
                y: expression2,
                x2: expression3,
                y2: expression4,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_RECT)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10),
                statementType: StatementType.CONTROL,
                controlType: ControlType.DRAW_RECT,
                x: expression1,
                y: expression2,
                width: expression3,
                height: expression4,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_LINE_RECT)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10),
                statementType: StatementType.CONTROL,
                controlType: ControlType.DRAW_LINE_RECT,
                x: expression1,
                y: expression2,
                width: expression3,
                height: expression4,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_POLY)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory(
                (t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10, expression5, t12) => ({
                    ...buildNodeBase(
                        t1,
                        t2,
                        expression1,
                        t4,
                        expression2,
                        t6,
                        expression3,
                        t8,
                        expression4,
                        t10,
                        expression5,
                        t12,
                    ),
                    statementType: StatementType.CONTROL,
                    controlType: ControlType.DRAW_POLY,
                    x: expression1,
                    y: expression2,
                    sides: expression3,
                    radius: expression4,
                    rotation: expression5,
                }),
            );
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_LINE_POLY)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.R_PAREN)
            .factory(
                (t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10, expression5, t12) => ({
                    ...buildNodeBase(
                        t1,
                        t2,
                        expression1,
                        t4,
                        expression2,
                        t6,
                        expression3,
                        t8,
                        expression4,
                        t10,
                        expression5,
                        t12,
                    ),
                    statementType: StatementType.CONTROL,
                    controlType: ControlType.DRAW_LINE_POLY,
                    x: expression1,
                    y: expression2,
                    sides: expression3,
                    radius: expression4,
                    rotation: expression5,
                }),
            );
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_TRIANGLE)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory(
                (
                    t1,
                    t2,
                    expression1,
                    t4,
                    expression2,
                    t6,
                    expression3,
                    t8,
                    expression4,
                    t10,
                    expression5,
                    t12,
                    expression6,
                    t14,
                ) => ({
                    ...buildNodeBase(
                        t1,
                        t2,
                        expression1,
                        t4,
                        expression2,
                        t6,
                        expression3,
                        t8,
                        expression4,
                        t10,
                        expression5,
                        t12,
                        expression6,
                        t14,
                    ),
                    statementType: StatementType.CONTROL,
                    controlType: ControlType.DRAW_TRIANGLE,
                    x: expression1,
                    y: expression2,
                    x2: expression3,
                    y2: expression4,
                    x3: expression5,
                    y3: expression6,
                }),
            );
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_IMAGE)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory(
                (t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10, expression5, t12) => ({
                    ...buildNodeBase(
                        t1,
                        t2,
                        expression1,
                        t4,
                        expression2,
                        t6,
                        expression3,
                        t8,
                        expression4,
                        t10,
                        expression5,
                        t12,
                    ),
                    statementType: StatementType.CONTROL,
                    controlType: ControlType.DRAW_IMAGE,
                    x: expression1,
                    y: expression2,
                    image: expression3,
                    size: expression4,
                    rotation: expression5,
                }),
            );
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.PRINT)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression, t4) => ({
                ...buildNodeBase(t1, t2, expression, t4),
                statementType: StatementType.CONTROL,
                controlType: ControlType.PRINT,
                value: expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.DRAW_FLUSH)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression, t4) => ({
                ...buildNodeBase(t1, t2, expression, t4),
                statementType: StatementType.CONTROL,
                controlType: ControlType.DRAW_FLUSH,
                target: expression,
            }));
        const g30 = g
            .item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.PRINT_FLUSH)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression, t4) => ({
                ...buildNodeBase(t1, t2, expression, t4),
                statementType: StatementType.CONTROL,
                controlType: ControlType.PRINT_FLUSH,
                target: expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.GET_LINK)(TokenType.L_PAREN)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.R_PAREN)
            .factory((t1, t2, identifier, t4, expression, t6) => ({
                ...buildNodeBase(t1, t2, identifier, t4, expression, t6),
                statementType: StatementType.CONTROL,
                controlType: ControlType.GET_LINK,
                result: identifier,
                id: expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.SET_ENABLED)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6),
                statementType: StatementType.CONTROL,
                controlType: ControlType.SET_ENABLED,
                building: expression1,
                value: expression2,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.SET_SHOOT)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10),
                statementType: StatementType.CONTROL,
                controlType: ControlType.SET_SHOOT,
                building: expression1,
                x: expression2,
                y: expression3,
                shoot: expression4,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.SET_SHOOT_P)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8),
                statementType: StatementType.CONTROL,
                controlType: ControlType.SET_SHOOT_P,
                building: expression1,
                unit: expression2,
                shoot: expression3,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.SET_CONFIG)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory((t1, t2, expression1, t4, expression2, t6) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6),
                statementType: StatementType.CONTROL,
                controlType: ControlType.SET_CONFIG,
                building: expression1,
                config: expression2,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.SET_COLOR)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory((t1, t2, expression1, t4, expression2, t6) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6),
                statementType: StatementType.CONTROL,
                controlType: ControlType.SET_COLOR,
                building: expression1,
                color: expression2,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.RADAR)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.RADAR_CONDITION)(
                TokenType.COMMA,
            )(NodeType.RADAR_CONDITION)(TokenType.COMMA)(NodeType.RADAR_CONDITION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.COMMA)(NodeType.RADAR_SORT_CONFIG)(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory(
                (
                    t1,
                    t2,
                    expression,
                    t4,
                    condition1,
                    t6,
                    condition2,
                    t8,
                    condition3,
                    t10,
                    order,
                    t12,
                    sort,
                    t14,
                    identifier,
                    t16,
                ) => ({
                    ...buildNodeBase(
                        t1,
                        t2,
                        expression,
                        t4,
                        condition1,
                        t6,
                        condition2,
                        t8,
                        condition3,
                        t10,
                        order,
                        t12,
                        sort,
                        t14,
                        identifier,
                        t16,
                    ),
                    statementType: StatementType.CONTROL,
                    controlType: ControlType.RADAR,
                    building: expression,
                    condition1: condition1.value,
                    condition2: condition2.value,
                    condition3: condition3.value,
                    order,
                    sort: sort.value,
                    result: identifier,
                }),
            );
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.SENSOR)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.IDENTIFIER_EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, identifier, t8) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, identifier, t8),
                statementType: StatementType.CONTROL,
                controlType: ControlType.SENSOR,
                target: expression1,
                building: expression2,
                result: identifier,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.PACK_COLOR)(TokenType.L_PAREN)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(
                NodeType.EXPRESSION,
            )(TokenType.R_PAREN)
            .factory((t1, t2, result, t4, r, t6, g, t7, b, t8, a, t9) => ({
                ...buildNodeBase(t1, t2, result, t4, r, t6, g, t7, b, t8, a, t9),
                statementType: StatementType.CONTROL,
                controlType: ControlType.PACK_COLOR,
                r,
                g,
                b,
                a,
                result,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.WAIT)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression, t4) => ({
                ...buildNodeBase(t1, t2, expression, t4),
                statementType: StatementType.CONTROL,
                controlType: ControlType.WAIT,
                time: expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.CPU_STOP)(TokenType.L_PAREN)(TokenType.R_PAREN)
            .factory((t1, t2, t3) => ({
                ...buildNodeBase(t1, t2, t3),
                statementType: StatementType.CONTROL,
                controlType: ControlType.CPU_STOP,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.UNIT_BIND)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression, t4) => ({
                ...buildNodeBase(t1, t2, expression, t4),
                statementType: StatementType.CONTROL,
                controlType: ControlType.UNIT_BIND,
                unit: expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.UNIT_RADAR)(TokenType.L_PAREN)(NodeType.RADAR_CONDITION)(TokenType.COMMA)(
                NodeType.RADAR_CONDITION,
            )(TokenType.COMMA)(NodeType.RADAR_CONDITION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(
                NodeType.RADAR_SORT_CONFIG,
            )(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, condition1, t4, condition2, t6, condition3, t8, order, t10, sort, t12, result, t14) => ({
                ...buildNodeBase(
                    t1,
                    t2,
                    condition1,
                    t4,
                    condition2,
                    t6,
                    condition3,
                    t8,
                    order,
                    t10,
                    sort,
                    t12,
                    result,
                    t14,
                ),
                statementType: StatementType.CONTROL,
                controlType: ControlType.UNIT_RADAR,
                condition1: condition1.value,
                condition2: condition2.value,
                condition3: condition3.value,
                order,
                sort: sort.value,
                result,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.UNIT_LOCATE)(TokenType.L_PAREN)(TokenType.ORE)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(
                NodeType.IDENTIFIER_EXPRESSION,
            )(TokenType.R_PAREN)
            .factory((t1, t2, t3, t4, expression, t6, outX, t8, outY, t10, found, t12) => ({
                ...buildNodeBase(t1, t2, t3, t4, expression, t6, outX, t8, outY, t10, found, t12),
                statementType: StatementType.CONTROL,
                controlType: ControlType.UNIT_LOCATE,
                category: UnitLocateCategory.ORE,
                target: expression,
                outX,
                outY,
                found,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.UNIT_LOCATE)(TokenType.L_PAREN)(TokenType.BUILDING)(TokenType.COMMA)(
                NodeType.UNIT_LOCATE_BUILDING_GROUP,
            )(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(
                NodeType.IDENTIFIER_EXPRESSION,
            )(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory((t1, t2, t3, t4, group, t6, enemy, t8, outX, t10, outY, t12, found, t14, building, t16) => ({
                ...buildNodeBase(t1, t2, t3, t4, group, t6, enemy, t8, outX, t10, outY, t12, found, t14, building, t16),
                statementType: StatementType.CONTROL,
                controlType: ControlType.UNIT_LOCATE,
                category: UnitLocateCategory.BUILDING,
                group: group.value,
                enemy,
                outX,
                outY,
                found,
                building,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.UNIT_LOCATE)(TokenType.L_PAREN)(TokenType.SPAWN)(TokenType.COMMA)(
                NodeType.IDENTIFIER_EXPRESSION,
            )(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.IDENTIFIER_EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, t3, t4, outX, t6, outY, t8, found, t10, building, t12) => ({
                ...buildNodeBase(t1, t2, t3, t4, outX, t6, outY, t8, found, t10, building, t12),
                statementType: StatementType.CONTROL,
                controlType: ControlType.UNIT_LOCATE,
                category: UnitLocateCategory.SPAWN,
                outX,
                outY,
                found,
                building,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.UNIT_LOCATE)(TokenType.L_PAREN)(TokenType.DAMAGED)(TokenType.COMMA)(
                NodeType.IDENTIFIER_EXPRESSION,
            )(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.IDENTIFIER_EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, t3, t4, outX, t6, outY, t8, found, t10, building, t12) => ({
                ...buildNodeBase(t1, t2, t3, t4, outX, t6, outY, t8, found, t10, building, t12),
                statementType: StatementType.CONTROL,
                controlType: ControlType.UNIT_LOCATE,
                category: UnitLocateCategory.DAMAGED,
                outX,
                outY,
                found,
                building,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.IDLE)(TokenType.L_PAREN)(TokenType.R_PAREN)
            .factory((t1, t2, t3) => ({
                ...buildNodeBase(t1, t2, t3),
                statementType: StatementType.CONTROL,
                controlType: ControlType.IDLE,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.STOP)(TokenType.L_PAREN)(TokenType.R_PAREN)
            .factory((t1, t2, t3) => ({
                ...buildNodeBase(t1, t2, t3),
                statementType: StatementType.CONTROL,
                controlType: ControlType.STOP,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.MOVE)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory((t1, t2, expression1, t4, expression2, t6) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6),
                statementType: StatementType.CONTROL,
                controlType: ControlType.MOVE,
                x: expression1,
                y: expression2,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.APPROACH)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8),
                statementType: StatementType.CONTROL,
                controlType: ControlType.APPROACH,
                x: expression1,
                y: expression2,
                distance: expression3,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.PATH_FIND)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory((t1, t2, expression1, t4, expression2, t6) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6),
                statementType: StatementType.CONTROL,
                controlType: ControlType.PATH_FIND,
                x: expression1,
                y: expression2,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.AUTO_PATH_FIND)(TokenType.L_PAREN)(TokenType.R_PAREN)
            .factory((t1, t2, t3) => ({
                ...buildNodeBase(t1, t2, t3),
                statementType: StatementType.CONTROL,
                controlType: ControlType.AUTO_PATH_FIND,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.BOOST)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression, t4) => ({
                ...buildNodeBase(t1, t2, expression, t4),
                statementType: StatementType.CONTROL,
                controlType: ControlType.BOOST,
                enabled: expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.TARGET)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8),
                statementType: StatementType.CONTROL,
                controlType: ControlType.TARGET,
                x: expression1,
                y: expression2,
                shoot: expression3,
            }));

        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.TARGET_P)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory((t1, t2, expression1, t4, expression2, t6) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6),
                statementType: StatementType.CONTROL,
                controlType: ControlType.TARGET_P,
                unit: expression1,
                shoot: expression2,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.ITEM_DROP)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory((t1, t2, expression1, t4, expression2, t6) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6),
                statementType: StatementType.CONTROL,
                controlType: ControlType.ITEM_DROP,
                building: expression1,
                amount: expression2,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.ITEM_TAKE)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8),
                statementType: StatementType.CONTROL,
                controlType: ControlType.ITEM_TAKE,
                building: expression1,
                item: expression2,
                amount: expression3,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.PAY_DROP)(TokenType.L_PAREN)(TokenType.R_PAREN)
            .factory((t1, t2, t3) => ({
                ...buildNodeBase(t1, t2, t3),

                statementType: StatementType.CONTROL,
                controlType: ControlType.PAY_DROP,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.PAY_TAKE)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, takeUnits, t4) => ({
                ...buildNodeBase(t1, t2, takeUnits, t4),
                statementType: StatementType.CONTROL,
                controlType: ControlType.PAY_TAKE,
                takeUnits,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.PAY_ENTER)(TokenType.L_PAREN)(TokenType.R_PAREN)
            .factory((t1, t2, t3) => ({
                ...buildNodeBase(t1, t2, t3),

                statementType: StatementType.CONTROL,
                controlType: ControlType.PAY_ENTER,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.MINE)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory((t1, t2, expression1, t4, expression2, t6) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6),
                statementType: StatementType.CONTROL,
                controlType: ControlType.MINE,
                x: expression1,
                y: expression2,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.FLAG)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, flag, t4) => ({
                ...buildNodeBase(t1, t2, flag, t4),
                statementType: StatementType.CONTROL,
                controlType: ControlType.FLAG,
                flag,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.BUILD)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.R_PAREN,
            )
            .factory(
                (t1, t2, expression1, t4, expression2, t6, expression3, t8, expression4, t10, expression5, t12) => ({
                    ...buildNodeBase(
                        t1,
                        t2,
                        expression1,
                        t4,
                        expression2,
                        t6,
                        expression3,
                        t8,
                        expression4,
                        t10,
                        expression5,
                        t12,
                    ),
                    statementType: StatementType.CONTROL,
                    controlType: ControlType.BUILD,
                    x: expression1,
                    y: expression2,
                    block: expression3,
                    rotation: expression4,
                    config: expression5,
                }),
            );
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.GET_BLOCK)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(
                NodeType.IDENTIFIER_EXPRESSION,
            )(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, outType, t8, building, t10, floor, t12) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, outType, t8, building, t10, floor, t12),
                statementType: StatementType.CONTROL,
                controlType: ControlType.GET_BLOCK,
                x: expression1,
                y: expression2,
                outType,
                building,
                floor,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.WITHIN)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.EXPRESSION)(
                TokenType.COMMA,
            )(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.IDENTIFIER_EXPRESSION)(TokenType.R_PAREN)
            .factory((t1, t2, expression1, t4, expression2, t6, expression3, t8, result, t10) => ({
                ...buildNodeBase(t1, t2, expression1, t4, expression2, t6, expression3, t8, result, t10),
                statementType: StatementType.CONTROL,
                controlType: ControlType.WITHIN,
                x: expression1,
                y: expression2,
                radius: expression3,
                result,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.UNBIND)(TokenType.L_PAREN)(TokenType.R_PAREN)
            .factory((t1, t2, t3) => ({
                ...buildNodeBase(t1, t2, t3),
                statementType: StatementType.CONTROL,
                controlType: ControlType.UNBIND,
            }));
        g.item()
            .target(NodeType.RADAR_CONDITION)
            .source(TokenType.ANY)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarCondition.ANY }));
        g.item()
            .target(NodeType.RADAR_CONDITION)
            .source(TokenType.ENEMY)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarCondition.ENEMY }));
        g.item()
            .target(NodeType.RADAR_CONDITION)
            .source(TokenType.ALLY)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarCondition.ALLY }));
        g.item()
            .target(NodeType.RADAR_CONDITION)
            .source(TokenType.PLAYER)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarCondition.PLAYER }));
        g.item()
            .target(NodeType.RADAR_CONDITION)
            .source(TokenType.ATTACKER)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarCondition.ATTACKER }));
        g.item()
            .target(NodeType.RADAR_CONDITION)
            .source(TokenType.FLYING)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarCondition.FLYING }));
        g.item()
            .target(NodeType.RADAR_CONDITION)
            .source(TokenType.BOSS)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarCondition.BOSS }));
        g.item()
            .target(NodeType.RADAR_CONDITION)
            .source(TokenType.GROUND)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarCondition.GROUND }));
        g.item()
            .target(NodeType.RADAR_SORT_CONFIG)
            .source(TokenType.DISTANCE)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarSortConfig.DISTANCE }));
        g.item()
            .target(NodeType.RADAR_SORT_CONFIG)
            .source(TokenType.HEALTH)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarSortConfig.HEALTH }));
        g.item()
            .target(NodeType.RADAR_SORT_CONFIG)
            .source(TokenType.SHIELD)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarSortConfig.SHIELD }));
        g.item()
            .target(NodeType.RADAR_SORT_CONFIG)
            .source(TokenType.ARMOR)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarSortConfig.ARMOR }));
        g.item()
            .target(NodeType.RADAR_SORT_CONFIG)
            .source(TokenType.MAX_HEALTH)
            .factory((t1) => ({ ...buildNodeBase(t1), value: RadarSortConfig.MAX_HEALTH }));
        g.item()
            .target(NodeType.UNIT_LOCATE_BUILDING_GROUP)
            .source(TokenType.CORE)
            .factory((t1) => ({ ...buildNodeBase(t1), value: UnitLocateBuildingGroup.CORE }));
        g.item()
            .target(NodeType.UNIT_LOCATE_BUILDING_GROUP)
            .source(TokenType.STORAGE)
            .factory((t1) => ({ ...buildNodeBase(t1), value: UnitLocateBuildingGroup.STORAGE }));
        g.item()
            .target(NodeType.UNIT_LOCATE_BUILDING_GROUP)
            .source(TokenType.GENERATOR)
            .factory((t1) => ({ ...buildNodeBase(t1), value: UnitLocateBuildingGroup.GENERATOR }));
        g.item()
            .target(NodeType.UNIT_LOCATE_BUILDING_GROUP)
            .source(TokenType.TURRET)
            .factory((t1) => ({ ...buildNodeBase(t1), value: UnitLocateBuildingGroup.TURRET }));
        g.item()
            .target(NodeType.UNIT_LOCATE_BUILDING_GROUP)
            .source(TokenType.FACTORY)
            .factory((t1) => ({ ...buildNodeBase(t1), value: UnitLocateBuildingGroup.FACTORY }));
        g.item()
            .target(NodeType.UNIT_LOCATE_BUILDING_GROUP)
            .source(TokenType.REPAIR)
            .factory((t1) => ({ ...buildNodeBase(t1), value: UnitLocateBuildingGroup.REPAIR }));
        g.item()
            .target(NodeType.UNIT_LOCATE_BUILDING_GROUP)
            .source(TokenType.BATTERY)
            .factory((t1) => ({ ...buildNodeBase(t1), value: UnitLocateBuildingGroup.BATTERY }));
        g.item()
            .target(NodeType.UNIT_LOCATE_BUILDING_GROUP)
            .source(TokenType.REACTOR)
            .factory((t1) => ({ ...buildNodeBase(t1), value: UnitLocateBuildingGroup.REACTOR }));
        g.item()
            .target(NodeType.CODE_BLOCK)
            .source(TokenType.L_BRACE)(NodeType.STATEMENT_LIST)(TokenType.R_BRACE)
            .factory((t1, statementList, t3) => {
                const statements: StatementNode[] = [];
                let current: StatementListNode | undefined = statementList;
                while (current) {
                    statements.push(current.first);
                    current = current.other;
                }
                return {
                    ...buildNodeBase(t1, statementList, t3),
                    statements,
                };
            });
        g.item()
            .target(NodeType.CODE_BLOCK)
            .source(TokenType.L_BRACE)(TokenType.R_BRACE)
            .factory((t1, t2) => ({
                ...buildNodeBase(t1, t2),
                statements: [],
            }));
        g.item()
            .target(NodeType.BLOCK_STATEMENT)
            .source(TokenType.MACRO)(TokenType.IDENTIFIER)(TokenType.L_PAREN)(NodeType.MACRO_PARAM_LIST)(
                TokenType.R_PAREN,
            )(TokenType.L_PAREN)(NodeType.MACRO_PARAM_LIST)(TokenType.R_PAREN)(NodeType.CODE_BLOCK)
            .factory((t1, t2, t3, paramList1, t5, t6, paramList2, t8, codeBlock) => {
                const inputParams: string[] = [];
                const outputParams: string[] = [];
                let currentInput: MacroParamListNode | undefined = paramList1;
                while (currentInput) {
                    inputParams.push(currentInput.first.value);
                    currentInput = currentInput.other;
                }
                let currentOutput: MacroParamListNode | undefined = paramList2;
                while (currentOutput) {
                    outputParams.push(currentOutput.first.value);
                    currentOutput = currentOutput.other;
                }
                return {
                    ...buildNodeBase(t1, t2, t3, paramList1, t5, t6, paramList2, t8, codeBlock),
                    statementType: StatementType.MACRO_DEFINE,
                    name: t2.raw,
                    inputParams,
                    outputParams,
                    body: codeBlock.statements,
                };
            });
        g.item()
            .target(NodeType.BLOCK_STATEMENT)
            .source(TokenType.MACRO)(TokenType.IDENTIFIER)(TokenType.L_PAREN)(NodeType.MACRO_PARAM_LIST)(
                TokenType.R_PAREN,
            )(TokenType.L_PAREN)(TokenType.R_PAREN)(NodeType.CODE_BLOCK)
            .factory((t1, t2, t3, paramList, t5, t6, t7, codeBlock) => {
                const inputParams: string[] = [];
                let currentInput: MacroParamListNode | undefined = paramList;
                while (currentInput) {
                    inputParams.push(currentInput.first.value);
                    currentInput = currentInput.other;
                }
                return {
                    ...buildNodeBase(t1, t2, t3, paramList, t5, t6, t7, codeBlock),
                    statementType: StatementType.MACRO_DEFINE,
                    name: t2.raw,
                    inputParams,
                    outputParams: [],
                    body: codeBlock.statements,
                };
            });
        g.item()
            .target(NodeType.BLOCK_STATEMENT)
            .source(TokenType.MACRO)(TokenType.IDENTIFIER)(TokenType.L_PAREN)(TokenType.R_PAREN)(TokenType.L_PAREN)(
                NodeType.MACRO_PARAM_LIST,
            )(TokenType.R_PAREN)(NodeType.CODE_BLOCK)
            .factory((t1, t2, t3, t4, t5, paramList, t7, codeBlock) => {
                const outputParams: string[] = [];
                let currentOutput: MacroParamListNode | undefined = paramList;
                while (currentOutput) {
                    outputParams.push(currentOutput.first.value);
                    currentOutput = currentOutput.other;
                }
                return {
                    ...buildNodeBase(t1, t2, t3, t4, t5, paramList, t7, codeBlock),
                    statementType: StatementType.MACRO_DEFINE,
                    name: t2.raw,
                    inputParams: [],
                    outputParams,
                    body: codeBlock.statements,
                };
            });
        g.item()
            .target(NodeType.BLOCK_STATEMENT)
            .source(TokenType.MACRO)(TokenType.IDENTIFIER)(TokenType.L_PAREN)(TokenType.R_PAREN)(TokenType.L_PAREN)(
                TokenType.R_PAREN,
            )(NodeType.CODE_BLOCK)
            .factory((t1, t2, t3, t4, t5, t6, codeBlock) => ({
                ...buildNodeBase(t1, t2, t3, t4, t5, t6, codeBlock),
                statementType: StatementType.MACRO_DEFINE,
                name: t2.raw,
                inputParams: [],
                outputParams: [],
                body: codeBlock.statements,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.IDENTIFIER)(TokenType.L_PAREN)(NodeType.MACRO_ARG_LIST)(TokenType.R_PAREN)(
                TokenType.L_PAREN,
            )(NodeType.MACRO_PARAM_LIST)(TokenType.R_PAREN)
            .factory((t1, t2, argList, t4, t5, paramList, t7) => {
                const inputArgs: ExpressionNode[] = [];
                const outputArgs: IdentifierExpressionNode[] = [];
                let currentArg: MacroArgListNode | undefined = argList;
                while (currentArg) {
                    inputArgs.push(currentArg.first);
                    currentArg = currentArg.other;
                }
                let currentParam: MacroParamListNode | undefined = paramList;
                while (currentParam) {
                    outputArgs.push(currentParam.first);
                    currentParam = currentParam.other;
                }
                return {
                    ...buildNodeBase(t1, t2, argList, t4, t5, paramList, t7),
                    statementType: StatementType.MACRO_CALL,
                    name: t1.raw,
                    inputArgs,
                    outputArgs,
                };
            });
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.IDENTIFIER)(TokenType.L_PAREN)(NodeType.MACRO_ARG_LIST)(TokenType.R_PAREN)(
                TokenType.L_PAREN,
            )(TokenType.R_PAREN)
            .factory((t1, t2, argList, t4, t5, t6) => {
                const inputArgs: ExpressionNode[] = [];
                let currentArg: MacroArgListNode | undefined = argList;
                while (currentArg) {
                    inputArgs.push(currentArg.first);
                    currentArg = currentArg.other;
                }
                return {
                    ...buildNodeBase(t1, t2, argList, t4, t5, t6),
                    statementType: StatementType.MACRO_CALL,
                    name: t1.raw,
                    inputArgs,
                    outputArgs: [],
                };
            });
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.IDENTIFIER)(TokenType.L_PAREN)(TokenType.R_PAREN)(TokenType.L_PAREN)(TokenType.R_PAREN)
            .factory((t1, t2, t3, t4, t5) => ({
                ...buildNodeBase(t1, t2, t3, t4, t5),
                statementType: StatementType.MACRO_CALL,
                name: t1.raw,
                inputArgs: [],
                outputArgs: [],
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.IDENTIFIER)(TokenType.L_PAREN)(TokenType.R_PAREN)(TokenType.L_PAREN)(
                NodeType.MACRO_PARAM_LIST,
            )(TokenType.R_PAREN)
            .factory((t1, t2, t3, t4, paramList, t6) => {
                const outputArgs: IdentifierExpressionNode[] = [];
                let currentParam: MacroParamListNode | undefined = paramList;
                while (currentParam) {
                    outputArgs.push(currentParam.first);
                    currentParam = currentParam.other;
                }
                return {
                    ...buildNodeBase(t1, t2, t3, t4, paramList, t6),
                    statementType: StatementType.MACRO_CALL,
                    name: t1.raw,
                    inputArgs: [],
                    outputArgs,
                };
            });
        g.item()
            .target(NodeType.BLOCK_STATEMENT_BODY)
            .source(NodeType.STATEMENT)
            .factory((statement) => ({
                ...buildNodeBase(statement),
                statements: [statement],
            }));
        g.item()
            .target(NodeType.BLOCK_STATEMENT_BODY)
            .source(NodeType.CODE_BLOCK)
            .factory((codeBlock) => ({
                ...buildNodeBase(codeBlock),
                statements: codeBlock.statements,
            }));
        g.item()
            .target(NodeType.MACRO_PARAM_LIST)
            .source(NodeType.IDENTIFIER_EXPRESSION)(TokenType.COMMA)(NodeType.MACRO_PARAM_LIST)
            .factory((identifier, t2, paramList) => ({
                ...buildNodeBase(identifier, t2, paramList),
                first: identifier,
                other: paramList,
            }));
        g.item()
            .target(NodeType.MACRO_PARAM_LIST)
            .source(NodeType.IDENTIFIER_EXPRESSION)
            .factory((identifier) => ({
                ...buildNodeBase(identifier),
                first: identifier,
                other: undefined,
            }));
        g.item()
            .target(NodeType.MACRO_ARG_LIST)
            .source(NodeType.EXPRESSION)(TokenType.COMMA)(NodeType.MACRO_ARG_LIST)
            .factory((expression, t2, argList) => ({
                ...buildNodeBase(expression, t2, argList),
                first: expression,
                other: argList,
            }));
        g.item()
            .target(NodeType.MACRO_ARG_LIST)
            .source(NodeType.EXPRESSION)
            .factory((expression) => ({
                ...buildNodeBase(expression),
                first: expression,
                other: undefined,
            }));
        g.item()
            .target(NodeType.BLOCK_STATEMENT)
            .source(TokenType.IF)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)(
                NodeType.BLOCK_STATEMENT_BODY,
            )(TokenType.ELSE)(NodeType.BLOCK_STATEMENT_BODY)
            .factory((t1, t2, condition, t4, trueBranch, t6, falseBranch) => ({
                ...buildNodeBase(t1, t2, condition, t4, trueBranch, t6, falseBranch),

                statementType: StatementType.IF_ELSE,
                condition,
                ifBody: trueBranch.statements,
                elseBody: falseBranch.statements,
            }));
        g.item()
            .target(NodeType.BLOCK_STATEMENT)
            .source(TokenType.IF)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)(
                NodeType.BLOCK_STATEMENT_BODY,
            )
            .factory((t1, t2, condition, t4, trueBranch) => ({
                ...buildNodeBase(t1, t2, condition, t4, trueBranch),
                statementType: StatementType.IF,
                condition,
                ifBody: trueBranch.statements,
            }));
        g.item()
            .target(NodeType.BLOCK_STATEMENT)
            .source(TokenType.FOR)(TokenType.L_PAREN)(NodeType.SINGLE_STATEMENT)(NodeType.EXPRESSION)(
                TokenType.SEMICOLON,
            )(NodeType.STATEMENT_BODY)(TokenType.R_PAREN)(NodeType.BLOCK_STATEMENT_BODY)
            .factory((t1, t2, init, condition, t5, increment, t7, body) => ({
                ...buildNodeBase(t1, t2, init, condition, t5, increment, t7, body),
                statementType: StatementType.FOR,
                init: { ...init, type: NodeType.STATEMENT },
                condition,
                increment: { ...increment, type: NodeType.STATEMENT },
                body: body.statements,
            }));
        g.item()
            .target(NodeType.BLOCK_STATEMENT)
            .source(TokenType.FOR)(TokenType.L_PAREN)(NodeType.SINGLE_STATEMENT)(NodeType.EXPRESSION)(
                TokenType.SEMICOLON,
            )(TokenType.R_PAREN)(NodeType.BLOCK_STATEMENT_BODY)
            .factory((t1, t2, init, condition, t5, t6, body) => ({
                ...buildNodeBase(t1, t2, init, condition, t5, t6, body),
                statementType: StatementType.FOR,
                init: { ...init, type: NodeType.STATEMENT },
                condition,
                increment: undefined,
                body: body.statements,
            }));
        g.item()
            .target(NodeType.BLOCK_STATEMENT)
            .source(TokenType.WHILE)(TokenType.L_PAREN)(NodeType.EXPRESSION)(TokenType.R_PAREN)(
                NodeType.BLOCK_STATEMENT_BODY,
            )
            .factory((t1, t2, condition, t4, body) => ({
                ...buildNodeBase(t1, t2, condition, t4, body),
                statementType: StatementType.WHILE,
                condition,
                body: body.statements,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.CONTINUE)
            .factory((t) => ({
                ...buildNodeBase(t),
                statementType: StatementType.LOOP_CONTROL,
                controlType: LoopControlType.CONTINUE,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.BREAK)
            .factory((t) => ({
                ...buildNodeBase(t),
                statementType: StatementType.LOOP_CONTROL,
                controlType: LoopControlType.BREAK,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.RETURN)(NodeType.EXPRESSION)
            .factory((t, expression) => ({
                ...buildNodeBase(t, expression),
                statementType: StatementType.RETURN,
                expression,
            }));
        g.item()
            .target(NodeType.STATEMENT_BODY)
            .source(TokenType.BIND)(TokenType.IDENTIFIER)
            .factory((t, identifier) => ({
                ...buildNodeBase(t, identifier),
                statementType: StatementType.BIND,
                variableName: identifier.raw,
            }));
        g.item()
            .target(NodeType.IDENTIFIER_EXPRESSION)
            .source(TokenType.IDENTIFIER)
            .factory((t) => ({
                ...buildNodeBase(t),
                value: t.raw,
                identifierType: IdentifierType.SIMPLE,
                isMindustry: false,
            }));
        g.item()
            .target(NodeType.IDENTIFIER_EXPRESSION)
            .source(TokenType.LET)(TokenType.IDENTIFIER)
            .factory((t, name) => ({
                ...buildNodeBase(t, name),
                value: name.raw,
                identifierType: IdentifierType.LET,
                isMindustry: false,
            }));
        g.item()
            .target(NodeType.IDENTIFIER_EXPRESSION)
            .source(TokenType.CONST)(TokenType.IDENTIFIER)
            .factory((t, name) => ({
                ...buildNodeBase(t, name),
                value: name.raw,
                identifierType: IdentifierType.CONST,
                isMindustry: false,
            }));
        g.item()
            .target(NodeType.IDENTIFIER_EXPRESSION)
            .source(TokenType.MINDUSTRY_IDENTIFIER)
            .factory((t) => ({
                ...buildNodeBase(t),
                value: t.raw,
                isMindustry: true,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.SIMPLE,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.ADD_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.ADD,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.SUB_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.SUB,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.MUL_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.MUL,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.DIV_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.DIV,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.IDIV_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.IDIV,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.MOD_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.MOD,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.POW_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.POW,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.AND_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.AND,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.SHL_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.SHL,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.SHR_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.SHR,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.BITAND_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.BITAND,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.BITOR_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.BITOR,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.XOR_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.XOR,
            }));
        g.item()
            .target(NodeType.ASSIGN_OP)
            .source(TokenType.OR_ASSIGN)
            .factory((t) => ({
                ...buildNodeBase(t),
                assignType: AssignType.OR,
            }));
        return {
            grammar: g.build(),
            customRules: [c(NodeType.EXPRESSION, expressionParser)],
        };
    },
    TokenType,
    NodeType,
) as {
    parse(tokenStream: Token[]): DocumentNode;
};
