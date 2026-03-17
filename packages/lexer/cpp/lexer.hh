#pragma once

#define YY_NO_UNISTD_H

#include <napi.h>

#ifndef __FLEX_LEXER_H
class yyFlexLexer {
public:
    yyFlexLexer(std::istream *in);
};
#endif

class Lexer : public yyFlexLexer {
private:
    int row;
    int col;

public:
    Lexer(std::istream *in = nullptr) : yyFlexLexer(in), row(0), col(0) {}
    int getRow() {
        return row;
    }
    int getCol() {
        return col;
    }
    int yylex();
};

namespace lexer {
    Napi::External<Lexer> initLexer(const Napi::CallbackInfo &info);
    void deleteLexer(const Napi::CallbackInfo &info);
    Napi::Object lex(const Napi::CallbackInfo &info);
}
