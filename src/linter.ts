import * as jsonToAst from "json-to-ast";
import "./js/linter";

export type JsonAST = jsonToAst.AstJsonEntity | undefined;

export interface LinterStub<TType, TKey> {
    key: TKey;
    type: TType;
    loc: jsonToAst.AstLocation;
}

export interface LinterByBlock {
    code: string;
    error: string;
    location: {
        start: {
            column: number;
            line: number;
        },
        end: {
            column: number;
            line: number;
        }
    }
}

export function makeLint<TProblemType, TProblemKey>(
    json: string, 
    validateProperty: (property: jsonToAst.AstProperty) => LinterStub<TProblemType, TProblemKey>[],
    validateObject: (obj: jsonToAst.AstObject) => LinterStub<TProblemType, TProblemKey>[]
): LinterStub<TProblemType, TProblemKey>[] {

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

    const errors: LinterStub<TProblemType, TProblemKey>[] = [];
    const ast: JsonAST = parseJson(json);

    if (ast) {
        walk(ast,
            (property: jsonToAst.AstProperty) => errors.push(...validateProperty(property)), 
            (obj: jsonToAst.AstObject) => errors.push(...validateObject(obj)));
    }

    return errors;
}