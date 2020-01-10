export enum RuleKeys {
    UppercaseNamesIsForbidden = 'uppercaseNamesIsForbidden',
    BlockNameIsRequired = 'blockNameIsRequired',
    invalidButtonPosition = 'invalid-button-position',
    invalidButtonSize = 'invalid-button-size',
    invalidH2Position = 'invalid-h2-position',
    invalidH3Position = 'invalid-h3-position',
    severalH1 = 'severalH1',
    invalidPlaceholderSize = 'invalid-placeholder-size',
    textSizeShouldBeEqual = 'text-sizes-should-be-equal',
    tooMuchMarketingBlocks = 'too-much-marketing-blocks'
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
    [RuleKeys.invalidButtonPosition]: Severity;
    [RuleKeys.invalidButtonSize]: Severity;
    [RuleKeys.invalidH2Position]: Severity;
    [RuleKeys.invalidH3Position]: Severity;
    [RuleKeys.severalH1]: Severity;
    [RuleKeys.invalidPlaceholderSize]: Severity;
    [RuleKeys.textSizeShouldBeEqual]: Severity;
    [RuleKeys.tooMuchMarketingBlocks]: Severity;
}

export interface ExampleConfiguration {
 
    enable: boolean;
 
    severity: SeverityConfiguration;
}
