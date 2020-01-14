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

import { ExampleConfiguration, Severity } from './configuration';
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

function GetSeverity(key: string): DiagnosticSeverity | undefined {
    if (!conf || !conf.severity || !key) {
        return undefined;
    }

    let severity: Severity | undefined = undefined;

    const [type, code] = key.split('.');
    if (code) {
        severity = conf.severity[type][code];
    } else {
        severity = conf.severity[type];
    }
    
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

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    const source = basename(textDocument.uri);
    if (extname(source) !== '.json') return;
    const json = textDocument.getText();

    const validateObject = (
        obj: jsonToAst.AstObject
    ): LinterProblem[] =>
        obj.children.some(p => p.key.value === 'block')
            ? []
            : [
                { 
                    code: 'blockNameIsRequired',
                    error:  'Field named \'block\' is required!',
                    location: obj.loc 
                }
            ];

    const validateProperty = (
        property: jsonToAst.AstProperty
    ): LinterProblem[] =>
        /^[A-Z]+$/.test(property.key.value)
            ? [
                  {
                      code: 'UppercaseNamesIsForbidden',
                      error: 'Uppercase properties are forbidden!',
                      location: property.key.loc
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
            problem: LinterProblem
        ): Diagnostic[] => {
            const severity = GetSeverity(problem.code);

            if (severity) {
                let diagnostic: Diagnostic = {
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
                    message: problem.error,
                    severity,
                    source
                };

                list.push(diagnostic);
            }

            return list;
        },
        []
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
