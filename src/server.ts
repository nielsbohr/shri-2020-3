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
import { makeLint, LinterProblem } from './linter';

let conn = createConnection(ProposedFeatures.all);
let docs: TextDocuments = new TextDocuments();
let conf: ExampleConfiguration | undefined | any = undefined;

conn.onInitialize((params: InitializeParams) => {
    return {
        capabilities: {
            textDocumentSync: 1 // нет такого параметра 'always'
        }
    };
});

// Добавлен параметр типа ошибки (Warning, Text, Grid)
function GetSeverity(code: string | RuleKeys): DiagnosticSeverity | undefined {
    if (!conf || !conf.severity) {
        return undefined;
    }
    let severity: Severity | undefined;
    if (typeof code === 'string') {
        const {type, key} = getKey(code);
        severity = conf.severity[type][key];
    } else {
        severity = conf.severity[code];
    }

    switch (severity) {
        case Severity.Error:
            // опечатка Information -> Error
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

// Функция хелпер для парсинга кода ошибки и сравнение с настройкой в плагине

function getKey(code: string): { type: RuleTypes, key: RuleKeys} {
    const [type, key] = code.split('.');
    return {
        type: type.toLowerCase() as RuleTypes,
        key: key.toLowerCase()
            .replace(/([_][a-z])/ig, (key) => {
            return key.toUpperCase()
                .replace('_', '');
        }) as RuleKeys
    };
}

// Лишняя логика, кажется, сообщения можно привязывать сразу к ошибке
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
    if (extname(source) !== '.json') { return; }
    // textDocument.uri просто возвращает ссылку на документ, а необходим контент документа
    const json = textDocument.getText();

    const validateObject = (
        obj: jsonToAst.AstObject
    ): LinterProblem[] =>
        obj.children.some(p => p.key.value === 'block')
            ? []
            : [
                { 
                    key: RuleKeys.BlockNameIsRequired,
                    location: obj.loc 
                }
            ];

    const validateProperty = (
        property: jsonToAst.AstProperty
    ): LinterProblem[] =>
        /^[A-Z]+$/.test(property.key.value)
            ? [
                  {
                      key: RuleKeys.UppercaseNamesIsForbidden,
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
            const severity = GetSeverity(problem.code || problem.key);

            if (severity) {
                const message = problem.error || GetMessage(problem.key);

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

    // Убираем if, т. к. если нет ошибок, то обновления не будет, а ошибки,
    // которых по факту нет - в документе останутся подсвеченными, даже после исправления
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
