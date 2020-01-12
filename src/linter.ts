import * as jsonToAst from "json-to-ast";
import "./linter/linter";

export type JsonAST = jsonToAst.AstJsonEntity | undefined;

export interface LinterProblem<TKey> {
    key?: TKey;
    loc?: jsonToAst.AstLocation;
    code?: TKey;
    error?: string;
    location?: jsonToAst.AstLocation;
}

declare function lint<TKey>(json: string): LinterProblem<TKey>[];

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
    const ast: JsonAST = parseJson(json);

    if (ast) {
        walk(ast, 
            (property: jsonToAst.AstProperty) => errors.push(...validateProperty(property)), 
            (obj: jsonToAst.AstObject) => errors.push(...validateObject(obj)));
    }

    errors.push(...lint<TProblemKey>(json));

    return errors;
}
