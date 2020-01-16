import * as jsonToAst from "json-to-ast";
import "./js/linter";
import { RuleKeys } from "./configuration";

export type JsonAST = jsonToAst.AstJsonEntity | undefined;

export interface LinterProblem {
    key: RuleKeys;
    error?: string;
    code?: string;
    location: {
        start: {
            column: number;
            line: number;
        },
        end: {
            column: number;
            line: number;
        }
    };
}

// Объявляем глобально функцию линтера
declare function lint(json: string): LinterProblem[];

export function makeLint(
    json: string, 
    validateProperty: (property: jsonToAst.AstProperty) => LinterProblem[],
    validateObject: (obj: jsonToAst.AstObject) => LinterProblem[]
): LinterProblem[] {

    function walk(
        node: jsonToAst.AstJsonEntity, 
        cbProp: (property: jsonToAst.AstProperty) => void,
        cbObj: (obj: jsonToAst.AstObject) => void
    ) {
        switch (node.type) {
            case 'Array':
                node.children.forEach((item: jsonToAst.AstJsonEntity) => {
                    walk(item, cbProp, cbObj);
                });
                break;
            case 'Object':
                cbObj(node);
    
                node.children.forEach((property: jsonToAst.AstProperty) => {
                    cbProp(property);
                    walk(property.value, cbProp, cbObj);
                });
                break;
        }
    }

    function parseJson(json: string):JsonAST  {return jsonToAst(json); }

    const errors: LinterProblem[] = [];
    const ast: JsonAST = parseJson(json);

    if (ast) {
        walk(ast,
            // .concat не изменяет массив, а возвращает новый массив, состоящий из массива, на котором он был вызван
            // правильно здесь использовать push с деструктуризацей массива
            (property: jsonToAst.AstProperty) => errors.push(...validateProperty(property)), 
            (obj: jsonToAst.AstObject) => errors.push(...validateObject(obj)));
    }
    
    errors.push(...lint(json));

    return errors;
}

