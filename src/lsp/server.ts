/* --------------------------------------------------------------------------------------------
 * SonarLint for VisualStudio Code
 * Copyright (C) 2017-2023 SonarSource SA
 * sonarlint@sonarsource.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import * as Path from 'path';
import * as VSCode from 'vscode';
import { TransportKind } from 'vscode-languageclient/node';
import { getSonarLintConfiguration } from '../settings/settings';
import { RequirementsData } from '../util/requirements';
import * as util from '../util/util';

declare let v8debug: object;
const DEBUG = typeof v8debug === 'object' || util.startedInDebugMode(process);

export function languageServerCommand(
  context: VSCode.ExtensionContext,
  requirements: RequirementsData
) {
  const serverJar = Path.resolve(context.extensionPath, 'server', 'sonarlint-ls.jar');
  const javaExecutablePath = Path.resolve(requirements.javaHome, 'bin', 'java');

  const params = [];
  if (DEBUG) {
    params.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=8000,quiet=y');
    params.push('-Dsonarlint.telemetry.disabled=true');
  }
  params.push('--add-opens=java.base/java.lang=ALL-UNNAMED');
  const vmargs = getSonarLintConfiguration().get('ls.vmargs', '');
  parseVMargs(params, vmargs);
  params.push('-jar', serverJar);
  params.push('-stdio');
  params.push('-analyzers');
  params.push(Path.resolve(context.extensionPath, 'analyzers', 'sonarjs.jar'));
  params.push(Path.resolve(context.extensionPath, 'analyzers', 'objectscriptquality.jar'));

  return { command: javaExecutablePath, args: params, transport: TransportKind.stdio };
}

export function parseVMargs(params: string[], vmargsLine: string) {
  if (!vmargsLine) {
    return;
  }
  const vmargs = vmargsLine.match(/(?:[^\s"]+|"[^"]*")+/g);
  if (vmargs === null) {
    return;
  }
  vmargs.forEach(arg => {
    //remove all standalone double quotes
    arg = arg.replace(/(\\)?"/g, function ($0, $1) {
      return $1 ? $0 : '';
    });
    //unescape all escaped double quotes
    arg = arg.replace(/(\\)"/g, '"');
    if (params.indexOf(arg) < 0) {
      params.push(arg);
    }
  });
}
