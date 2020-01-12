import {
    createConnection,
    ProposedFeatures,
    TextDocuments,
    InitializeParams,
    TextDocument,
    Diagnostic,
    DiagnosticSeverity,
    DidChangeConfigurationParams
} from 'vscode-languageserver';

import { basename, extname } from 'path';

import * as jsonToAst from "json-to-ast";

import { ExampleConfiguration, Severity, RuleKeys } from './configuration';
import { makeLint, LinterProblem } from './linter';

let conn = createConnection(ProposedFeatures.all);
let docs: TextDocuments = new TextDocuments();
let conf: ExampleConfiguration | undefined = undefined;

conn.onInitialize((params: InitializeParams) => {
    return {
        capabilities: {
            textDocumentSync: 1
        }
    };
});

function GetSeverity(key: RuleKeys | undefined): DiagnosticSeverity | undefined {
    if (!conf || !conf.severity || !key) {
        return undefined;
    }

    return DiagnosticSeverity.Error;
    // const severity: Severity = conf.severity[key];

    // switch (severity) {
    //     case Severity.Error:
    //         return DiagnosticSeverity.Error;
    //     case Severity.Warning:
    //         return DiagnosticSeverity.Warning;
    //     case Severity.Information:
    //         return DiagnosticSeverity.Information;
    //     case Severity.Hint:
    //         return DiagnosticSeverity.Hint;
    //     default:
    //         return DiagnosticSeverity.Error;
    // }
}

function GetMessage(key: RuleKeys | undefined): string {
    if (key === RuleKeys.BlockNameIsRequired) {
        return 'Field named \'block\' is required!';
    }

    if (key === RuleKeys.UppercaseNamesIsForbidden) {
        return 'Uppercase properties are forbidden!';
    }

    return `Unknown problem type '${key}'`;
}

function GetRange(location: jsonToAst.AstLocation | undefined, textDocument: TextDocument) {
    if (!location) {
        return undefined;
    }

    const { start } = location;
    const { end } = location;

    if (start.line && start.column && end.line && end.column) {
        return {
            start: {
                line: location.start.line - 1,
                character: location.start.column - 1,
            },
            end: {
                line: location.end.line - 1,
                character: location.end.column - 1,
            }
        }
    } else {
        return {
            start: textDocument.positionAt(location.start.offset),
            end: textDocument.positionAt(location.end.offset)
        }
    }
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    const source = basename(textDocument.uri);
    if (extname(source) !== '.json') return;
    const json = textDocument.getText();

    const validateObject = (
        obj: jsonToAst.AstObject
    ): LinterProblem<RuleKeys>[] =>
        obj.children.some(p => p.key.value === 'block')
            ? []
            : [{ key: RuleKeys.BlockNameIsRequired, loc: obj.loc }];

    const validateProperty = (
        property: jsonToAst.AstProperty
    ): LinterProblem<RuleKeys>[] =>
        /^[A-Z]+$/.test(property.key.value)
            ? [
                  {
                      key: RuleKeys.UppercaseNamesIsForbidden,
                      loc: property.key.loc
                  }
              ]
            : [];

    const diagnostics: Diagnostic[] = makeLint(
        json,
        validateProperty,
        validateObject
    ).reduce(
        (
            list: Diagnostic[],
            problem: LinterProblem<RuleKeys>
        ): Diagnostic[] => {
            const severity = GetSeverity(problem.key || problem.code);
            console.log(severity);

            if (severity) {
                const message = problem.error || GetMessage(problem.key);
                const range = GetRange(problem.location || problem.loc, textDocument);
                if (range) {
                    let diagnostic: Diagnostic = {
                        range,
                        severity,
                        message,
                        source
                    };

                    list.push(diagnostic);
                }
            }

            return list;
        },
        []
    );

    if (diagnostics.length) {
        conn.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    }
}

async function validateAll() {
    for (const document of docs.all()) {
        await validateTextDocument(document);
    }
}

docs.onDidChangeContent(change => {
    validateTextDocument(change.document);
});

conn.onDidChangeConfiguration(({ settings }: DidChangeConfigurationParams) => {
    conf = settings.example;
    validateAll();
});

docs.listen(conn);
conn.listen();
