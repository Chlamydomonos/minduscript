import { type Token, TokenType } from '@minduscript/lexer';
import type {
    ExpressionChildNode,
    UnaryOpExpressionNode,
    BinaryOpExpressionNode,
    FunctionCallExpressionNode,
    MacroCallExpressionNode,
    LiteralExpressionNode,
    IdentifierExpressionNode,
    ExpressionNode,
} from './nodes';
import { IdentifierType, NodeType } from './nodes';

enum Associativity {
    LEFT,
    RIGHT,
}

interface BinaryOperator {
    priority: number;
    associativity: Associativity;
}

const MIN_NODE_TYPE = NodeType.DOCUMENT as number;

class ExpressionParser {
    private readonly L_PAREN = TokenType.L_PAREN;
    private readonly R_PAREN = TokenType.R_PAREN;
    private readonly COMMA = TokenType.COMMA;

    // 一元运算符，对应的值为运算符优先级
    private readonly unaryOperators = {
        [TokenType.NOT]: 3,
        [TokenType.FLIP]: 11,
    } as Record<TokenType, number | undefined>;

    // 二元运算符
    private readonly binaryOperators = {
        [TokenType.OR]: { priority: 1, associativity: Associativity.LEFT },
        [TokenType.AND]: { priority: 2, associativity: Associativity.LEFT },
        [TokenType.EQ]: { priority: 4, associativity: Associativity.LEFT },
        [TokenType.NE]: { priority: 4, associativity: Associativity.LEFT },
        [TokenType.LESS]: { priority: 4, associativity: Associativity.LEFT },
        [TokenType.LE]: { priority: 4, associativity: Associativity.LEFT },
        [TokenType.GREATER]: { priority: 4, associativity: Associativity.LEFT },
        [TokenType.GE]: { priority: 4, associativity: Associativity.LEFT },
        [TokenType.STRICT_EQ]: { priority: 4, associativity: Associativity.LEFT },
        [TokenType.BITOR]: { priority: 5, associativity: Associativity.LEFT },
        [TokenType.XOR]: { priority: 6, associativity: Associativity.LEFT },
        [TokenType.BITAND]: { priority: 7, associativity: Associativity.LEFT },
        [TokenType.SHL]: { priority: 8, associativity: Associativity.LEFT },
        [TokenType.SHR]: { priority: 8, associativity: Associativity.LEFT },
        [TokenType.ADD]: { priority: 9, associativity: Associativity.LEFT },
        [TokenType.SUB]: { priority: 9, associativity: Associativity.LEFT },
        [TokenType.MUL]: { priority: 10, associativity: Associativity.LEFT },
        [TokenType.DIV]: { priority: 10, associativity: Associativity.LEFT },
        [TokenType.IDIV]: { priority: 10, associativity: Associativity.LEFT },
        [TokenType.MOD]: { priority: 10, associativity: Associativity.LEFT },
        [TokenType.POW]: { priority: 12, associativity: Associativity.RIGHT },
    } as Record<TokenType, BinaryOperator | undefined>;

    // 函数，对应的值为参数个数
    private readonly functions = {
        [TokenType.MAX]: 2,
        [TokenType.MIN]: 2,
        [TokenType.ANGLE]: 2,
        [TokenType.ANGLE_DIFF]: 2,
        [TokenType.LEN]: 2,
        [TokenType.NOISE]: 2,
        [TokenType.ABS]: 1,
        [TokenType.LOG]: 1,
        [TokenType.LOG10]: 1,
        [TokenType.FLOOR]: 1,
        [TokenType.CEIL]: 1,
        [TokenType.SQRT]: 1,
        [TokenType.RAND]: 1,
        [TokenType.SIN]: 1,
        [TokenType.COS]: 1,
        [TokenType.TAN]: 1,
        [TokenType.ASIN]: 1,
        [TokenType.ACOS]: 1,
        [TokenType.ATAN]: 1,
    } as Record<TokenType, number | undefined>;

    // 字面量
    private readonly literals = {
        [TokenType.NUMBER]: (token: Token) => parseFloat(token.raw),
        [TokenType.STRING]: (token: Token) => JSON.parse(token.raw),
        [TokenType.TRUE]: (_: Token) => true,
        [TokenType.FALSE]: (_: Token) => false,
        [TokenType.NULL]: (_: Token) => null,
    } as Record<TokenType, ((token: Token) => number | string | boolean | null) | undefined>;

    private readonly identifiers = {
        [TokenType.IDENTIFIER]: (token: Token) => ({
            type: NodeType.IDENTIFIER_EXPRESSION,
            tokens: [token],
            value: token.raw,
            identifierType: IdentifierType.SIMPLE,
            isMindustry: false,
        }),
        [TokenType.MINDUSTRY_IDENTIFIER]: (token: Token) => ({
            type: NodeType.IDENTIFIER_EXPRESSION,
            tokens: [token],
            value: token.raw,
            isMindustry: true,
        }),
    } as Record<TokenType, ((token: Token) => IdentifierExpressionNode) | undefined>;

    private buildUnaryOp = (token: Token, child: ExpressionChildNode): UnaryOpExpressionNode => ({
        type: NodeType.UNARY_OP_EXPRESSION,
        tokens: [token, ...child.tokens],
        opType: token.type as any,
        child,
    });

    private buildBinaryOp = (
        token: Token,
        lChild: ExpressionChildNode,
        rChild: ExpressionChildNode,
    ): BinaryOpExpressionNode => ({
        type: NodeType.BINARY_OP_EXPRESSION,
        tokens: [...lChild.tokens, token, ...rChild.tokens],
        opType: token.type as any,
        lChild,
        rChild,
    });

    private buildFunction = (
        token: Token,
        children: (Token | ExpressionChildNode)[], // 包含所有成分，如解析`max(a + b, c)`时，传入['(', 'a + b', ',', 'c', ')']
        args: ExpressionChildNode[], // 只包含参数，如解析`max(a + b, c)`时，传入['a + b', 'c']
    ): FunctionCallExpressionNode => ({
        type: NodeType.FUNCTION_CALL_EXPRESSION,
        tokens: children.flatMap((c) => {
            if (c.type < MIN_NODE_TYPE) {
                return [c as Token];
            } else {
                return (c as ExpressionChildNode).tokens;
            }
        }),
        function: token.type as any,
        args,
    });

    private buildMacro = (
        token: Omit<Token, 'type'> & { type: TokenType.IDENTIFIER },
        children: (Token | ExpressionChildNode)[],
        inputArgs: ExpressionChildNode[],
        outputArgs: IdentifierExpressionNode[],
    ): MacroCallExpressionNode => ({
        type: NodeType.MACRO_CALL_EXPRESSION,
        tokens: children.flatMap((c) => {
            if (c.type < MIN_NODE_TYPE) {
                return [c as Token];
            } else {
                return (c as ExpressionChildNode).tokens;
            }
        }),
        name: token.raw,
        inputArgs,
        outputArgs,
    });

    private buildLiteral = (token: Token): LiteralExpressionNode => {
        const factory = this.literals[token.type];
        if (!factory) {
            throw Error();
        }
        return {
            type: NodeType.LITERAL_EXPRESSION,
            tokens: [token],
            value: factory(token),
        };
    };

    private buildIdentifier = (token: Token): IdentifierExpressionNode => {
        const factory = this.identifiers[token.type];
        if (!factory) {
            throw Error();
        }
        return factory(token);
    };

    private buildDefinedIdentifier = (
        definitionToken: Omit<Token, 'type'> & { type: TokenType.LET | TokenType.CONST },
        identifierToken: Omit<Token, 'type'> & { type: TokenType.IDENTIFIER },
    ): IdentifierExpressionNode => ({
        type: NodeType.IDENTIFIER_EXPRESSION,
        tokens: [definitionToken, identifierToken],
        value: identifierToken.raw,
        identifierType: definitionToken.type === TokenType.LET ? IdentifierType.LET : IdentifierType.CONST,
        isMindustry: false,
    });

    parse(tokens: Token[], from: number): { node: Omit<ExpressionNode, 'type'>; next: number } {
        const isTerminator = (tokenType: TokenType): boolean => {
            return (
                tokenType === this.COMMA ||
                tokenType === this.R_PAREN ||
                tokenType === TokenType.SEMICOLON ||
                tokenType === TokenType.R_BRACE
            );
        };

        const error = (message: string, index: number): Error => {
            const token = tokens[index];
            if (!token) {
                return new Error(`${message} at end of input`);
            }
            return new Error(`${message} at ${token.row}:${token.col}`);
        };

        const parseIdentifierList = (
            startIndex: number,
            lParenToken: Token,
        ): {
            children: (Token | ExpressionChildNode)[];
            identifiers: IdentifierExpressionNode[];
            next: number;
        } => {
            const children: (Token | ExpressionChildNode)[] = [lParenToken];
            const identifiers: IdentifierExpressionNode[] = [];
            let index = startIndex;

            if (index >= tokens.length) {
                throw error('Unclosed parenthesized identifier list', startIndex - 1);
            }

            if (tokens[index].type === this.R_PAREN) {
                children.push(tokens[index]);
                return { children, identifiers, next: index + 1 };
            }

            while (index < tokens.length) {
                const token = tokens[index];
                let identifierNode: IdentifierExpressionNode;
                if (token.type === TokenType.LET || token.type === TokenType.CONST) {
                    const identifierToken = tokens[index + 1];
                    if (!identifierToken || identifierToken.type !== TokenType.IDENTIFIER) {
                        throw error('Expected identifier after "let" or "const" in macro output arguments', index + 1);
                    }
                    identifierNode = this.buildDefinedIdentifier(
                        token as Omit<Token, 'type'> & { type: TokenType.LET | TokenType.CONST },
                        identifierToken as Omit<Token, 'type'> & { type: TokenType.IDENTIFIER },
                    );
                    index += 2;
                } else if (token.type === TokenType.IDENTIFIER || token.type === TokenType.MINDUSTRY_IDENTIFIER) {
                    identifierNode = this.buildIdentifier(token);
                    index += 1;
                } else {
                    throw error('Expected identifier or "let"/"const" definition in macro output arguments', index);
                }

                identifiers.push(identifierNode);
                children.push(identifierNode);

                if (index >= tokens.length) {
                    throw error('Unclosed parenthesized identifier list', index - 1);
                }

                const separator = tokens[index];
                if (separator.type === this.COMMA) {
                    children.push(separator);
                    index += 1;
                    continue;
                }
                if (separator.type === this.R_PAREN) {
                    children.push(separator);
                    return { children, identifiers, next: index + 1 };
                }
                throw error('Expected "," or ")" in macro output arguments', index);
            }

            throw error('Unclosed parenthesized identifier list', index - 1);
        };

        const parseExpressionList = (
            startIndex: number,
            lParenToken: Token,
        ): {
            children: (Token | ExpressionChildNode)[];
            args: ExpressionChildNode[];
            next: number;
        } => {
            const children: (Token | ExpressionChildNode)[] = [lParenToken];
            const args: ExpressionChildNode[] = [];
            let index = startIndex;

            if (index >= tokens.length) {
                throw error('Unclosed parenthesized expression list', startIndex - 1);
            }

            if (tokens[index].type === this.R_PAREN) {
                children.push(tokens[index]);
                return { children, args, next: index + 1 };
            }

            while (index < tokens.length) {
                const parsed = parseExpression(index, 0);
                args.push(parsed.node);
                children.push(parsed.node);
                index = parsed.next;

                if (index >= tokens.length) {
                    throw error('Unclosed parenthesized expression list', index - 1);
                }

                const separator = tokens[index];
                if (separator.type === this.COMMA) {
                    children.push(separator);
                    index += 1;
                    continue;
                }
                if (separator.type === this.R_PAREN) {
                    children.push(separator);
                    return { children, args, next: index + 1 };
                }
                throw error('Expected "," or ")" in argument list', index);
            }

            throw error('Unclosed parenthesized expression list', index - 1);
        };

        const parsePrimary = (startIndex: number): { node: ExpressionChildNode; next: number } => {
            const token = tokens[startIndex];
            if (!token) {
                throw error('Expected expression', startIndex);
            }

            const literalFactory = this.literals[token.type];
            if (literalFactory) {
                return { node: this.buildLiteral(token), next: startIndex + 1 };
            }

            const functionArgCount = this.functions[token.type];
            if (functionArgCount !== undefined) {
                const lParenIndex = startIndex + 1;
                const lParen = tokens[lParenIndex];
                if (!lParen || lParen.type !== this.L_PAREN) {
                    throw error('Expected "(" after function name', lParenIndex);
                }

                const parsedArgs = parseExpressionList(lParenIndex + 1, lParen);
                if (parsedArgs.args.length !== functionArgCount) {
                    throw error(
                        `Function \"${token.raw}\" expects ${functionArgCount} argument(s), but got ${parsedArgs.args.length}`,
                        lParenIndex,
                    );
                }

                return {
                    node: this.buildFunction(token, [token, ...parsedArgs.children], parsedArgs.args),
                    next: parsedArgs.next,
                };
            }

            const identifierFactory = this.identifiers[token.type];
            if (identifierFactory) {
                if (token.type === TokenType.IDENTIFIER) {
                    const lParen1 = tokens[startIndex + 1];
                    if (lParen1 && lParen1.type === this.L_PAREN) {
                        const parsedInputArgs = parseExpressionList(startIndex + 2, lParen1);
                        const lParen2 = tokens[parsedInputArgs.next];
                        if (!lParen2 || lParen2.type !== this.L_PAREN) {
                            throw error('Expected second "(" for macro output arguments', parsedInputArgs.next);
                        }
                        const parsedOutputArgs = parseIdentifierList(parsedInputArgs.next + 1, lParen2);

                        return {
                            node: this.buildMacro(
                                token as Omit<Token, 'type'> & { type: TokenType.IDENTIFIER },
                                [token, ...parsedInputArgs.children, ...parsedOutputArgs.children],
                                parsedInputArgs.args,
                                parsedOutputArgs.identifiers,
                            ),
                            next: parsedOutputArgs.next,
                        };
                    }
                }
                return { node: this.buildIdentifier(token), next: startIndex + 1 };
            }

            if (token.type === this.L_PAREN) {
                const parsed = parseExpression(startIndex + 1, 0);
                const rParen = tokens[parsed.next];
                if (!rParen || rParen.type !== this.R_PAREN) {
                    throw error('Expected ")" to close parenthesized expression', parsed.next);
                }
                return {
                    node: {
                        ...parsed.node,
                        tokens: [token, ...parsed.node.tokens, rParen],
                    },
                    next: parsed.next + 1,
                };
            }

            throw error('Expected expression', startIndex);
        };

        const parseExpression = (
            startIndex: number,
            minPriority: number,
        ): { node: ExpressionChildNode; next: number } => {
            let index = startIndex;
            const unaryToken = tokens[index];
            const unaryPriority = unaryToken ? this.unaryOperators[unaryToken.type] : undefined;

            let left: ExpressionChildNode;
            if (unaryToken && unaryPriority !== undefined) {
                const parsedChild = parseExpression(index + 1, unaryPriority);
                left = this.buildUnaryOp(unaryToken, parsedChild.node);
                index = parsedChild.next;
            } else {
                const primary = parsePrimary(index);
                left = primary.node;
                index = primary.next;
            }

            while (index < tokens.length) {
                const operatorToken = tokens[index];
                if (isTerminator(operatorToken.type)) {
                    break;
                }

                const operator = this.binaryOperators[operatorToken.type];
                if (!operator || operator.priority < minPriority) {
                    break;
                }

                const nextMinPriority =
                    operator.associativity === Associativity.LEFT ? operator.priority + 1 : operator.priority;

                const right = parseExpression(index + 1, nextMinPriority);
                left = this.buildBinaryOp(operatorToken, left, right.node);
                index = right.next;
            }

            return { node: left, next: index };
        };

        const parsed = parseExpression(from, 0);
        return { node: { child: parsed.node, tokens: parsed.node.tokens }, next: parsed.next };
    }
}

const parserInstance = new ExpressionParser();

export const expressionParser: ExpressionParser['parse'] = (tokens, from) => parserInstance.parse(tokens, from);
