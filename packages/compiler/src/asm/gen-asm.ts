import { RadarCondition, RadarSortConfig, UnitLocateBuildingGroup } from '@minduscript/parser';
import type { IRNode, Value } from '../ir/ir';
import { IRNodeType, JumpCondition } from '../ir/ir';

type TemporaryTypes = IRNodeType.LABEL | IRNodeType.MACRO_CALL | IRNodeType.MACRO_CALL_ASSIGN | IRNodeType.BIND;
type NormalNode = Exclude<IRNode, { type: IRNodeType.JUMP | IRNodeType.CONDITIONAL_JUMP | TemporaryTypes }>;
type JumpNode = Extract<IRNode, { type: IRNodeType.JUMP | IRNodeType.CONDITIONAL_JUMP }>;

const transformValue = (value: Value) => {
    if (!value.isLiteral) {
        return value.name;
    }

    if (value.value === false) {
        return 'false';
    }

    if (value.value === 0) {
        return '0';
    }

    if (!value.value) {
        return 'null';
    }

    if (typeof value.value === 'string') {
        return JSON.stringify(value.value);
    }

    return value.value.toString();
};

const transformRadarCondition = (condition: RadarCondition) => {
    switch (condition) {
        case RadarCondition.ANY:
            return 'any';
        case RadarCondition.ENEMY:
            return 'enemy';
        case RadarCondition.ALLY:
            return 'ally';
        case RadarCondition.PLAYER:
            return 'player';
        case RadarCondition.ATTACKER:
            return 'attacker';
        case RadarCondition.FLYING:
            return 'flying';
        case RadarCondition.BOSS:
            return 'boss';
        default:
            return 'ground';
    }
};

const transformRadarSortConfig = (config: RadarSortConfig) => {
    switch (config) {
        case RadarSortConfig.DISTANCE:
            return 'distance';
        case RadarSortConfig.HEALTH:
            return 'health';
        case RadarSortConfig.SHIELD:
            return 'shield';
        case RadarSortConfig.ARMOR:
            return 'armor';
        default:
            return 'maxHealth';
    }
};

const transformNormalNode = (node: NormalNode) => {
    switch (node.type) {
        case IRNodeType.READ: {
            return `read ${node.output} ${transformValue(node.memoryName)} ${transformValue(node.memoryIndex)}`;
        }
        case IRNodeType.WRITE: {
            return `write ${transformValue(node.value)} ${transformValue(node.memoryName)} ${transformValue(node.memoryIndex)}`;
        }
        case IRNodeType.DRAW_CLEAR: {
            return `draw clear ${transformValue(node.r)} ${transformValue(node.g)} ${transformValue(node.b)}`;
        }
        case IRNodeType.DRAW_COLOR: {
            return `draw color ${transformValue(node.r)} ${transformValue(node.g)} ${transformValue(node.b)} ${transformValue(node.a)}`;
        }
        case IRNodeType.DRAW_COL: {
            return `draw col ${transformValue(node.color)}`;
        }
        case IRNodeType.DRAW_STROKE: {
            return `draw stroke ${transformValue(node.width)}`;
        }
        case IRNodeType.DRAW_LINE: {
            return `draw line ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.x2)} ${transformValue(node.y2)}`;
        }
        case IRNodeType.DRAW_RECT: {
            return `draw rect ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.width)} ${transformValue(node.height)}`;
        }
        case IRNodeType.DRAW_LINE_RECT: {
            return `draw lineRect ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.width)} ${transformValue(node.height)}`;
        }
        case IRNodeType.DRAW_POLY: {
            return `draw poly ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.sides)} ${transformValue(node.radius)} ${transformValue(node.rotation)}`;
        }
        case IRNodeType.DRAW_LINE_POLY: {
            return `draw linePoly ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.sides)} ${transformValue(node.radius)} ${transformValue(node.rotation)}`;
        }
        case IRNodeType.DRAW_TRIANGLE: {
            return `draw triangle ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.x2)} ${transformValue(node.y2)} ${transformValue(node.x3)} ${transformValue(node.y3)}`;
        }
        case IRNodeType.DRAW_IMAGE: {
            return `draw image ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.image)} ${transformValue(node.size)} ${transformValue(node.rotation)}`;
        }
        case IRNodeType.PRINT: {
            return `print ${transformValue(node.value)}`;
        }
        case IRNodeType.DRAW_FLUSH: {
            return `drawflush ${transformValue(node.target)}`;
        }
        case IRNodeType.PRINT_FLUSH: {
            return `printflush ${transformValue(node.target)}`;
        }
        case IRNodeType.GET_LINK: {
            return `getLink ${node.result} ${transformValue(node.id)}`;
        }
        case IRNodeType.SET_ENABLED: {
            return `control enabled ${transformValue(node.building)} ${transformValue(node.enabled)}`;
        }
        case IRNodeType.SET_SHOOT: {
            return `control shoot ${transformValue(node.building)} ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.shoot)}`;
        }
        case IRNodeType.SET_SHOOT_P: {
            return `control shootp ${transformValue(node.building)} ${transformValue(node.unit)} ${transformValue(node.shoot)}`;
        }
        case IRNodeType.SET_CONFIG: {
            return `control config ${transformValue(node.building)} ${transformValue(node.config)}`;
        }
        case IRNodeType.SET_COLOR: {
            return `control color ${transformValue(node.building)} ${transformValue(node.color)}`;
        }
        case IRNodeType.RADAR: {
            return `radar ${transformRadarCondition(node.condition1)} ${transformRadarCondition(node.condition2)} ${transformRadarCondition(node.condition3)} ${transformRadarSortConfig(node.sort)} ${transformValue(node.building)} ${transformValue(node.order)} ${node.result}`;
        }
        case IRNodeType.SENSOR: {
            return `sensor ${node.result} ${transformValue(node.building)} ${transformValue(node.target)}`;
        }
        case IRNodeType.ASSIGN: {
            return `set ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.ADD: {
            return `op add ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.SUB: {
            return `op sub ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.MUL: {
            return `op mul ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.DIV: {
            return `op div ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.IDIV: {
            return `op idiv ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.MOD: {
            return `op mod ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.POW: {
            return `op pow ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.EQ: {
            return `op equal ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.NE: {
            return `op notEqual ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.AND: {
            return `op land ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.LESS: {
            return `op lessThan ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.LE: {
            return `op lessThanEq ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.GREATER: {
            return `op greaterThan ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.GE: {
            return `op greaterThanEq ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.STRICT_EQ: {
            return `op strictEqual ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.SHL: {
            return `op shl ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.SHR: {
            return `op shr ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.BITOR: {
            return `op or ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.BITAND: {
            return `op and ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.XOR: {
            return `op xor ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.FLIP: {
            return `op not ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.MAX: {
            return `op max ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.MIN: {
            return `op min ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.ANGLE: {
            return `op angle ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.ANGLE_DIFF: {
            return `op angleDiff ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.LEN: {
            return `op len ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.NOISE: {
            return `op noise ${node.target} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
        case IRNodeType.ABS: {
            return `op abs ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.LOG: {
            return `op log ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.LOG10: {
            return `op log10 ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.FLOOR: {
            return `op floor ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.CEIL: {
            return `op ceil ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.SQRT: {
            return `op sqrt ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.RAND: {
            return `op rand ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.SIN: {
            return `op sin ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.COS: {
            return `op cos ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.TAN: {
            return `op tan ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.ASIN: {
            return `op asin ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.ACOS: {
            return `op acos ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.ATAN: {
            return `op atan ${node.target} ${transformValue(node.value)}`;
        }
        case IRNodeType.PACK_COLOR: {
            return `packcolor ${node.result} ${transformValue(node.r)} ${transformValue(node.g)} ${transformValue(node.b)} ${transformValue(node.a)}`;
        }
        case IRNodeType.WAIT: {
            return `wait ${transformValue(node.time)}`;
        }
        case IRNodeType.CPU_STOP: {
            return 'stop';
        }
        case IRNodeType.UNIT_BIND: {
            return `ubind ${transformValue(node.unit)}`;
        }
        case IRNodeType.IDLE: {
            return 'ucontrol idle';
        }
        case IRNodeType.STOP: {
            return 'ucontrol stop';
        }
        case IRNodeType.MOVE: {
            return `ucontrol move ${transformValue(node.x)} ${transformValue(node.y)}`;
        }
        case IRNodeType.APPROACH: {
            return `ucontrol approach ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.distance)}`;
        }
        case IRNodeType.PATH_FIND: {
            return `ucontrol pathfind ${transformValue(node.x)} ${transformValue(node.y)}`;
        }
        case IRNodeType.AUTO_PATH_FIND: {
            return 'ucontrol autoPathfind';
        }
        case IRNodeType.BOOST: {
            return `ucontrol boost ${transformValue(node.enabled)}`;
        }
        case IRNodeType.TARGET: {
            return `ucontrol target ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.shoot)}`;
        }
        case IRNodeType.TARGET_P: {
            return `ucontrol targetp ${transformValue(node.unit)} ${transformValue(node.shoot)}`;
        }
        case IRNodeType.ITEM_DROP: {
            return `ucontrol itemDrop ${transformValue(node.building)} ${transformValue(node.amount)}`;
        }
        case IRNodeType.ITEM_TAKE: {
            return `ucontrol itemTake ${transformValue(node.building)} ${transformValue(node.item)} ${transformValue(node.amount)}`;
        }
        case IRNodeType.PAY_DROP: {
            return 'ucontrol payDrop';
        }
        case IRNodeType.PAY_TAKE: {
            return `ucontrol payTake ${transformValue(node.takeUnits)}`;
        }
        case IRNodeType.PAY_ENTER: {
            return 'ucontrol payEnter';
        }
        case IRNodeType.MINE: {
            return `ucontrol mine ${transformValue(node.x)} ${transformValue(node.y)}`;
        }
        case IRNodeType.FLAG: {
            return `ucontrol flag ${transformValue(node.flag)}`;
        }
        case IRNodeType.BUILD: {
            return `ucontrol build ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.block)} ${transformValue(node.rotation)} ${transformValue(node.config)}`;
        }
        case IRNodeType.GET_BLOCK: {
            return `ucontrol getBlock ${transformValue(node.x)} ${transformValue(node.y)} ${node.outType} ${node.building} ${node.floor}`;
        }
        case IRNodeType.WITHIN: {
            return `ucontrol within ${transformValue(node.x)} ${transformValue(node.y)} ${transformValue(node.radius)} ${node.result}`;
        }
        case IRNodeType.UNBIND: {
            return 'ucontrol unbind';
        }
        case IRNodeType.UNIT_RADAR: {
            return `uradar ${transformRadarCondition(node.condition1)} ${transformRadarCondition(node.condition2)} ${transformRadarCondition(node.condition3)} ${transformRadarSortConfig(node.sort)} 0 ${transformValue(node.order)} ${node.result}`;
        }
        case IRNodeType.UNIT_LOCATE_ORE: {
            return `ulocate ore core true ${transformValue(node.target)} ${node.outX} ${node.outY} ${node.found}`;
        }
        case IRNodeType.UNIT_LOCATE_BUILDING: {
            let group: string;
            switch (node.group) {
                case UnitLocateBuildingGroup.CORE:
                    group = 'core';
                    break;
                case UnitLocateBuildingGroup.STORAGE:
                    group = 'storage';
                    break;
                case UnitLocateBuildingGroup.GENERATOR:
                    group = 'generator';
                    break;
                case UnitLocateBuildingGroup.TURRET:
                    group = 'turret';
                    break;
                case UnitLocateBuildingGroup.FACTORY:
                    group = 'factory';
                    break;
                case UnitLocateBuildingGroup.REPAIR:
                    group = 'repair';
                    break;
                case UnitLocateBuildingGroup.BATTERY:
                    group = 'battery';
                    break;
                default:
                    group = 'reactor';
            }
            return `ulocate building ${group} ${transformValue(node.enemy)} @copper ${node.outX} ${node.outY} ${node.found} ${node.building}`;
        }
        case IRNodeType.UNIT_LOCATE_SPAWN: {
            return `ulocate spawn core true @copper ${node.outX} ${node.outY} ${node.found} ${node.building}`;
        }
        default: {
            return `ulocate damaged core true @copper ${node.outX} ${node.outY} ${node.found} ${node.building}`;
        }
    }
};

const transformJumpNode = (node: JumpNode, labelMap: Record<string, number>) => {
    switch (node.type) {
        case IRNodeType.JUMP: {
            return `jump ${labelMap[node.label]} always`;
        }
        default: {
            let condition: string;
            switch (node.condition) {
                case JumpCondition.EQ:
                    condition = 'equal';
                    break;
                case JumpCondition.NE:
                    condition = 'notEqual';
                    break;
                case JumpCondition.LESS:
                    condition = 'lessThan';
                    break;
                case JumpCondition.LE:
                    condition = 'lessThanEq';
                    break;
                case JumpCondition.GREATER:
                    condition = 'greaterThan';
                    break;
                case JumpCondition.GE:
                    condition = 'greaterThanEq';
                    break;
                default:
                    condition = 'strictEqual';
            }
            return `jump ${labelMap[node.label]} ${condition} ${transformValue(node.left)} ${transformValue(node.right)}`;
        }
    }
};

export const genASM = (ir: IRNode[]): string => {
    const labelMap: Record<string, number> = {};
    let instructionLine = 0;

    for (const node of ir) {
        if (node.type === IRNodeType.LABEL) {
            labelMap[node.name] = instructionLine;
            continue;
        }
        instructionLine += 1;
    }

    const asmLines: string[] = [];
    for (const node of ir) {
        if (
            node.type === IRNodeType.LABEL ||
            node.type === IRNodeType.MACRO_CALL ||
            node.type === IRNodeType.MACRO_CALL_ASSIGN ||
            node.type === IRNodeType.BIND
        ) {
            continue;
        }

        if (node.type === IRNodeType.JUMP || node.type === IRNodeType.CONDITIONAL_JUMP) {
            asmLines.push(transformJumpNode(node, labelMap));
            continue;
        }

        asmLines.push(transformNormalNode(node));
    }

    const trailingLabels = Object.keys(labelMap).filter((name) => labelMap[name] === asmLines.length);
    if (trailingLabels.length > 0) {
        const nopLine = asmLines.length;
        asmLines.push('noop');
        for (const name of trailingLabels) {
            labelMap[name] = nopLine;
        }
    }

    return asmLines.join('\n');
};
