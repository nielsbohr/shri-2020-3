import { LinterProblem } from "../linter";
import { RuleKeys } from "../configuration";

declare global {
    namespace NodeJS {
        interface Global {
            lint: lint
        }
    }
}

export interface lint {
    (json: string): LinterProblem<RuleKeys>[]
}