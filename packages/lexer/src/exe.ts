#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs';
import { lexer, TokenType } from '.';
import { LexError } from './lexer';

program
    .option('-o, --output <string>', '输出文件，若不存在则输出到标准输出')
    .option('-r, --raw', '输出可被语法分析器使用的原始Token流')
    .argument('[inputFile]', '输入文件名，若不存在则读取标准输入')
    .action(function (input?: string) {
        const options = this.opts();
        const output: string | undefined = options.output;
        const raw: boolean = options.raw ?? false;
        let inputData: string;
        if (input) {
            inputData = fs.readFileSync(input, { encoding: 'utf-8' });
        } else {
            inputData = process.stdin.read();
        }

        try {
            const tokens = lexer.lexString(inputData);

            let outputData: string;
            if (raw) {
                outputData = JSON.stringify(tokens);
            } else {
                outputData = JSON.stringify(tokens.map((token) => `${TokenType[token.type]}(${token.raw})`));
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
            } else {
                throw e;
            }
        }
    })
    .parse();
