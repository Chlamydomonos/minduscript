%{
#include "lexer.hh"
%}

%option noyywrap
%option c++
%option yyclass="Lexer"

%%
"macro" { col += YYLeng(); return 1; } // Minduscript关键字
"return" { col += YYLeng(); return 2; }
"if" { col += YYLeng(); return 3; }
"else" { col += YYLeng(); return 4; }
"for" { col += YYLeng(); return 5; }
"while" { col += YYLeng(); return 6; }
"continue" { col += YYLeng(); return 7; }
"break" { col += YYLeng(); return 8; }
"import" { col += YYLeng(); return 9; }
"as" { col += YYLeng(); return 10; }
"from" { col += YYLeng(); return 11; }
"let" { col += YYLeng(); return 12; }
"const" { col += YYLeng(); return 13; }
"bind" { col += YYLeng(); return 14; }

"=" { col += YYLeng(); return 15; } // Minduscript运算符
"+=" { col += YYLeng(); return 16; }
"-=" { col += YYLeng(); return 17; }
"*=" { col += YYLeng(); return 18; }
"/=" { col += YYLeng(); return 19; }
"//=" { col += YYLeng(); return 20; }
"%=" { col += YYLeng(); return 21; }
"**=" { col += YYLeng(); return 22; }
"&&=" { col += YYLeng(); return 23; }
"<<=" { col += YYLeng(); return 24; }
">>=" { col += YYLeng(); return 25; }
"&=" { col += YYLeng(); return 26; }
"|=" { col += YYLeng(); return 27; }
"^=" { col += YYLeng(); return 28; }
"||" { col += YYLeng(); return 29; }
"||=" { col += YYLeng(); return 30; }
"!" { col += YYLeng(); return 31; }

"max" { col += YYLeng(); return 32; } // Mindustry关键字
"min" { col += YYLeng(); return 33; }
"angle" { col += YYLeng(); return 34; }
"angleDiff" { col += YYLeng(); return 35; }
"len" { col += YYLeng(); return 36; }
"noise" { col += YYLeng(); return 37; }
"abs" { col += YYLeng(); return 38; }
"log" { col += YYLeng(); return 39; }
"log10" { col += YYLeng(); return 40; }
"floor" { col += YYLeng(); return 41; }
"ceil" { col += YYLeng(); return 42; }
"sqrt" { col += YYLeng(); return 43; }
"rand" { col += YYLeng(); return 44; }
"sin" { col += YYLeng(); return 45; }
"cos" { col += YYLeng(); return 46; }
"tan" { col += YYLeng(); return 47; }
"asin" { col += YYLeng(); return 48; }
"acos" { col += YYLeng(); return 49; }
"atan" { col += YYLeng(); return 50; }
"read" { col += YYLeng(); return 51; }
"write" { col += YYLeng(); return 52; }
"drawClear" { col += YYLeng(); return 53; }
"drawColor" { col += YYLeng(); return 54; }
"drawCol" { col += YYLeng(); return 55; }
"drawStroke" { col += YYLeng(); return 56; }
"drawLine" { col += YYLeng(); return 57; }
"drawRect" { col += YYLeng(); return 58; }
"drawLineRect" { col += YYLeng(); return 59; }
"drawPoly" { col += YYLeng(); return 60; }
"drawLinePoly" { col += YYLeng(); return 61; }
"drawTriangle" { col += YYLeng(); return 62; }
"drawImage" { col += YYLeng(); return 63; }
"print" { col += YYLeng(); return 64; }
"drawFlush" { col += YYLeng(); return 65; }
"printFlush" { col += YYLeng(); return 66; }
"getLink" { col += YYLeng(); return 67; }
"setEnabled" { col += YYLeng(); return 68; }
"setShoot" { col += YYLeng(); return 69; }
"setShootP" { col += YYLeng(); return 70; }
"setConfig" { col += YYLeng(); return 71; }
"setColor" { col += YYLeng(); return 72; }
"radar" { col += YYLeng(); return 73; }
"sensor" { col += YYLeng(); return 74; }
"packColor" { col += YYLeng(); return 75; }
"wait" { col += YYLeng(); return 76; }
"cpuStop" { col += YYLeng(); return 77; }
"unitBind" { col += YYLeng(); return 78; }
"unitRadar" { col += YYLeng(); return 79; }
"unitLocate" { col += YYLeng(); return 80; }
"idle" { col += YYLeng(); return 81; }
"stop" { col += YYLeng(); return 82; }
"move" { col += YYLeng(); return 83; }
"approach" { col += YYLeng(); return 84; }
"pathFind" { col += YYLeng(); return 85; }
"autoPathFind" { col += YYLeng(); return 86; }
"boost" { col += YYLeng(); return 87; }
"target" { col += YYLeng(); return 88; }
"targetP" { col += YYLeng(); return 89; }
"itemDrop" { col += YYLeng(); return 90; }
"itemTake" { col += YYLeng(); return 91; }
"payDrop" { col += YYLeng(); return 92; }
"payTake" { col += YYLeng(); return 93; }
"payEnter" { col += YYLeng(); return 94; }
"mine" { col += YYLeng(); return 95; }
"flag" { col += YYLeng(); return 96; }
"build" { col += YYLeng(); return 97; }
"getBlock" { col += YYLeng(); return 98; }
"within" { col += YYLeng(); return 99; }
"unbind" { col += YYLeng(); return 100; }
"null" { col += YYLeng(); return 101; }
"true" { col += YYLeng(); return 102; }
"false" { col += YYLeng(); return 103; }
"Any" { col += YYLeng(); return 104; }
"Enemy" { col += YYLeng(); return 105; }
"Ally" { col += YYLeng(); return 106; }
"Player" { col += YYLeng(); return 107; }
"Attacker" { col += YYLeng(); return 108; }
"Flying" { col += YYLeng(); return 109; }
"Boss" { col += YYLeng(); return 110; }
"Ground" { col += YYLeng(); return 111; }
"Distance" { col += YYLeng(); return 112; }
"Health" { col += YYLeng(); return 113; }
"Shield" { col += YYLeng(); return 114; }
"Armor" { col += YYLeng(); return 115; }
"MaxHealth" { col += YYLeng(); return 116; }
"Ore" { col += YYLeng(); return 117; }
"Building" { col += YYLeng(); return 118; }
"Spawn" { col += YYLeng(); return 119; }
"Damaged" { col += YYLeng(); return 120; }
"Core" { col += YYLeng(); return 121; }
"Storage" { col += YYLeng(); return 122; }
"Generator" { col += YYLeng(); return 123; }
"Turret" { col += YYLeng(); return 124; }
"Factory" { col += YYLeng(); return 125; }
"Repair" { col += YYLeng(); return 126; }
"Battery" { col += YYLeng(); return 127; }
"Reactor" { col += YYLeng(); return 128; }

"+" { col += YYLeng(); return 129; } // Mindustry运算符
"-" { col += YYLeng(); return 130; }
"*" { col += YYLeng(); return 131; }
"/" { col += YYLeng(); return 132; }
"//" { col += YYLeng(); return 133; }
"%" { col += YYLeng(); return 134; }
"**" { col += YYLeng(); return 135; }
"==" { col += YYLeng(); return 136; }
"!=" { col += YYLeng(); return 137; }
"&&" { col += YYLeng(); return 138; }
"<" { col += YYLeng(); return 139; }
"<=" { col += YYLeng(); return 140; }
">" { col += YYLeng(); return 141; }
">=" { col += YYLeng(); return 142; }
"===" { col += YYLeng(); return 143; }
"<<" { col += YYLeng(); return 144; }
">>" { col += YYLeng(); return 145; }
"|" { col += YYLeng(); return 146; }
"&" { col += YYLeng(); return 147; }
"^" { col += YYLeng(); return 148; }
"~" { col += YYLeng(); return 149; }

[A-Za-z][A-Za-z0-9]* { col += YYLeng(); return 150; } // 标识符
"@"[A-Za-z][A-Za-z0-9]* { col += YYLeng(); return 151; } // Mindustry标识符
-?[0-9]+("."[0-9]+)? { col += YYLeng(); return 152; } // 数字字面量
\"[^\"]*\" { col += YYLeng(); return 153; } // 字符串字面量
"%"[a-f0-9]{6} { col += YYLeng(); return 154; } // 颜色

"{" { col += YYLeng(); return 155; } // 其他符号
"}" { col += YYLeng(); return 156; }
"(" { col += YYLeng(); return 157; }
")" { col += YYLeng(); return 158; }
"," { col += YYLeng(); return 159; }
";" { col += YYLeng(); return 160; }

#[^\n]* { col += YYLeng(); } // 空白
\r?\n { col = 0; row++; }
[\x20\t] { col += YYLeng(); }
. { col += YYLeng(); return -1; }
%%