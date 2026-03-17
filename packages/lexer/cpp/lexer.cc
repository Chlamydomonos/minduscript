#include <FlexLexer.h>
#include "lexer.hh"

#include <fstream>
#include <sstream>

using namespace Napi;

External<Lexer> lexer::initLexer(const CallbackInfo &info) {
    Env env = info.Env();
    if (info.Length() == 1) {
        if (!info[0].IsString())
            TypeError::New(env, "Invalid parameter").ThrowAsJavaScriptException();

        auto file = info[0].As<String>().Utf8Value();
        auto f = new std::ifstream(file);
        if (!f->is_open())
            Error::New(env, std::string("Cannot open file ") + file).ThrowAsJavaScriptException();
        auto lexer = new Lexer(f);
        return External<Lexer>::New(env, lexer);
    }

    if (info.Length() == 2) {
        if (!info[0].IsString())
            TypeError::New(env, "Invalid parameter").ThrowAsJavaScriptException();
        auto source = info[0].As<String>().Utf8Value();
        auto s = new std::stringstream(source);
        auto lexer = new Lexer(s);
        return External<Lexer>::New(env, lexer);
    }

    auto lexer = new Lexer();
    return External<Lexer>::New(env, lexer);
}

void lexer::deleteLexer(const CallbackInfo &info) {
    Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsExternal())
        TypeError::New(env, "Invalid parameter").ThrowAsJavaScriptException();

    auto lexer = info[0].As<External<Lexer>>().Data();
    delete lexer;
}

Object lexer::lex(const CallbackInfo &info) {
    Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsExternal())
        TypeError::New(env, "Invalid parameter").ThrowAsJavaScriptException();

    auto lexer = info[0].As<External<Lexer>>().Data();
    auto out = Object::New(env);
    auto result = lexer->yylex();
    auto leng = lexer->YYLeng();
    auto text = lexer->YYText();
    auto row = lexer->getRow();
    auto col = lexer->getCol() - lexer->YYLeng();
    out.Set("type", Value::From<int>(env, result));
    out.Set("leng", Value::From<int>(env, leng));
    out.Set("raw", Value::From<const char *>(env, text));
    out.Set("row", Value::From<int>(env, row));
    out.Set("col", Value::From<int>(env, col));
    return out;
}

Object init(Env env, Object exports) {
    exports.Set("initLexer", Function::New(env, lexer::initLexer));
    exports.Set("deleteLexer", Function::New(env, lexer::deleteLexer));
    exports.Set("lex", Function::New(env, lexer::lex));
    return exports;
}

NODE_API_MODULE(addon, init)