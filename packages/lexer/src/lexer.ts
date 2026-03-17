import type { Token } from './token';

declare const IsLexer: unique symbol;
type CppLexer = {
    [IsLexer]: true;
};

type CppLib = {
    initLexer(fileName?: string, isStr?: true): CppLexer;
    deleteLexer(lexer: CppLexer): void;
    lex(lexer: CppLexer): Token;
};

const cppLib = require('../build/Release/addon.node') as CppLib;

export class LexError extends Error {
    constructor(
        readonly row: number,
        readonly col: number,
        readonly raw: string,
    ) {
        super(`Unexpected char "${JSON.stringify(raw)}" at (${row}, ${col})`);
    }
}

export class Lexer {
    private lex(lexer: CppLexer) {
        const tokenStream: Token[] = [];
        let token: Token;
        while (((token = cppLib.lex(lexer)).type as number) != 0) {
            if ((token.type as number) == -1) {
                cppLib.deleteLexer(lexer);
                throw new LexError(token.row, token.col, token.raw);
            }
            tokenStream.push(token);
        }
        cppLib.deleteLexer(lexer);
        return tokenStream;
    }

    lexInput() {
        return this.lex(cppLib.initLexer());
    }

    lexFile(fileName: string) {
        return this.lex(cppLib.initLexer(fileName));
    }

    lexString(str: string) {
        return this.lex(cppLib.initLexer(str, true));
    }
}
