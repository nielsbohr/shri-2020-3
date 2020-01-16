import * as jsonToAst from "json-to-ast";
import "./js/linter";

export type JsonAST = jsonToAst.AstJsonEntity | undefined;

// Расширил интерфейс ошибки, под два типа линтера
export interface LinterProblem<TKey> {
    key?: TKey;
    error?: string;
    code?: string;
    location?: {
        start: {
            column: number;
            line: number;
        },
        end: {
            column: number;
            line: number;
        }
    };
    loc?: jsonToAst.AstLocation;
}
// Объявляем глобально функцию линтера
declare function lint<T>(json: string): LinterProblem<T>[];

export function makeLint<TProblemKey>(
    json: string, 
    validateProperty: (property: jsonToAst.AstProperty) => LinterProblem<TProblemKey>[],
    validateObject: (obj: jsonToAst.AstObject) => LinterProblem<TProblemKey>[]
): LinterProblem<TProblemKey>[] {

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

    const errors: LinterProblem<TProblemKey>[] = [];
    
    // Если json невалиден, оставляем пустой массив
    try {
        const ast: JsonAST = parseJson(json);

        if (ast) {
            walk(ast,
                
                // .concat не изменяет массив, а возвращает новый массив, состоящий из массива, на котором он был вызван
                // правильно здесь использовать push с деструктуризацей массива
                (property: jsonToAst.AstProperty) => errors.push(...validateProperty(property)), 
                (obj: jsonToAst.AstObject) => errors.push(...validateObject(obj)));
        }
    
        // добавляем ошибки с подключенного линтера
        errors.push(...lint<TProblemKey>(json));
    } catch(e) {
        //
    }

    return errors;
}

