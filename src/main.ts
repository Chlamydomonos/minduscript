#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs';
import { compile } from '@minduscript/compiler';

program
    .option('-o, --output <string>', '输出文件，若不存在则输出到标准输出')
    .option('-r, --root <string>', '项目根目录，默认为当前工作目录')
    .argument('<entryFile>', '入口文件')
    .action(function (entryFile: string) {
        try {
            const options = this.opts();
            const output: string | undefined = options.output;
            const root: string | undefined = options.root;
            const asm = compile(entryFile, root);
            if (output) {
                fs.writeFileSync(output, asm, { encoding: 'utf-8' });
            } else {
                console.log(asm);
            }
        } catch (e) {
            console.error('编译失败:', e instanceof Error ? e.message : e);
        }
    })
    .parse();
