export enum RuleKeys {
    UppercaseNamesIsForbidden = 'uppercaseNamesIsForbidden',
    BlockNameIsRequired = 'blockNameIsRequired',
    INVALID_BUTTON_POSITION = 'WARNING.INVALID_BUTTON_POSITION',
    INVALID_BUTTON_SIZE = 'WARNING.INVALID_BUTTON_SIZE',
    INVALID_H2_POSITION = 'TEXT.INVALID_H2_POSITION',
    INVALID_H3_POSITION = 'TEXT.INVALID_H3_POSITION',
    SEVERAL_H1 = 'TEXT.SEVERAL_H1',
    INVALID_PLACEHOLDER_SIZE = 'WARNING.INVALID_PLACEHOLDER_SIZE',
    TEXT_SIZE_SHOULD_BE_EQUAL = 'WARNING.TEXT_SIZE_SHOULD_BE_EQUAL',
    TOO_MUCH_MARKETING_BLOCKS = 'GRID.TOO_MUCH_MARKETING_BLOCKS'
}

export enum Severity {
    Error = "Error", 
    Warning = "Warning", 
    Information = "Information", 
    Hint = "Hint", 
    None = "None"
}

export interface SeverityConfiguration {
    [RuleKeys.BlockNameIsRequired]: Severity;
    [RuleKeys.UppercaseNamesIsForbidden]: Severity;
    Warning: Warning;
    Text: Text;
    Grid: Grid;
}

export interface Warning {
    [RuleKeys.INVALID_BUTTON_POSITION]: Severity;
    [RuleKeys.INVALID_BUTTON_SIZE]: Severity;
    [RuleKeys.INVALID_PLACEHOLDER_SIZE]: Severity;
    [RuleKeys.TEXT_SIZE_SHOULD_BE_EQUAL]: Severity;
}

export interface Text {
    [RuleKeys.INVALID_H2_POSITION]: Severity;
    [RuleKeys.INVALID_H3_POSITION]: Severity;
    [RuleKeys.SEVERAL_H1]: Severity;
}

export interface Grid {
    [RuleKeys.TOO_MUCH_MARKETING_BLOCKS]: Severity;
}

export interface ExampleConfiguration {
 
    enable: boolean;
 
    severity: SeverityConfiguration;

}
