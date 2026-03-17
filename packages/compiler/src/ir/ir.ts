import type { RadarCondition, RadarSortConfig, UnitLocateBuildingGroup } from '@minduscript/parser';

export enum IRNodeType {
    // 控制指令
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
    UNIT_LOCATE_ORE,
    UNIT_LOCATE_BUILDING,
    UNIT_LOCATE_SPAWN,
    UNIT_LOCATE_DAMAGED,
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
    // 运算指令
    ASSIGN,
    FLIP,
    AND,
    EQ,
    NE,
    LESS,
    LE,
    GREATER,
    GE,
    STRICT_EQ,
    BITOR,
    XOR,
    BITAND,
    SHL,
    SHR,
    ADD,
    SUB,
    MUL,
    DIV,
    IDIV,
    MOD,
    POW,
    MAX,
    MIN,
    ANGLE,
    ANGLE_DIFF,
    LEN,
    NOISE,
    ABS,
    LOG,
    LOG10,
    FLOOR,
    CEIL,
    SQRT,
    RAND,
    SIN,
    COS,
    TAN,
    ASIN,
    ACOS,
    ATAN,
    // 其他指令
    LABEL,
    JUMP,
    CONDITIONAL_JUMP,
    MACRO_CALL,
    MACRO_CALL_ASSIGN,
    BIND,
}

export type Value =
    | {
          isLiteral: true;
          value: number | string | boolean | null;
      }
    | {
          isLiteral: false;
          name: string;
          isMindustry: boolean;
      };

export type ReadNode = {
    type: IRNodeType.READ;
    output: string;
    memoryName: Value;
    memoryIndex: Value;
};

export type WriteNode = {
    type: IRNodeType.WRITE;
    value: Value;
    memoryName: Value;
    memoryIndex: Value;
};

export type DrawClearNode = {
    type: IRNodeType.DRAW_CLEAR;
    r: Value;
    g: Value;
    b: Value;
};

export type DrawColorNode = {
    type: IRNodeType.DRAW_COLOR;
    r: Value;
    g: Value;
    b: Value;
    a: Value;
};

export type DrawColNode = {
    type: IRNodeType.DRAW_COL;
    color: Value;
};

export type DrawStrokeNode = {
    type: IRNodeType.DRAW_STROKE;
    width: Value;
};

export type DrawLineNode = {
    type: IRNodeType.DRAW_LINE;
    x: Value;
    y: Value;
    x2: Value;
    y2: Value;
};

export type DrawRectNode = {
    type: IRNodeType.DRAW_RECT;
    x: Value;
    y: Value;
    width: Value;
    height: Value;
};

export type DrawLineRectNode = {
    type: IRNodeType.DRAW_LINE_RECT;
    x: Value;
    y: Value;
    width: Value;
    height: Value;
};

export type DrawPolyNode = {
    type: IRNodeType.DRAW_POLY;
    x: Value;
    y: Value;
    sides: Value;
    radius: Value;
    rotation: Value;
};

export type DrawLinePolyNode = {
    type: IRNodeType.DRAW_LINE_POLY;
    x: Value;
    y: Value;
    sides: Value;
    radius: Value;
    rotation: Value;
};

export type DrawTriangleNode = {
    type: IRNodeType.DRAW_TRIANGLE;
    x: Value;
    y: Value;
    x2: Value;
    y2: Value;
    x3: Value;
    y3: Value;
};

export type DrawImageNode = {
    type: IRNodeType.DRAW_IMAGE;
    x: Value;
    y: Value;
    image: Value;
    size: Value;
    rotation: Value;
};

export type PrintNode = {
    type: IRNodeType.PRINT;
    value: Value;
};

export type DrawFlushNode = {
    type: IRNodeType.DRAW_FLUSH;
    target: Value;
};

export type PrintFlushNode = {
    type: IRNodeType.PRINT_FLUSH;
    target: Value;
};

export type GetLinkNode = {
    type: IRNodeType.GET_LINK;
    result: string;
    id: Value;
};

export type SetEnabledNode = {
    type: IRNodeType.SET_ENABLED;
    building: Value;
    enabled: Value;
};

export type SetShootNode = {
    type: IRNodeType.SET_SHOOT;
    building: Value;
    x: Value;
    y: Value;
    shoot: Value;
};

export type SetShootPNode = {
    type: IRNodeType.SET_SHOOT_P;
    building: Value;
    unit: Value;
    shoot: Value;
};

export type SetConfigNode = {
    type: IRNodeType.SET_CONFIG;
    building: Value;
    config: Value;
};

export type SetColorNode = {
    type: IRNodeType.SET_COLOR;
    building: Value;
    color: Value;
};

export type RadarNode = {
    type: IRNodeType.RADAR;
    building: Value;
    condition1: RadarCondition;
    condition2: RadarCondition;
    condition3: RadarCondition;
    order: Value;
    sort: RadarSortConfig;
    result: string;
};

export type SensorNode = {
    type: IRNodeType.SENSOR;
    target: Value;
    building: Value;
    result: string;
};

export type PackColorNode = {
    type: IRNodeType.PACK_COLOR;
    result: string;
    r: Value;
    g: Value;
    b: Value;
    a: Value;
};

export type WaitNode = {
    type: IRNodeType.WAIT;
    time: Value;
};

export type CpuStopNode = {
    type: IRNodeType.CPU_STOP;
};

export type UnitBindNode = {
    type: IRNodeType.UNIT_BIND;
    unit: Value;
};

export type UnitRadarNode = {
    type: IRNodeType.UNIT_RADAR;
    condition1: RadarCondition;
    condition2: RadarCondition;
    condition3: RadarCondition;
    order: Value;
    sort: RadarSortConfig;
    result: string;
};

export type UnitLocateOreNode = {
    type: IRNodeType.UNIT_LOCATE_ORE;
    target: Value;
    outX: string;
    outY: string;
    found: string;
};

export type UnitLocateBuildingNode = {
    type: IRNodeType.UNIT_LOCATE_BUILDING;
    group: UnitLocateBuildingGroup;
    enemy: Value;
    outX: string;
    outY: string;
    found: string;
    building: string;
};

export type UnitLocateSpawnNode = {
    type: IRNodeType.UNIT_LOCATE_SPAWN;
    outX: string;
    outY: string;
    found: string;
    building: string;
};

export type UnitLocateDamagedNode = {
    type: IRNodeType.UNIT_LOCATE_DAMAGED;
    outX: string;
    outY: string;
    found: string;
    building: string;
};

export type IdleNode = {
    type: IRNodeType.IDLE;
};

export type StopNode = {
    type: IRNodeType.STOP;
};

export type MoveNode = {
    type: IRNodeType.MOVE;
    x: Value;
    y: Value;
};

export type ApproachNode = {
    type: IRNodeType.APPROACH;
    x: Value;
    y: Value;
    distance: Value;
};

export type PathFindNode = {
    type: IRNodeType.PATH_FIND;
    x: Value;
    y: Value;
};

export type AutoPathFindNode = {
    type: IRNodeType.AUTO_PATH_FIND;
};

export type BoostNode = {
    type: IRNodeType.BOOST;
    enabled: Value;
};

export type TargetNode = {
    type: IRNodeType.TARGET;
    x: Value;
    y: Value;
    shoot: Value;
};

export type TargetPNode = {
    type: IRNodeType.TARGET_P;
    unit: Value;
    shoot: Value;
};

export type ItemDropNode = {
    type: IRNodeType.ITEM_DROP;
    building: Value;
    amount: Value;
};

export type ItemTakeNode = {
    type: IRNodeType.ITEM_TAKE;
    building: Value;
    item: Value;
    amount: Value;
};

export type PayDropNode = {
    type: IRNodeType.PAY_DROP;
};

export type PayTakeNode = {
    type: IRNodeType.PAY_TAKE;
    takeUnits: Value;
};

export type PayEnterNode = {
    type: IRNodeType.PAY_ENTER;
};

export type MineNode = {
    type: IRNodeType.MINE;
    x: Value;
    y: Value;
};

export type FlagNode = {
    type: IRNodeType.FLAG;
    flag: Value;
};

export type BuildNode = {
    type: IRNodeType.BUILD;
    x: Value;
    y: Value;
    block: Value;
    rotation: Value;
    config: Value;
};

export type GetBlockNode = {
    type: IRNodeType.GET_BLOCK;
    x: Value;
    y: Value;
    outType: string;
    building: string;
    floor: string;
};

export type WithinNode = {
    type: IRNodeType.WITHIN;
    x: Value;
    y: Value;
    radius: Value;
    result: string;
};

export type UnbindNode = {
    type: IRNodeType.UNBIND;
};

export type UnaryOpNode = {
    type:
        | IRNodeType.ASSIGN
        | IRNodeType.FLIP
        | IRNodeType.ABS
        | IRNodeType.LOG
        | IRNodeType.LOG10
        | IRNodeType.FLOOR
        | IRNodeType.CEIL
        | IRNodeType.SQRT
        | IRNodeType.RAND
        | IRNodeType.SIN
        | IRNodeType.COS
        | IRNodeType.TAN
        | IRNodeType.ASIN
        | IRNodeType.ACOS
        | IRNodeType.ATAN;
    target: string;
    value: Value;
};

export type BinaryOpNode = {
    type:
        | IRNodeType.AND
        | IRNodeType.EQ
        | IRNodeType.NE
        | IRNodeType.LESS
        | IRNodeType.LE
        | IRNodeType.GREATER
        | IRNodeType.GE
        | IRNodeType.STRICT_EQ
        | IRNodeType.BITOR
        | IRNodeType.XOR
        | IRNodeType.BITAND
        | IRNodeType.SHL
        | IRNodeType.SHR
        | IRNodeType.ADD
        | IRNodeType.SUB
        | IRNodeType.MUL
        | IRNodeType.DIV
        | IRNodeType.IDIV
        | IRNodeType.MOD
        | IRNodeType.POW
        | IRNodeType.MAX
        | IRNodeType.MIN
        | IRNodeType.ANGLE
        | IRNodeType.ANGLE_DIFF
        | IRNodeType.LEN
        | IRNodeType.NOISE;
    target: string;
    left: Value;
    right: Value;
};

export type LabelNode = {
    type: IRNodeType.LABEL;
    name: string;
};

export type JumpNode = {
    type: IRNodeType.JUMP;
    label: string;
};

export enum JumpCondition {
    EQ,
    NE,
    LESS,
    LE,
    GREATER,
    GE,
    STRICT_EQ,
}

export type ConditionalJumpNode = {
    type: IRNodeType.CONDITIONAL_JUMP;
    condition: JumpCondition;
    left: Value;
    right: Value;
    label: string;
};

export type MacroCallNode = {
    type: IRNodeType.MACRO_CALL;
    name: string;
    inputArgs: Value[];
    outputArgs: string[];
};

export type MacroCallAssignNode = {
    type: IRNodeType.MACRO_CALL_ASSIGN;
    name: string;
    inputArgs: Value[];
    outputArgs: string[];
    returnTarget: string;
};

export type BindNode = {
    type: IRNodeType.BIND;
    name: string;
};

export type IRNode =
    | ReadNode
    | WriteNode
    | DrawClearNode
    | DrawColorNode
    | DrawColNode
    | DrawStrokeNode
    | DrawLineNode
    | DrawRectNode
    | DrawLineRectNode
    | DrawPolyNode
    | DrawLinePolyNode
    | DrawTriangleNode
    | DrawImageNode
    | PrintNode
    | DrawFlushNode
    | PrintFlushNode
    | GetLinkNode
    | SetEnabledNode
    | SetShootNode
    | SetShootPNode
    | SetConfigNode
    | SetColorNode
    | RadarNode
    | SensorNode
    | PackColorNode
    | WaitNode
    | CpuStopNode
    | UnitBindNode
    | UnitRadarNode
    | UnitLocateOreNode
    | UnitLocateBuildingNode
    | UnitLocateSpawnNode
    | UnitLocateDamagedNode
    | IdleNode
    | StopNode
    | MoveNode
    | ApproachNode
    | PathFindNode
    | AutoPathFindNode
    | BoostNode
    | TargetNode
    | TargetPNode
    | ItemDropNode
    | ItemTakeNode
    | PayDropNode
    | PayTakeNode
    | PayEnterNode
    | MineNode
    | FlagNode
    | BuildNode
    | GetBlockNode
    | WithinNode
    | UnbindNode
    | UnaryOpNode
    | BinaryOpNode
    | LabelNode
    | JumpNode
    | ConditionalJumpNode
    | MacroCallNode
    | MacroCallAssignNode
    | BindNode;

export type IRMacro = {
    name: string;
    inputParams: string[];
    outputParams: string[];
    body: IRNode[];
    dependencies: Set<string>;
};

export type IRProgram = {
    macros: IRMacro[];
    boundVariables: Set<string>;
    main: IRNode[];
};
