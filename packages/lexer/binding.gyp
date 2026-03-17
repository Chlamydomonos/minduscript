{
    "targets": [
        {
            "target_name": "addon",
            "sources": [
                "cpp/lexer.cc",
                "build/lex.yy.cc"
            ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include\")",
                "<!(node -p \"process.env.LEX_HOME || 'D:/win_flex_bison'\")",
                "cpp"
            ],
            "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
            "cflags!": ["-fno-exceptions"],
            "cflags_cc!": ["-fno-exceptions"],
            "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
            "xcode_settings": {
                "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                "CLANG_CXX_LIBRARY": "libc++",
                "MACOSX_DEPLOYMENT_TARGET": "10.7"
            },
            "msvs_settings": {
                "VCCLCompilerTool": { "ExceptionHandling": 1 }
            },
            "actions": [
                {
                    "action_name": "flex",
                    "inputs": ["cpp/lexer.l"],
                    "outputs": ["build/lex.yy.cc"],
                    "action": ["flex", "-+", "-o", "<@(_outputs)", "<@(_inputs)"]
                },
            ]
        }
    ]
}
