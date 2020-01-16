// Расширяем конфиг для правил подключаемого линтера + добавляем в package.json правила

export enum RuleKeys {
    UppercaseNamesIsForbidden = 'uppercaseNamesIsForbidden',
    BlockNameIsRequired = 'blockNameIsRequired',
    InvalidButtonPosition = 'invalidButtonPosition',
    InvalidButtonSize = 'invalidButtonSize',
    TextSizesShouldBeEqual = 'textSizesShouldBeEqual',
    InvalidH2Position = 'invalidH2Position',
    InvalidH3Position = 'invalidH3Position',
    SeveralH1 = 'severalH1',
    InvalidPlaceholderSize = 'invalidPlaceholderSize',
    TooMuchMarketingBlocks = 'tooMuchMarketingBlocks',
}

export enum RuleTypes {
    Warning = 'warning',
    Text = 'text',
    Grid = 'grid',
}

export interface SeverityConfiguration {
    [RuleKeys.BlockNameIsRequired]: Severity;
    [RuleKeys.UppercaseNamesIsForbidden]: Severity;
    [RuleTypes.Warning]: Warning;
    [RuleTypes.Text]: Text;
    [RuleTypes.Grid]: Grid;
}

export interface Warning {
    [RuleKeys.InvalidButtonPosition]: Severity;
    [RuleKeys.InvalidButtonSize]: Severity;
    [RuleKeys.InvalidPlaceholderSize]: Severity;
    [RuleKeys.TextSizesShouldBeEqual]: Severity;
}

export interface Text {
    [RuleKeys.InvalidH2Position]: Severity;
    [RuleKeys.InvalidH3Position]: Severity;
    [RuleKeys.SeveralH1]: Severity;
}

export interface Grid {
    [RuleKeys.TooMuchMarketingBlocks]: Severity;
}

export enum Severity {
    Error = "Error", 
    Warning = "Warning", 
    Information = "Information", 
    Hint = "Hint", 
    None = "None"
}

export interface ExampleConfiguration {
    enable: boolean;
    severity: SeverityConfiguration;
}
