export { parser } from './parser';
export {
    NodeType,
    AssignType,
    ControlType,
    RadarCondition,
    RadarSortConfig,
    UnitLocateCategory,
    UnitLocateBuildingGroup,
    LoopControlType,
    IdentifierType,
    StatementType,
} from './nodes';
export type {
    ASTNode,
    ASTNodeTypes,
    DocumentNode,
    ImportStatementNode,
    StatementNode,
    ExpressionNode,
    UnaryOpType,
    UnaryOpExpressionNode,
    BinaryOpType,
    BinaryOpExpressionNode,
    Functions,
    FunctionCallExpressionNode,
    MacroCallExpressionNode,
    LiteralExpressionNode,
    MindustryIdentifierExpressionNode,
    MinduscriptIdentifierExpressionNode,
    IdentifierExpressionNode,
    ExpressionChildNode,
} from './nodes';

import type { NodeType } from './nodes';
import type * as Nodes from './nodes';

type StatementNodeReExport<T extends { type: NodeType.SINGLE_STATEMENT | NodeType.BLOCK_STATEMENT }> = T extends any
    ? Omit<T, 'type'> & {
          type: NodeType.STATEMENT;
      }
    : never;

export type EmptyStatementNode = StatementNodeReExport<Nodes.EmptyStatementNode>;
export type VariableDefineStatementNode = StatementNodeReExport<Nodes.VariableDefineStatementNode>;
export type AssignStatementNode = StatementNodeReExport<Nodes.AssignStatementNode>;

export type StatementNodeRead = StatementNodeReExport<Nodes.StatementNodeRead>;
export type StatementNodeWrite = StatementNodeReExport<Nodes.StatementNodeWrite>;
export type StatementNodeDrawClear = StatementNodeReExport<Nodes.StatementNodeDrawClear>;
export type StatementNodeDrawColor = StatementNodeReExport<Nodes.StatementNodeDrawColor>;
export type StatementNodeDrawCol = StatementNodeReExport<Nodes.StatementNodeDrawCol>;
export type StatementNodeDrawStroke = StatementNodeReExport<Nodes.StatementNodeDrawStroke>;
export type StatementNodeDrawLine = StatementNodeReExport<Nodes.StatementNodeDrawLine>;
export type StatementNodeDrawRect = StatementNodeReExport<Nodes.StatementNodeDrawRect>;
export type StatementNodeDrawLineRect = StatementNodeReExport<Nodes.StatementNodeDrawLineRect>;
export type StatementNodeDrawPoly = StatementNodeReExport<Nodes.StatementNodeDrawPoly>;
export type StatementNodeDrawLinePoly = StatementNodeReExport<Nodes.StatementNodeDrawLinePoly>;
export type StatementNodeDrawTriangle = StatementNodeReExport<Nodes.StatementNodeDrawTriangle>;
export type StatementNodeDrawImage = StatementNodeReExport<Nodes.StatementNodeDrawImage>;
export type StatementNodePrint = StatementNodeReExport<Nodes.StatementNodePrint>;
export type StatementNodeDrawFlush = StatementNodeReExport<Nodes.StatementNodeDrawFlush>;
export type StatementNodePrintFlush = StatementNodeReExport<Nodes.StatementNodePrintFlush>;
export type StatementNodeGetLink = StatementNodeReExport<Nodes.StatementNodeGetLink>;
export type StatementNodeSetEnabled = StatementNodeReExport<Nodes.StatementNodeSetEnabled>;
export type StatementNodeSetShoot = StatementNodeReExport<Nodes.StatementNodeSetShoot>;
export type StatementNodeSetShootP = StatementNodeReExport<Nodes.StatementNodeSetShootP>;
export type StatementNodeSetConfig = StatementNodeReExport<Nodes.StatementNodeSetConfig>;
export type StatementNodeSetColor = StatementNodeReExport<Nodes.StatementNodeSetColor>;
export type StatementNodeRadar = StatementNodeReExport<Nodes.StatementNodeRadar>;
export type StatementNodeSensor = StatementNodeReExport<Nodes.StatementNodeSensor>;
export type StatementNodePackColor = StatementNodeReExport<Nodes.StatementNodePackColor>;
export type StatementNodeWait = StatementNodeReExport<Nodes.StatementNodeWait>;
export type StatementNodeCpuStop = StatementNodeReExport<Nodes.StatementNodeCpuStop>;
export type StatementNodeUnitBind = StatementNodeReExport<Nodes.StatementNodeUnitBind>;
export type StatementNodeUnitRadar = StatementNodeReExport<Nodes.StatementNodeUnitRadar>;
export type StatementNodeUnitLocateOre = StatementNodeReExport<Nodes.StatementNodeUnitLocateOre>;
export type StatementNodeUnitLocateBuilding = StatementNodeReExport<Nodes.StatementNodeUnitLocateBuilding>;
export type StatementNodeUnitLocateSpawn = StatementNodeReExport<Nodes.StatementNodeUnitLocateSpawn>;
export type StatementNodeUnitLocateDamaged = StatementNodeReExport<Nodes.StatementNodeUnitLocateDamaged>;
export type StatementNodeIdle = StatementNodeReExport<Nodes.StatementNodeIdle>;
export type StatementNodeStop = StatementNodeReExport<Nodes.StatementNodeStop>;
export type StatementNodeMove = StatementNodeReExport<Nodes.StatementNodeMove>;
export type StatementNodeApproach = StatementNodeReExport<Nodes.StatementNodeApproach>;
export type StatementNodePathFind = StatementNodeReExport<Nodes.StatementNodePathFind>;
export type StatementNodeAutoPathFind = StatementNodeReExport<Nodes.StatementNodeAutoPathFind>;
export type StatementNodeBoost = StatementNodeReExport<Nodes.StatementNodeBoost>;
export type StatementNodeTarget = StatementNodeReExport<Nodes.StatementNodeTarget>;
export type StatementNodeTargetP = StatementNodeReExport<Nodes.StatementNodeTargetP>;
export type StatementNodeItemDrop = StatementNodeReExport<Nodes.StatementNodeItemDrop>;
export type StatementNodeItemTake = StatementNodeReExport<Nodes.StatementNodeItemTake>;
export type StatementNodePayDrop = StatementNodeReExport<Nodes.StatementNodePayDrop>;
export type StatementNodePayTake = StatementNodeReExport<Nodes.StatementNodePayTake>;
export type StatementNodePayEnter = StatementNodeReExport<Nodes.StatementNodePayEnter>;
export type StatementNodeMine = StatementNodeReExport<Nodes.StatementNodeMine>;
export type StatementNodeFlag = StatementNodeReExport<Nodes.StatementNodeFlag>;
export type StatementNodeBuild = StatementNodeReExport<Nodes.StatementNodeBuild>;
export type StatementNodeGetBlock = StatementNodeReExport<Nodes.StatementNodeGetBlock>;
export type StatementNodeWithin = StatementNodeReExport<Nodes.StatementNodeWithin>;
export type StatementNodeUnbind = StatementNodeReExport<Nodes.StatementNodeUnbind>;

export type ControlStatementNode = StatementNodeReExport<Nodes.ControlStatementNode>;
export type MacroDefineStatementNode = StatementNodeReExport<Nodes.MacroDefineStatementNode>;
export type MacroCallStatementNode = StatementNodeReExport<Nodes.MacroCallStatementNode>;
export type IfElseStatementNode = StatementNodeReExport<Nodes.IfElseStatementNode>;
export type IfStatementNode = StatementNodeReExport<Nodes.IfStatementNode>;
export type ForStatementNode = StatementNodeReExport<Nodes.ForStatementNode>;
export type WhileStatementNode = StatementNodeReExport<Nodes.WhileStatementNode>;
export type LoopControlStatementNode = StatementNodeReExport<Nodes.LoopControlStatementNode>;
export type ReturnStatementNode = StatementNodeReExport<Nodes.ReturnStatementNode>;
export type BindStatementNode = StatementNodeReExport<Nodes.BindStatementNode>;
