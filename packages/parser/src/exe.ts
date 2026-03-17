#!/usr/bin/env node

import { lexer, type Token } from '@minduscript/lexer';
import { LexError } from '@minduscript/lexer/dist/lexer';
import { ParserError } from 'chlamydomonos-parser';
import { program } from 'commander';
import fs from 'fs';
import { NodeType } from './nodes';
import { parser } from './parser';

program
    .option('-o, --output <string>', '输出文件，若不存在则输出到标准输出')
    .option('-r, --raw', '输出可被编译器使用的原始语法树')
    .option('-i, --input-raw', '输入包含原始Token流的Json文件')
    .argument('[inputFile]', '输入文件，若不存在则则读取标准输入')
    .action(function (input?: string) {
        const options = this.opts();
        const output: string | undefined = options.output;
        const raw: boolean = options.raw ?? false;
        const inputRaw: boolean = options.inputRaw ?? false;

        let inputData: string;
        if (input) {
            inputData = fs.readFileSync(input, { encoding: 'utf-8' });
        } else {
            inputData = process.stdin.read();
        }

        try {
            let tokens: Token[];
            if (inputRaw) {
                tokens = JSON.parse(inputData);
            } else {
                tokens = lexer.lexString(inputData);
            }

            const ast = parser.parse(tokens);

            let outputData: string;
            if (raw) {
                outputData = JSON.stringify(ast);
            } else {
                outputData = JSON.stringify(
                    ast,
                    (key, value) => {
                        if (key == 'tokens') {
                            return undefined;
                        }

                        if (key == 'type') {
                            return NodeType[value];
                        }

                        return value;
                    },
                    4,
                );
            }

            if (output) {
                fs.writeFileSync(output, outputData, { encoding: 'utf-8' });
            } else {
                console.log(outputData);
            }
        } catch (e) {
            if (e instanceof LexError) {
                console.error(e.message);
                process.exit(1);
            } else if (e instanceof ParserError) {
                console.error(e.message);
                process.exit(1);
            }
            throw e;
        }
    })
    .parse();
