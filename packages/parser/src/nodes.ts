import type { Token, TokenType } from '@minduscript/lexer';

export enum NodeType {
    // 语句
    DOCUMENT = 161,
    IMPORT_LIST,
    IMPORT_STATEMENT,
    CODE_BLOCK,
    STATEMENT_LIST,
    STATEMENT,
    SINGLE_STATEMENT,
    BLOCK_STATEMENT,
    STATEMENT_BODY,
    BLOCK_STATEMENT_BODY,
    MACRO_PARAM_LIST,
    MACRO_ARG_LIST,
    // 表达式
    EXPRESSION,
    UNARY_OP_EXPRESSION,
    BINARY_OP_EXPRESSION,
    FUNCTION_CALL_EXPRESSION,
    MACRO_CALL_EXPRESSION,
    LITERAL_EXPRESSION,
    IDENTIFIER_EXPRESSION,
    RADAR_CONDITION,
    RADAR_SORT_CONFIG,
    UNIT_LOCATE_BUILDING_GROUP,
    ASSIGN_OP,
}

export type NodeBase = {
    tokens: Token[];
};

export type DocumentNode = NodeBase & {
    type: NodeType.DOCUMENT;
    importList: ImportStatementNode[];
    statementList: StatementNode[];
};

export type ImportListNode = NodeBase & {
    type: NodeType.IMPORT_LIST;
    first: ImportStatementNode;
    other: ImportListNode | undefined;
};

export type ImportStatementNode = NodeBase & {
    type: NodeType.IMPORT_STATEMENT;
    name: string;
    asName: string;
    from: string;
};

export type CodeBlockNode = NodeBase & {
    type: NodeType.CODE_BLOCK;
    statements: StatementNode[];
};

export type StatementListNode = NodeBase & {
    type: NodeType.STATEMENT_LIST;
    first: StatementNode;
    other: StatementListNode | undefined;
};

export type SingleStatementNodeBase = NodeBase & {
    type: NodeType.SINGLE_STATEMENT;
};

export enum StatementType {
    EMPTY,
    VARIABLE_DEFINE,
    ASSIGN,
    CONTROL,
    MACRO_DEFINE,
    MACRO_CALL,
    IF_ELSE,
    IF,
    FOR,
    WHILE,
    LOOP_CONTROL,
    RETURN,
    BIND,
}

export type EmptyStatementNode = SingleStatementNodeBase & {
    statementType: StatementType.EMPTY;
};

export type VariableDefineStatementNode = SingleStatementNodeBase & {
    statementType: StatementType.VARIABLE_DEFINE;
    variableName: string;
    isConst: boolean;
    expression: ExpressionNode;
};

export enum AssignType {
    SIMPLE,
    ADD,
    SUB,
    MUL,
    DIV,
    IDIV,
    MOD,
    POW,
    AND,
    SHL,
    SHR,
    BITAND,
    BITOR,
    XOR,
    OR,
}

export type AssignStatementNode = SingleStatementNodeBase & {
    statementType: StatementType.ASSIGN;
    assignType: AssignType;
    variableName: string;
    expression: ExpressionNode;
};

export enum ControlType {
    READ,
    WRITE,
    DRAW_CLEAR,
    DRAW_COLOR,
    DRAW_COL,
    DRAW_STROKE,
    DRAW_LINE,
    DRAW_RECT,
    DRAW_LINE_RECT,
    DRAW_POLY,
    DRAW_LINE_POLY,
    DRAW_TRIANGLE,
    DRAW_IMAGE,
    PRINT,
    DRAW_FLUSH,
    PRINT_FLUSH,
    GET_LINK,
    SET_ENABLED,
    SET_SHOOT,
    SET_SHOOT_P,
    SET_CONFIG,
    SET_COLOR,
    RADAR,
    SENSOR,
    PACK_COLOR,
    WAIT,
    CPU_STOP,
    UNIT_BIND,
    UNIT_RADAR,
    UNIT_LOCATE,
    IDLE,
    STOP,
    MOVE,
    APPROACH,
    PATH_FIND,
    AUTO_PATH_FIND,
    BOOST,
    TARGET,
    TARGET_P,
    ITEM_DROP,
    ITEM_TAKE,
    PAY_DROP,
    PAY_TAKE,
    PAY_ENTER,
    MINE,
    FLAG,
    BUILD,
    GET_BLOCK,
    WITHIN,
    UNBIND,
}

export type StatementNodeControlBase = SingleStatementNodeBase & {
    statementType: StatementType.CONTROL;
};

export type StatementNodeRead = StatementNodeControlBase & {
    controlType: ControlType.READ;
    output: IdentifierExpressionNode;
    memoryName: ExpressionNode;
    memoryIndex: ExpressionNode;
};

export type StatementNodeWrite = StatementNodeControlBase & {
    controlType: ControlType.WRITE;
    value: ExpressionNode;
    memoryName: ExpressionNode;
    memoryIndex: ExpressionNode;
};

export type StatementNodeDrawClear = StatementNodeControlBase & {
    controlType: ControlType.DRAW_CLEAR;
    r: ExpressionNode;
    g: ExpressionNode;
    b: ExpressionNode;
};

export type StatementNodeDrawColor = StatementNodeControlBase & {
    controlType: ControlType.DRAW_COLOR;
    r: ExpressionNode;
    g: ExpressionNode;
    b: ExpressionNode;
    a: ExpressionNode;
};

export type StatementNodeDrawCol = StatementNodeControlBase & {
    controlType: ControlType.DRAW_COL;
    color: ExpressionNode;
};

export type StatementNodeDrawStroke = StatementNodeControlBase & {
    controlType: ControlType.DRAW_STROKE;
    width: ExpressionNode;
};

export type StatementNodeDrawLine = StatementNodeControlBase & {
    controlType: ControlType.DRAW_LINE;
    x: ExpressionNode;
    y: ExpressionNode;
    x2: ExpressionNode;
    y2: ExpressionNode;
};

export type StatementNodeDrawRect = StatementNodeControlBase & {
    controlType: ControlType.DRAW_RECT;
    x: ExpressionNode;
    y: ExpressionNode;
    width: ExpressionNode;
    height: ExpressionNode;
};

export type StatementNodeDrawLineRect = StatementNodeControlBase & {
    controlType: ControlType.DRAW_LINE_RECT;
    x: ExpressionNode;
    y: ExpressionNode;
    width: ExpressionNode;
    height: ExpressionNode;
};

export type StatementNodeDrawPoly = StatementNodeControlBase & {
    controlType: ControlType.DRAW_POLY;
    x: ExpressionNode;
    y: ExpressionNode;
    sides: ExpressionNode;
    radius: ExpressionNode;
    rotation: ExpressionNode;
};

export type StatementNodeDrawLinePoly = StatementNodeControlBase & {
    controlType: ControlType.DRAW_LINE_POLY;
    x: ExpressionNode;
    y: ExpressionNode;
    sides: ExpressionNode;
    radius: ExpressionNode;
    rotation: ExpressionNode;
};

export type StatementNodeDrawTriangle = StatementNodeControlBase & {
    controlType: ControlType.DRAW_TRIANGLE;
    x: ExpressionNode;
    y: ExpressionNode;
    x2: ExpressionNode;
    y2: ExpressionNode;
    x3: ExpressionNode;
    y3: ExpressionNode;
};

export type StatementNodeDrawImage = StatementNodeControlBase & {
    controlType: ControlType.DRAW_IMAGE;
    x: ExpressionNode;
    y: ExpressionNode;
    image: ExpressionNode;
    size: ExpressionNode;
    rotation: ExpressionNode;
};

export type StatementNodePrint = StatementNodeControlBase & {
    controlType: ControlType.PRINT;
    value: ExpressionNode;
};

export type StatementNodeDrawFlush = StatementNodeControlBase & {
    controlType: ControlType.DRAW_FLUSH;
    target: ExpressionNode;
};

export type StatementNodePrintFlush = StatementNodeControlBase & {
    controlType: ControlType.PRINT_FLUSH;
    target: ExpressionNode;
};

export type StatementNodeGetLink = StatementNodeControlBase & {
    controlType: ControlType.GET_LINK;
    result: IdentifierExpressionNode;
    id: ExpressionNode;
};

export type StatementNodeSetEnabled = StatementNodeControlBase & {
    controlType: ControlType.SET_ENABLED;
    building: ExpressionNode;
    value: ExpressionNode;
};

export type StatementNodeSetShoot = StatementNodeControlBase & {
    controlType: ControlType.SET_SHOOT;
    building: ExpressionNode;
    x: ExpressionNode;
    y: ExpressionNode;
    shoot: ExpressionNode;
};

export type StatementNodeSetShootP = StatementNodeControlBase & {
    controlType: ControlType.SET_SHOOT_P;
    building: ExpressionNode;
    unit: ExpressionNode;
    shoot: ExpressionNode;
};

export type StatementNodeSetConfig = StatementNodeControlBase & {
    controlType: ControlType.SET_CONFIG;
    building: ExpressionNode;
    config: ExpressionNode;
};

export type StatementNodeSetColor = StatementNodeControlBase & {
    controlType: ControlType.SET_COLOR;
    building: ExpressionNode;
    color: ExpressionNode;
};

export enum RadarCondition {
    ANY,
    ENEMY,
    ALLY,
    PLAYER,
    ATTACKER,
    FLYING,
    BOSS,
    GROUND,
}

export enum RadarSortConfig {
    DISTANCE,
    HEALTH,
    SHIELD,
    ARMOR,
    MAX_HEALTH,
}

export type StatementNodeRadar = StatementNodeControlBase & {
    controlType: ControlType.RADAR;
    building: ExpressionNode;
    condition1: RadarCondition;
    condition2: RadarCondition;
    condition3: RadarCondition;
    order: ExpressionNode;
    sort: RadarSortConfig;
    result: IdentifierExpressionNode;
};

export type StatementNodeSensor = StatementNodeControlBase & {
    controlType: ControlType.SENSOR;
    target: ExpressionNode;
    building: ExpressionNode;
    result: IdentifierExpressionNode;
};

export type StatementNodePackColor = StatementNodeControlBase & {
    controlType: ControlType.PACK_COLOR;
    result: IdentifierExpressionNode;
    r: ExpressionNode;
    g: ExpressionNode;
    b: ExpressionNode;
    a: ExpressionNode;
};

export type StatementNodeWait = StatementNodeControlBase & {
    controlType: ControlType.WAIT;
    time: ExpressionNode;
};

export type StatementNodeCpuStop = StatementNodeControlBase & {
    controlType: ControlType.CPU_STOP;
};

export type StatementNodeUnitBind = StatementNodeControlBase & {
    controlType: ControlType.UNIT_BIND;
    unit: ExpressionNode;
};

export type StatementNodeUnitRadar = StatementNodeControlBase & {
    controlType: ControlType.UNIT_RADAR;
    condition1: RadarCondition;
    condition2: RadarCondition;
    condition3: RadarCondition;
    order: ExpressionNode;
    sort: RadarSortConfig;
    result: IdentifierExpressionNode;
};

export enum UnitLocateCategory {
    ORE,
    BUILDING,
    SPAWN,
    DAMAGED,
}

export type StatementNodeUnitLocateOre = StatementNodeControlBase & {
    controlType: ControlType.UNIT_LOCATE;
    category: UnitLocateCategory.ORE;
    target: ExpressionNode;
    outX: IdentifierExpressionNode;
    outY: IdentifierExpressionNode;
    found: IdentifierExpressionNode;
};

export enum UnitLocateBuildingGroup {
    CORE,
    STORAGE,
    GENERATOR,
    TURRET,
    FACTORY,
    REPAIR,
    BATTERY,
    REACTOR,
}

export type StatementNodeUnitLocateBuilding = StatementNodeControlBase & {
    controlType: ControlType.UNIT_LOCATE;
    category: UnitLocateCategory.BUILDING;
    group: UnitLocateBuildingGroup;
    enemy: ExpressionNode;
    outX: IdentifierExpressionNode;
    outY: IdentifierExpressionNode;
    found: IdentifierExpressionNode;
    building: IdentifierExpressionNode;
};

export type StatementNodeUnitLocateSpawn = StatementNodeControlBase & {
    controlType: ControlType.UNIT_LOCATE;
    category: UnitLocateCategory.SPAWN;
    outX: IdentifierExpressionNode;
    outY: IdentifierExpressionNode;
    found: IdentifierExpressionNode;
    building: IdentifierExpressionNode;
};

export type StatementNodeUnitLocateDamaged = StatementNodeControlBase & {
    controlType: ControlType.UNIT_LOCATE;
    category: UnitLocateCategory.DAMAGED;
    outX: IdentifierExpressionNode;
    outY: IdentifierExpressionNode;
    found: IdentifierExpressionNode;
    building: IdentifierExpressionNode;
};

export type StatementNodeIdle = StatementNodeControlBase & {
    controlType: ControlType.IDLE;
};

export type StatementNodeStop = StatementNodeControlBase & {
    controlType: ControlType.STOP;
};

export type StatementNodeMove = StatementNodeControlBase & {
    controlType: ControlType.MOVE;
    x: ExpressionNode;
    y: ExpressionNode;
};

export type StatementNodeApproach = StatementNodeControlBase & {
    controlType: ControlType.APPROACH;
    x: ExpressionNode;
    y: ExpressionNode;
    distance: ExpressionNode;
};

export type StatementNodePathFind = StatementNodeControlBase & {
    controlType: ControlType.PATH_FIND;
    x: ExpressionNode;
    y: ExpressionNode;
};

export type StatementNodeAutoPathFind = StatementNodeControlBase & {
    controlType: ControlType.AUTO_PATH_FIND;
};

export type StatementNodeBoost = StatementNodeControlBase & {
    controlType: ControlType.BOOST;
    enabled: ExpressionNode;
};

export type StatementNodeTarget = StatementNodeControlBase & {
    controlType: ControlType.TARGET;
    x: ExpressionNode;
    y: ExpressionNode;
    shoot: ExpressionNode;
};

export type StatementNodeTargetP = StatementNodeControlBase & {
    controlType: ControlType.TARGET_P;
    unit: ExpressionNode;
    shoot: ExpressionNode;
};

export type StatementNodeItemDrop = StatementNodeControlBase & {
    controlType: ControlType.ITEM_DROP;
    building: ExpressionNode;
    amount: ExpressionNode;
};

export type StatementNodeItemTake = StatementNodeControlBase & {
    controlType: ControlType.ITEM_TAKE;
    building: ExpressionNode;
    item: ExpressionNode;
    amount: ExpressionNode;
};

export type StatementNodePayDrop = StatementNodeControlBase & {
    controlType: ControlType.PAY_DROP;
};

export type StatementNodePayTake = StatementNodeControlBase & {
    controlType: ControlType.PAY_TAKE;
    takeUnits: ExpressionNode;
};

export type StatementNodePayEnter = StatementNodeControlBase & {
    controlType: ControlType.PAY_ENTER;
};

export type StatementNodeMine = StatementNodeControlBase & {
    controlType: ControlType.MINE;
    x: ExpressionNode;
    y: ExpressionNode;
};

export type StatementNodeFlag = StatementNodeControlBase & {
    controlType: ControlType.FLAG;
    flag: ExpressionNode;
};

export type StatementNodeBuild = StatementNodeControlBase & {
    controlType: ControlType.BUILD;
    x: ExpressionNode;
    y: ExpressionNode;
    block: ExpressionNode;
    rotation: ExpressionNode;
    config: ExpressionNode;
};

export type StatementNodeGetBlock = StatementNodeControlBase & {
    controlType: ControlType.GET_BLOCK;
    x: ExpressionNode;
    y: ExpressionNode;
    outType: IdentifierExpressionNode;
    building: IdentifierExpressionNode;
    floor: IdentifierExpressionNode;
};

export type StatementNodeWithin = StatementNodeControlBase & {
    controlType: ControlType.WITHIN;
    x: ExpressionNode;
    y: ExpressionNode;
    radius: ExpressionNode;
    result: IdentifierExpressionNode;
};

export type StatementNodeUnbind = StatementNodeControlBase & {
    controlType: ControlType.UNBIND;
};

export type ControlStatementNode =
    | StatementNodeRead
    | StatementNodeWrite
    | StatementNodeDrawClear
    | StatementNodeDrawColor
    | StatementNodeDrawCol
    | StatementNodeDrawStroke
    | StatementNodeDrawLine
    | StatementNodeDrawRect
    | StatementNodeDrawLineRect
    | StatementNodeDrawPoly
    | StatementNodeDrawLinePoly
    | StatementNodeDrawTriangle
    | StatementNodeDrawImage
    | StatementNodePrint
    | StatementNodeDrawFlush
    | StatementNodePrintFlush
    | StatementNodeGetLink
    | StatementNodeSetEnabled
    | StatementNodeSetShoot
    | StatementNodeSetShootP
    | StatementNodeSetConfig
    | StatementNodeSetColor
    | StatementNodeRadar
    | StatementNodeSensor
    | StatementNodePackColor
    | StatementNodeWait
    | StatementNodeCpuStop
    | StatementNodeUnitBind
    | StatementNodeUnitRadar
    | StatementNodeUnitLocateOre
    | StatementNodeUnitLocateBuilding
    | StatementNodeUnitLocateSpawn
    | StatementNodeUnitLocateDamaged
    | StatementNodeIdle
    | StatementNodeStop
    | StatementNodeMove
    | StatementNodeApproach
    | StatementNodePathFind
    | StatementNodeAutoPathFind
    | StatementNodeBoost
    | StatementNodeTarget
    | StatementNodeTargetP
    | StatementNodeItemDrop
    | StatementNodeItemTake
    | StatementNodePayDrop
    | StatementNodePayTake
    | StatementNodePayEnter
    | StatementNodeMine
    | StatementNodeFlag
    | StatementNodeBuild
    | StatementNodeGetBlock
    | StatementNodeWithin
    | StatementNodeUnbind;

export type MacroDefineStatementNode = NodeBase & {
    type: NodeType.BLOCK_STATEMENT;
    statementType: StatementType.MACRO_DEFINE;
    name: string;
    inputParams: string[];
    outputParams: string[];
    body: StatementNode[];
};

export type MacroParamListNode = NodeBase & {
    type: NodeType.MACRO_PARAM_LIST;
    first: IdentifierExpressionNode;
    other: MacroParamListNode | undefined;
};

export type MacroCallStatementNode = SingleStatementNodeBase & {
    statementType: StatementType.MACRO_CALL;
    name: string;
    inputArgs: ExpressionNode[];
    outputArgs: IdentifierExpressionNode[];
};

export type MacroArgListNode = NodeBase & {
    type: NodeType.MACRO_ARG_LIST;
    first: ExpressionNode;
    other: MacroArgListNode | undefined;
};

export type IfElseStatementNode = NodeBase & {
    type: NodeType.BLOCK_STATEMENT;
    statementType: StatementType.IF_ELSE;
    condition: ExpressionNode;
    ifBody: StatementNode[];
    elseBody: StatementNode[];
};

export type IfStatementNode = NodeBase & {
    type: NodeType.BLOCK_STATEMENT;
    statementType: StatementType.IF;
    condition: ExpressionNode;
    ifBody: StatementNode[];
};

export type ForStatementNode = NodeBase & {
    type: NodeType.BLOCK_STATEMENT;
    statementType: StatementType.FOR;
    init: StatementNode;
    condition: ExpressionNode;
    increment: StatementNode | undefined;
    body: StatementNode[];
};

export type WhileStatementNode = NodeBase & {
    type: NodeType.BLOCK_STATEMENT;
    statementType: StatementType.WHILE;
    condition: ExpressionNode;
    body: StatementNode[];
};

export enum LoopControlType {
    CONTINUE,
    BREAK,
}

export type LoopControlStatementNode = SingleStatementNodeBase & {
    statementType: StatementType.LOOP_CONTROL;
    controlType: LoopControlType;
};

export type ReturnStatementNode = SingleStatementNodeBase & {
    statementType: StatementType.RETURN;
    expression: ExpressionNode;
};

export type BindStatementNode = SingleStatementNodeBase & {
    statementType: StatementType.BIND;
    variableName: string;
};

export type SingleStatementNode =
    | EmptyStatementNode
    | VariableDefineStatementNode
    | AssignStatementNode
    | ControlStatementNode
    | MacroCallStatementNode
    | LoopControlStatementNode
    | ReturnStatementNode
    | BindStatementNode;

export type BlockStatementNode =
    | MacroDefineStatementNode
    | IfElseStatementNode
    | IfStatementNode
    | ForStatementNode
    | WhileStatementNode;

type ModifyUnion<T, K extends PropertyKey, V> = T extends any
    ? { [P in keyof T]: P extends K ? V : T[P] } // 遍历每一项的属性并替换
    : never;

export type StatementBodyNode = ModifyUnion<SingleStatementNode, 'type', NodeType.STATEMENT_BODY>;

export type StatementNode = ModifyUnion<SingleStatementNode | BlockStatementNode, 'type', NodeType.STATEMENT>;

export type ExpressionNode = NodeBase & {
    type: NodeType.EXPRESSION;
    child: ExpressionChildNode;
};

export type UnaryOpType = TokenType.NOT | TokenType.FLIP;

export type UnaryOpExpressionNode = NodeBase & {
    type: NodeType.UNARY_OP_EXPRESSION;
    opType: UnaryOpType;
    child: ExpressionChildNode;
};

export type BinaryOpType =
    | TokenType.OR
    | TokenType.AND
    | TokenType.EQ
    | TokenType.NE
    | TokenType.LESS
    | TokenType.LE
    | TokenType.GREATER
    | TokenType.GE
    | TokenType.STRICT_EQ
    | TokenType.BITOR
    | TokenType.XOR
    | TokenType.BITAND
    | TokenType.SHL
    | TokenType.SHR
    | TokenType.ADD
    | TokenType.SUB
    | TokenType.MUL
    | TokenType.DIV
    | TokenType.IDIV
    | TokenType.MOD
    | TokenType.POW;

export type BinaryOpExpressionNode = NodeBase & {
    type: NodeType.BINARY_OP_EXPRESSION;
    opType: BinaryOpType;
    lChild: ExpressionChildNode;
    rChild: ExpressionChildNode;
};

export type Functions =
    | TokenType.MAX
    | TokenType.MIN
    | TokenType.ANGLE
    | TokenType.ANGLE_DIFF
    | TokenType.LEN
    | TokenType.NOISE
    | TokenType.ABS
    | TokenType.LOG
    | TokenType.LOG10
    | TokenType.FLOOR
    | TokenType.CEIL
    | TokenType.SQRT
    | TokenType.RAND
    | TokenType.SIN
    | TokenType.COS
    | TokenType.TAN
    | TokenType.ASIN
    | TokenType.ACOS
    | TokenType.ATAN;

export type FunctionCallExpressionNode = NodeBase & {
    type: NodeType.FUNCTION_CALL_EXPRESSION;
    function: Functions;
    args: ExpressionChildNode[];
};

export type MacroCallExpressionNode = NodeBase & {
    type: NodeType.MACRO_CALL_EXPRESSION;
    name: string;
    inputArgs: ExpressionChildNode[];
    outputArgs: IdentifierExpressionNode[];
};

export type LiteralExpressionNode = NodeBase & {
    type: NodeType.LITERAL_EXPRESSION;
    value: number | boolean | string | null;
};

export enum IdentifierType {
    SIMPLE,
    LET,
    CONST,
}

export type MindustryIdentifierExpressionNode = NodeBase & {
    type: NodeType.IDENTIFIER_EXPRESSION;
    value: string;
    isMindustry: true;
};

export type MinduscriptIdentifierExpressionNode = NodeBase & {
    type: NodeType.IDENTIFIER_EXPRESSION;
    value: string;
    identifierType: IdentifierType;
    isMindustry: false;
};

export type IdentifierExpressionNode = MinduscriptIdentifierExpressionNode | MindustryIdentifierExpressionNode;

export type RadarConditionNode = NodeBase & {
    type: NodeType.RADAR_CONDITION;
    value: RadarCondition;
};

export type RadarSortConfigNode = NodeBase & {
    type: NodeType.RADAR_SORT_CONFIG;
    value: RadarSortConfig;
};

export type UnitLocateBuildingGroupNode = NodeBase & {
    type: NodeType.UNIT_LOCATE_BUILDING_GROUP;
    value: UnitLocateBuildingGroup;
};

export type BlockStatementBodyNode = NodeBase & {
    type: NodeType.BLOCK_STATEMENT_BODY;
    statements: StatementNode[];
};

export type AssignOpNode = NodeBase & {
    type: NodeType.ASSIGN_OP;
    assignType: AssignType;
};

export type ExpressionChildNode =
    | UnaryOpExpressionNode
    | BinaryOpExpressionNode
    | FunctionCallExpressionNode
    | MacroCallExpressionNode
    | LiteralExpressionNode
    | IdentifierExpressionNode;

export type Node =
    | DocumentNode
    | ImportListNode
    | ImportStatementNode
    | CodeBlockNode
    | StatementListNode
    | StatementNode
    | SingleStatementNode
    | BlockStatementNode
    | StatementBodyNode
    | MacroParamListNode
    | MacroArgListNode
    | RadarConditionNode
    | RadarSortConfigNode
    | UnitLocateBuildingGroupNode
    | ExpressionNode
    | ExpressionChildNode
    | BlockStatementBodyNode
    | AssignOpNode;

export type ASTNode = DocumentNode | ImportStatementNode | StatementNode | ExpressionNode | ExpressionChildNode; // 只有这些类型的节点会出现在最终的AST中，其他节点只出现在语法分析的中间过程中
export type ASTNodeTypes = ASTNode['type'];
