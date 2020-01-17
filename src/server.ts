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
function GetSeverity(code: RuleKeys | { type: RuleTypes, key: RuleKeys} | undefined): DiagnosticSeverity | undefined {
    if (!conf || !conf.severity || !code) {
        return undefined;
    }
    let severity: Severity | undefined;
    if (typeof code === 'string') {
        severity = conf.severity[code];
    } else {
        const {type, key} = code;
        severity = conf.severity[type][key];
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
function getKey(code: string | undefined): { type: RuleTypes, key: RuleKeys} | undefined {
    if (typeof code === 'string') {
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

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    const source = basename(textDocument.uri);
    if (extname(source) !== '.json') { return; }

    // textDocument.uri просто возвращает ссылку на документ, а необходим контент документа
    const json = textDocument.getText();

    const validateObject = (
        obj: jsonToAst.AstObject
    ): LinterProblem<RuleKeys>[] =>
        obj.children.some(p => p.key.value === 'block')
            ? []
            : [
                { 
                    key: RuleKeys.BlockNameIsRequired,
                    loc: obj.loc 
                }
            ];

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
            // Изменил мэппинг ошибок под два разных типа
            const code = problem.key || getKey(problem.code);
            const severity = GetSeverity(code);
            const message = problem.error || GetMessage(problem.key);
            const location = problem.loc ? problem.loc : problem.location;
            if (severity && location) {
                let diagnostic: Diagnostic = {
                    
                    // Изменил на вариант, который подходит под оба типа ошибки
                    range: {
                        start: {
                            line: location.start.line - 1,
                            character: location.start.column - 1,
                        },
                        end: {
                            line: location.end.line - 1,
                            character: location.end.column - 1,
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
