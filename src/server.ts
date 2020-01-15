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

import { ExampleConfiguration, Severity, RuleKeys, RuleTypes } from './configuration';
import { makeLint, LinterStub, LinterByBlock } from './linter';

declare function lint(json: string): LinterByBlock[];

let conn = createConnection(ProposedFeatures.all);
let docs: TextDocuments = new TextDocuments();
let conf: ExampleConfiguration | undefined | any = undefined;

conn.onInitialize((params: InitializeParams) => {
    return {
        capabilities: {
            textDocumentSync: 1
        }
    };
});

function GetSeverity(type: RuleTypes, key: RuleKeys): DiagnosticSeverity | undefined {
    if (!conf || !conf.severity) {
        return undefined;
    }

    const severity: Severity = conf.severity[type][key];

    switch (severity) {
        case Severity.Error:
            return DiagnosticSeverity.Error;
        case Severity.Warning:
            return DiagnosticSeverity.Warning;
        case Severity.Information:
            return DiagnosticSeverity.Information;
        case Severity.Hint:
            return DiagnosticSeverity.Hint;
        default:
            return undefined;
    }
}

function getType(code: string): RuleTypes | undefined {
    const ruleType = code.split('.')[0].toLowerCase();

    return ruleType as RuleTypes
}

function getKey(code: string): RuleKeys | undefined {
    const ruleKey = code.split('.')[1]
        .toLowerCase()
        .replace(/([_][a-z])/ig, (key) => {
          return key.toUpperCase()
            .replace('_', '');
        });

    return ruleKey as RuleKeys
}

function GetMessage(key: RuleKeys): string {
    if (key === RuleKeys.BlockNameIsRequired) {
        return 'Field named \'block\' is required!';
    }

    if (key === RuleKeys.UppercaseNamesIsForbidden) {
        return 'Uppercase properties are forbidden!';
    }

    return `Unknown problem type '${key}'`;
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    const source = basename(textDocument.uri);
    if (extname(source) !== '.json') return;
    const json = textDocument.getText();

    const validateObject = (
        obj: jsonToAst.AstObject
    ): LinterStub<RuleTypes, RuleKeys>[] =>
        obj.children.some(p => p.key.value === 'block')
            ? []
            : [
                { 
                    key: RuleKeys.BlockNameIsRequired,
                    type: RuleTypes.Stub,
                    loc: obj.loc 
                }
            ];

    const validateProperty = (
        property: jsonToAst.AstProperty
    ): LinterStub<RuleTypes, RuleKeys>[] =>
        /^[A-Z]+$/.test(property.key.value)
            ? [
                  {
                      key: RuleKeys.UppercaseNamesIsForbidden,
                      type: RuleTypes.Stub,
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
            problem: LinterStub<RuleTypes, RuleKeys>
        ): Diagnostic[] => {
            const severity = GetSeverity(problem.type, problem.key);

            if (severity) {
                const message = GetMessage(problem.key);

                let diagnostic: Diagnostic = {
                    range: {
                            start: {
                                line: problem.loc.start.line - 1,
                                character: problem.loc.start.column - 1,
                            },
                            end: {
                                line: problem.loc.end.line - 1,
                                character: problem.loc.end.column - 1,
                            }
                        },
                    severity,
                    message,
                    source
                };

                list.push(diagnostic);
            }

            return list;
        },
        []
    );

    diagnostics.push(
        ...lint(json).reduce(
            (
                list: Diagnostic[],
                problem: LinterByBlock
            ): Diagnostic[] => {
                const type = getType(problem.code);
                const key = getKey(problem.code);
                if (type && key) {
                    const severity = GetSeverity(type, key);

                    const diagnostic: Diagnostic = {
                        range: {
                            start: {
                                line: problem.location.start.line - 1,
                                character: problem.location.start.column - 1,
                            },
                            end: {
                                line: problem.location.end.line - 1,
                                character: problem.location.end.column - 1,
                            }
                        },
                        severity,
                        message: problem.error,
                        source
                    };

                    list.push(diagnostic);
                }

                return list;
            },
            []
        )
    );

    conn.sendDiagnostics({ uri: textDocument.uri, diagnostics });
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
